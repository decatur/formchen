import http.server
import socketserver
import json

served_root_folder = ''

entity = {
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
        path = str(served_root_folder + self.path)
        
        if path.endswith(".html"):
            content_type = "text/html"
        elif path.endswith(".js"):
            content_type = "text/javascript"
        elif path.endswith(".css"):
            content_type = "text/css"
        elif path.endswith(".json"):
            content_type = "application/json"
        elif path == 'favicon.ico':
            with open(path, mode='rb') as f:
                self._send_content(f.read(), content_type="image/x-icon")
            return
        else:
            self._send_content(f"404: {path}", status=400)
            return

        if content_type == "application/json":
            self._send_content(json.dumps(entity), content_type=content_type)
        else:
            with open(path, mode='r') as f:
                self._send_content(f.read(), content_type=content_type)

    def do_PATCH(self):
        global entity
        length = int(self.headers['Content-Length'])
        request = self.rfile.read(length)
        request = json.loads(str(request, encoding='utf-8'))

        if request['_id'] == entity['_id']:
            entity['_id'] = str(int(entity['_id']) + 1)
            response = {"patch": [{"op": "replace", "path": "/_id", "value": entity['_id']}]};
            status = 200
        else:
            # Opimistic lock failed
            response = {"patch": [{"op": "replace", "path": "", "value": entity}]};
            status = 409

        self._send_content(json.dumps(response), status, content_type="application/json")


def run(port, root):
    global served_root_folder
    served_root_folder = root
    with socketserver.TCPServer(("", port), MyHandler, bind_and_activate=False) as httpd:
        # httpd.allow_reuse_address = True
        httpd.server_bind()
        httpd.server_activate()
        print("serving at port", port)
        httpd.serve_forever()

