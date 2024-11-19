# Run with 
#     python -m demo_server 8081

import sys
from demo_server.server import run

run(port=int(sys.argv[1]))
