const fs = require('fs');
const https = require('https');
const path = require('path');

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving/';
const DELAY_MS = 1100;

// Load data
eval(fs.readFileSync(path.join(__dirname, 'stop_lookup.js'), 'utf8'));
eval(fs.readFileSync(path.join(__dirname, 'route_stops_ordered.js'), 'utf8'));

// Also load best_shapes to know which route+dir combos we need
eval(fs.readFileSync(path.join(__dirname, 'best_shapes.js'), 'utf8'));
// Load route_data for route shape dir mapping
const dirShapeFile = fs.readFileSync(path.join(__dirname, 'best_shapes_dir.tmp'), 'utf8');
const routeShapesDir = {};
dirShapeFile.trim().split('\n').forEach(line => {
    const [key, shapeId] = line.split('\t');
    if (key && shapeId) routeShapesDir[key] = shapeId;
});

console.log('Route+dir combos in routeStopsOrdered:', Object.keys(routeStopsOrdered).length);

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

async function routeFromStops(stopIds) {
    // Get coordinates for each stop
    const coords = [];
    for (const stopId of stopIds) {
        const stop = stopLookup[stopId];
        if (stop) {
            coords.push([stop.lat, stop.lon]);
        }
    }

    if (coords.length < 2) return coords;

    // OSRM expects lon,lat
    const coordStr = coords.map(p => `${p[1]},${p[0]}`).join(';');
    const url = `${OSRM_BASE}${coordStr}?geometries=geojson&overview=full`;

    try {
        const result = await fetchUrl(url);
        if (result.code === 'Ok' && result.routes && result.routes.length > 0) {
            const geom = result.routes[0].geometry.coordinates;
            return geom.map(p => [p[1], p[0]]);
        } else {
            console.log(`  Warning: OSRM returned ${result.code}, using stop coords`);
            return coords;
        }
    } catch (err) {
        console.log(`  Error: ${err.message}, using stop coords`);
        return coords;
    }
}

async function main() {
    // We need to produce shape data keyed by shape_id
    // Map: shape_id -> route+dir key -> stop list
    const shapeToStops = {};

    for (const key of Object.keys(routeStopsOrdered)) {
        const shapeId = routeShapesDir[key];
        if (shapeId) {
            shapeToStops[shapeId] = {key, stopIds: routeStopsOrdered[key]};
        }
    }

    // Also handle fallback shapes (bestShapes entries not covered by dir shapes)
    eval(fs.readFileSync(path.join(__dirname, 'route_data.js'), 'utf8'));
    for (const routeId of Object.keys(routeInfo)) {
        const fallback = bestShapes[routeId];
        if (fallback && !shapeToStops[fallback]) {
            // Use direction 0 stops or the general route stops
            const stopIds = routeStopsOrdered[routeId + '_0'] || [];
            if (stopIds.length > 0) {
                shapeToStops[fallback] = {key: routeId + '_fallback', stopIds};
            }
        }
    }

    // Also include any shapes from shape_data_original that we haven't covered
    eval(fs.readFileSync(path.join(__dirname, 'shape_data_original.js'), 'utf8').replace(/shapeData/g, 'shapeOrig'));
    const allOrigShapes = Object.keys(shapeOrig);
    const coveredShapes = new Set(Object.keys(shapeToStops));

    console.log(`Shapes with stop data: ${coveredShapes.size}`);
    console.log(`Total original shapes: ${allOrigShapes.length}`);
    console.log(`Shapes without stop mapping: ${allOrigShapes.length - coveredShapes.size}`);

    const newShapeData = {};
    let completed = 0;
    const total = Object.keys(shapeToStops).length;

    for (const [shapeId, {key, stopIds}] of Object.entries(shapeToStops)) {
        completed++;
        console.log(`[${completed}/${total}] Routing ${key} (${stopIds.length} stops) -> shape ${shapeId.substring(0,8)}...`);

        const routed = await routeFromStops(stopIds);
        newShapeData[shapeId] = routed;
        console.log(`  -> ${routed.length} points`);

        await sleep(DELAY_MS);
    }

    // For shapes we couldn't map to stops, keep original
    for (const shapeId of allOrigShapes) {
        if (!newShapeData[shapeId]) {
            newShapeData[shapeId] = shapeOrig[shapeId];
            console.log(`Keeping original for unmapped shape: ${shapeId.substring(0,8)}...`);
        }
    }

    // Write output
    let output = 'var shapeData = {};\n';
    for (const shapeId of Object.keys(newShapeData)) {
        const points = newShapeData[shapeId].map(p =>
            `[${p[0]},${p[1]}]`
        ).join(',');
        output += `shapeData["${shapeId}"] = [\n${points}];\n`;
    }

    const outPath = path.join(__dirname, 'shape_data_stops.js');
    fs.writeFileSync(outPath, output);
    console.log(`\nDone! Wrote stop-routed shapes to: ${outPath}`);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
