const fs = require('fs');
const https = require('https');
const path = require('path');

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving/';
const MAX_WAYPOINTS_PER_REQUEST = 50;
const DELAY_MS = 1100;

// Read shape_data.js and extract the shapeData object
const shapeFile = fs.readFileSync(path.join(__dirname, 'shape_data.js'), 'utf8');
eval(shapeFile);

const shapeIds = Object.keys(shapeData);
console.log(`Found ${shapeIds.length} shapes to route-match`);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, {headers: {'User-Agent': 'MWRTA-MapMatch/1.0'}}, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
                }
            });
            res.on('error', reject);
        }).on('error', reject);
    });
}

function chunkCoords(coords) {
    if (coords.length <= MAX_WAYPOINTS_PER_REQUEST) return [coords];
    const chunks = [];
    const overlap = 3;
    let i = 0;
    while (i < coords.length) {
        const end = Math.min(i + MAX_WAYPOINTS_PER_REQUEST, coords.length);
        chunks.push(coords.slice(i, end));
        if (end >= coords.length) break;
        i = end - overlap;
    }
    return chunks;
}

async function routeMatchShape(coords) {
    const chunks = chunkCoords(coords);
    let allPoints = [];

    for (let c = 0; c < chunks.length; c++) {
        const chunk = chunks[c];
        // OSRM expects lon,lat
        const coordStr = chunk.map(p => `${p[1]},${p[0]}`).join(';');
        const url = `${OSRM_BASE}${coordStr}?geometries=geojson&overview=full`;

        try {
            const result = await fetchUrl(url);
            if (result.code === 'Ok' && result.routes && result.routes.length > 0) {
                const geom = result.routes[0].geometry.coordinates;
                // geojson is [lon, lat], convert to [lat, lon]
                const points = geom.map(p => [p[1], p[0]]);
                if (allPoints.length > 0 && c > 0) {
                    // Skip first few points to avoid overlap duplication
                    const skipCount = Math.min(5, points.length);
                    allPoints = allPoints.concat(points.slice(skipCount));
                } else {
                    allPoints = allPoints.concat(points);
                }
            } else {
                console.log(`  Warning: OSRM returned ${result.code}, using original coords for this chunk`);
                if (allPoints.length === 0) {
                    allPoints = coords;
                }
            }
        } catch (err) {
            console.log(`  Error: ${err.message}, using original coords`);
            if (allPoints.length === 0) {
                allPoints = coords;
            }
        }

        if (chunks.length > 1) await sleep(DELAY_MS);
    }

    return allPoints.length > 0 ? allPoints : coords;
}

async function main() {
    const newShapeData = {};
    let completed = 0;

    for (const shapeId of shapeIds) {
        const coords = shapeData[shapeId];
        console.log(`[${completed + 1}/${shapeIds.length}] Routing shape ${shapeId} (${coords.length} points)...`);

        const matched = await routeMatchShape(coords);
        newShapeData[shapeId] = matched;
        completed++;

        console.log(`  -> ${matched.length} points after routing`);
        await sleep(DELAY_MS);
    }

    // Write output
    let output = 'var shapeData = {};\n';
    for (const shapeId of Object.keys(newShapeData)) {
        const points = newShapeData[shapeId].map(p =>
            `[${p[0]},${p[1]}]`
        ).join(',');
        output += `shapeData["${shapeId}"] = [\n${points}];\n`;
    }

    const outPath = path.join(__dirname, 'shape_data_matched.js');
    fs.writeFileSync(outPath, output);
    console.log(`\nDone! Wrote matched shapes to: ${outPath}`);
    console.log('To use: rename shape_data_matched.js to shape_data.js and regenerate the HTML');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
