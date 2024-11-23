# Run with 
#     python -m py_server 8081

import sys
from py_server.server import run

run(int(sys.argv[1]), sys.argv[2])
