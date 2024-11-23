// Usage as JavaScript:
//   node js_server/server.js 8081 $(pwd)
//

/** @import { JSONPatchOperation } from "../../formchen/utils.js" */

import { createServer } from 'http';
import { readFile } from 'fs';
import { extname } from 'path';


/**
 * Applies a JSON Patch operation.
 * @param {{'':object}} holder
 * @param {JSONPatchOperation} operation
 */
function applyJSONPatchOperation(holder, operation) {
  const op = operation.op;
  const path = operation.path.split('/');

  while (path.length > 1) {
    holder = holder[path.shift()];
  }
  const index = path[0];

  if (op === 'replace') {
    holder[index] = operation.value;
  } else if (op === 'add') {
    if (Array.isArray(holder)) {
      (/**@type{object[]}*/(holder)).splice(parseInt(index), 0, operation.value);
    } else {
      holder[index] = operation.value;
    }
  } else if (op === 'remove') {
    if (Array.isArray(holder)) {
      (/**@type{object[]}*/(holder)).splice(parseInt(index), 1);
    } else {
      delete holder[index];
    }
  }
}

const hostname = '127.0.0.1';
const args = process.argv;
const port = args[2];
const servedRootFolder = args[3];

// See https://www.30secondsofcode.org/js/s/nodejs-static-file-server/
const types = {
  html: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  ico: 'image/x-icon',
  json: 'application/json'
};

const entity = {
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
  "isCompleted": true
}

function handlePatch(res, payload) {
  let response;
  if (payload._id == entity._id) {
    for (const operation of payload.patch) {
      applyJSONPatchOperation({ '': entity }, operation);
    }
    entity._id = String(Number(entity._id) + 1)
    response = { "patch": [{ "op": "replace", "path": "/_id", "value": entity._id }] };
    res.statusCode = 200
  } else {
    // Opimistic lock failed
    response = { "patch": [{ "op": "replace", "path": "", "value": entity }] };
    res.statusCode = 409
  }

  res.setHeader('Content-Type', types.json);
  res.end(JSON.stringify(response));

}

const server = createServer((req, res) => {
  if (req.method == 'GET' && req.url == '/plant.json') {
    res.setHeader('Content-Type', types.json);
    res.end(JSON.stringify(entity));
  } else if (req.method == 'GET') {
    const extension = extname(req.url).slice(1);
    const cType = extension ? (types[extension] ?? types.html) : types.html;
    readFile(servedRootFolder + req.url, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': cType });
        res.end('404: File not found');
      } else {
        res.writeHead(200, { 'Content-Type': cType });
        res.end(data);
      }
    });
  } else if (req.method == 'PATCH') {
    let body = [];
    req.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      const payload = JSON.parse(Buffer.concat(body).toString());
      console.log(payload);

      handlePatch(res, payload)
    });
  }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
