const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const MWRTA_API = 'http://vc.mwrta.com/api/FR/0';

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

    let filePath = req.url === '/' ? '/mwrta-map.html' : req.url;
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
