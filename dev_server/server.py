import pathlib
import importlib.util

from starlette.exceptions import HTTPException
from starlette.responses import HTMLResponse, Response

import make
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles


class JavascriptResponse(Response):
    media_type = "text/javascript"


app = FastAPI()


@app.get(r"/{file_path:path}\.js", response_class=JavascriptResponse)
def read_js(file_path: str):
    source = pathlib.Path(file_path + '.js')
    if source.parts[0] == 'gridchen':
        origin = pathlib.Path(importlib.util.find_spec('gridchen').origin)
        return (origin.parent.parent / source).read_text(encoding='utf8')
    return make.read_file(source, [('gridchen/', '/gridchen/')])


@app.get(r"/{file_path:path}\.html", response_class=HTMLResponse)
def read_root(file_path: str):
    source = pathlib.Path(file_path + '.html')
    if not source.is_file():
        raise HTTPException(status_code=404, detail="Item not found")
    return make.read_file(source, [('gridchen/', '/gridchen/')])


app.mount("/", StaticFiles(directory="."), name="static")
