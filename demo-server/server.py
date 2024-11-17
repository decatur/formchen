# Run with 
#     python demo-server/server.py

import http.server
import socketserver
import json
from urllib.parse import urlparse

data = {
    "_id": '4711',
    "plant": 'Rubus idaeus',
    "reference": 'https://en.wikipedia.org/wiki/Rubus_idaeus',
    "observer": 'Frida Krum',
    "start": '2019-01-01T00:00Z',
    "latitude": 41.40338,
    "longitude": 2.17403,
    "measurements": [
        ["2019-01-01T00:00Z", 0, 0],
        ["2019-02-01T00:00Z", 1, 2.3],
        ["2019-03-01T00:00Z", 2, 4]
    ],
    "isCompleted": True
}

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def _send_content(self, data, status=200, content_type="text/plain"):
        if isinstance(data, str):
            data = data.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)
        self.wfile.flush()

    def do_GET(self):
        print('#####################################' + self.path)
        path = str(self.path[1:])
        
        if path.endswith(".html"):
            content_type = "text/html"
        elif path.endswith(".js"):
            content_type = "text/javascript"
        elif path.endswith(".css"):
            content_type = "text/css"
        elif path.endswith("json"):
            content_type = "application/json"
        else:
            self._send_content(f"404: {path}", status=400)
            return

        if content_type == "application/json":
            self._send_content(json.dumps(data), content_type=content_type)
        else:
            with open(path, mode='r') as f:
                self._send_content(f.read(), content_type=content_type)

    def do_PATCH(self):
        global data
        length = int(self.headers['Content-Length'])
        request = self.rfile.read(length)
        request = json.loads(str(request, encoding='utf-8'))
        print(request)
        if request['_id'] == data['_id']:
            data['_id'] = str(int(data['_id']) + 1)
            response = [{"op": "replace", "path": "/_id", "value": data['_id']}];
        else:
            response = "Opimistic lock failed"
        self._send_content(json.dumps(response), content_type="application/json")


def run(port):
    with socketserver.TCPServer(("", port), MyHandler) as httpd:
        print("serving at port", port)
        httpd.serve_forever()

o = urlparse('http://127.0.0.1:8081')
# webbrowser.open_new(o.geturl())
run(port=o.port)
