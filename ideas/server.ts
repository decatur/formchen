// Usage:
// npm install -g @types/node
// root=$(npm root -g)
// tsc --types node server.ts --typeRoots $root/@types
// node server.js
//
// let res = await fetch('http://127.0.0.1:3000/', {method: 'POST', body: JSON.stringify({foo:'foobar'})});
// await res.text()

import { createServer } from 'http';
import { readFile } from 'fs';
import { extname } from 'path';

const hostname = '127.0.0.1';
const port = 3000;

// See https://www.30secondsofcode.org/js/s/nodejs-static-file-server/
const types = {
  html: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  json: 'application/json',
  xml: 'application/xml',
};

const entity = { _id: 1 };

const server = createServer((req, res) => {
  if (req.method == 'GET') {
      // console.log(req);
      const extension = extname(req.url).slice(1);
      console.log(extension)
      const cType = extension ? (types[extension]??types.html) : types.html;
  
      readFile(__dirname + req.url, (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': cType });
          res.end('404: File not found');
        } else {
          res.writeHead(200, { 'Content-Type': cType });
          res.end(data);
        }
      });
   } else if (req.method == 'POST') {
        let body = [];
        req.on('data', (chunk) => {
          body.push(chunk);
        }).on('end', () => {
          const payload = Buffer.concat(body).toString();
          const data = JSON.parse(payload);
          console.log(data);
          
          entity._id += 1;

          res.statusCode = 200;
          res.setHeader('Content-Type', 'text/plain');
          res.end(JSON.stringify(entity));
        });
  }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
