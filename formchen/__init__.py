from pathlib import Path
from flask import Blueprint, send_from_directory


app = Blueprint('formchen', __name__)  #, static_folder='.', static_url_path='/formchen')
ROOT_PATH: Path = Path(__file__).parent


@app.route('<path:resource>', methods=['GET'])
def serve_static(resource):
    return send_from_directory(ROOT_PATH, resource)
