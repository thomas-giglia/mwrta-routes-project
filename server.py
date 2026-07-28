import http.server
import urllib.request
import json
import os
import mimetypes

PORT = 3000
MWRTA_API = 'http://vc.mwrta.com/api/FR/0'
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/vehicles':
            try:
                req = urllib.request.Request(MWRTA_API)
                with urllib.request.urlopen(req, timeout=10) as resp:
                    data = resp.read()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(data)
            except Exception as e:
                self.send_response(502)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode())
            return

        file_path = '/mwrta-map.html' if self.path == '/' else self.path
        file_path = os.path.join(ROOT_DIR, file_path.lstrip('/'))

        if not os.path.isfile(file_path):
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Not found')
            return

        mime_type = mimetypes.guess_type(file_path)[0] or 'application/octet-stream'
        with open(file_path, 'rb') as f:
            content = f.read()
        self.send_response(200)
        self.send_header('Content-Type', mime_type)
        self.end_headers()
        self.wfile.write(content)

    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {args[0]}")


if __name__ == '__main__':
    server = http.server.HTTPServer(('', PORT), Handler)
    print(f'MWRTA Map server running at http://localhost:{PORT}')
    print(f'Live vehicle proxy at http://localhost:{PORT}/api/vehicles')
    server.serve_forever()
