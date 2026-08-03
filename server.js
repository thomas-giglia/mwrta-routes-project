const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

try { require('dotenv').config(); } catch(e) {}

const PORT = 3000;
const MWRTA_API = 'http://vc.mwrta.com/api/FR/0';
const MBTA_API_KEY = process.env.MBTA_API_KEY || '';

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.txt': 'text/plain',
};

const server = http.createServer((req, res) => {
    if (req.url === '/api/vehicles') {
        http.get(MWRTA_API, (apiRes) => {
            let data = '';
            apiRes.on('data', chunk => data += chunk);
            apiRes.on('end', () => {
                res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(data);
            });
        }).on('error', (err) => {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to fetch from MWRTA API' }));
        });
        return;
    }

    if (req.url.startsWith('/api/mbta-vehicles')) {
        const urlObj = new URL(req.url, `http://localhost:${PORT}`);
        const swLat = urlObj.searchParams.get('swLat');
        const swLng = urlObj.searchParams.get('swLng');
        const neLat = urlObj.searchParams.get('neLat');
        const neLng = urlObj.searchParams.get('neLng');

        if (!swLat || !swLng || !neLat || !neLng) {
            res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Bounding box parameters required' }));
            return;
        }

        const mbtaUrl = `https://api-v3.mbta.com/vehicles?filter[route_type]=3&include=route&page[limit]=1000&api_key=${MBTA_API_KEY}`;
        https.get(mbtaUrl, (apiRes) => {
            let data = '';
            apiRes.on('data', chunk => data += chunk);
            apiRes.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const routeMap = {};
                    if (json.included) {
                        json.included.forEach(item => {
                            if (item.type === 'route') {
                                routeMap[item.id] = {
                                    short_name: item.attributes.short_name || item.id,
                                    long_name: item.attributes.long_name || '',
                                    color: item.attributes.color ? '#' + item.attributes.color : '#1a73e8'
                                };
                            }
                        });
                    }
                    const sw = { lat: parseFloat(swLat), lng: parseFloat(swLng) };
                    const ne = { lat: parseFloat(neLat), lng: parseFloat(neLng) };
                    const vehicles = [];
                    if (json.data) {
                        for (const v of json.data) {
                            const attrs = v.attributes;
                            if (!attrs.latitude || !attrs.longitude) continue;
                            if (attrs.latitude < sw.lat || attrs.latitude > ne.lat) continue;
                            if (attrs.longitude < sw.lng || attrs.longitude > ne.lng) continue;
                            const routeId = v.relationships && v.relationships.route && v.relationships.route.data
                                ? v.relationships.route.data.id : null;
                            const routeData = routeId ? routeMap[routeId] : null;
                            vehicles.push({
                                id: v.id,
                                label: attrs.label || v.id,
                                latitude: attrs.latitude,
                                longitude: attrs.longitude,
                                bearing: attrs.bearing,
                                speed: attrs.speed,
                                status: attrs.current_status,
                                route_id: routeId,
                                route_name: routeData ? routeData.short_name : (routeId || 'Unknown'),
                                route_long_name: routeData ? routeData.long_name : '',
                                route_color: routeData ? routeData.color : '#1a73e8'
                            });
                            // no cap for testing
                        }
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ vehicles: vehicles, count: vehicles.length }));
                } catch (e) {
                    res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
                    res.end(JSON.stringify({ error: 'Failed to parse MBTA response' }));
                }
            });
        }).on('error', (err) => {
            res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify({ error: 'Failed to fetch from MBTA API' }));
        });
        return;
    }

    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
});

server.listen(PORT, () => {
    console.log(`MWRTA Map server running at http://localhost:${PORT}`);
    console.log(`Live vehicle proxy at http://localhost:${PORT}/api/vehicles`);
});
