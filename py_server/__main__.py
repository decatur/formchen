# Run with 
#     python -m py_server 8081

import sys
from py_server.server import run

run(port=int(sys.argv[1]), served_root_folder=sys.argv[2])
