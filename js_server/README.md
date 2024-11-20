The file `server.js` is also valid TypeScript. After renaming to `server.ts`, you can transpile it with
```
npm install -g @types/node
root=$(npm root -g)
tsc --types node server.ts --typeRoots $root/@types
```