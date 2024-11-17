import webbrowser
from urllib.parse import urlparse
from demo_server.server import run

o = urlparse('http://127.0.0.1:8081')
# webbrowser.open_new(o.geturl())
run(port=o.port)
