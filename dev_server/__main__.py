import logging
import uvicorn

# Same as command line (see https://www.uvicorn.org/#command-line-options)
# uvicorn dashboard.main:app --host 127.0.0.1 --port 8089 --log-level debug
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

if __name__ == '__main__':
    uvicorn.run("dev_server.server:app", host="0.0.0.0", port=8000, access_log=True, log_level="trace", workers=1, debug=False)