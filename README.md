Generate HTML forms and two-way-binding of hierarchical and tabular/grid data with the help of [JSON Schema](https://json-schema.org).

# Demo

See https://decatur.github.io/formchen/index.html

# Features 

Formchen (little form) supports undo/redo transaction management.

Edits on the original object are emitted as standard [JSON Patch](https://tools.ietf.org/html/rfc6902),
which can be directly passed to the back end.

Formchen is written in plain EcmaScript 2022 modules and can be directly imported as such with any modern browser.

# Testing

All three [demo page](https://decatur.github.io/formchen/index.html), [test page](https://decatur.github.io/formchen/test/testrunner.html) and
[integration page](https://decatur.github.io/formchen/demo/locking.html) should load without errors or warnings in the javascript console.

Check all three with
1. different browsers
2. different locales/languages

Check [demo page](https://decatur.github.io/formchen/index.html) with both light and dark mode.

# Local Deployment

```
export PYTHONPATH=demo; python -m py_server 8081 $(pwd)
# or
node demo/js_server/server.js 8081 $(pwd)
```

```
http://127.0.0.1:8081/index.html?loglevel=info&console=true
http://127.0.0.1:8081/demo/locking.html
http://127.0.0.1:8081/test/testrunner.html
```

# Development

https://json8.github.io/patch/demos/apply/

## Check JavaScript Files

```
tsc --checkJs --allowJs formchen/formchen.js --noEmit --lib dom,es2022 --target es2022 --noUnusedLocals --noImplicitReturns --noImplicitThis --noUnusedParameters
```

### Setup tsc

This is what worked for me on WSL end of 2024
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
bash
nvm install 22
node -v
npm -v
npm install -g typescript
```

```
http://127.0.0.1:3000/index.html?loglevel=info&console=true
```

* Use TypeScript 5.5 `@import`, see 
https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html#the-jsdoc-import-tag



# Deployment

To provide FormChen through `cdn.jsdelivr.net`, tag and push the release:

```
git tag 1.0.1 main
git push origin 1.0.1
curl --head https://cdn.jsdelivr.net/gh/decatur/formchen@1.0.1/formchen/formchen.js
```

# References

* [Learn Forms](https://web.dev/learn/forms)
* https://docs.joshuatz.com/cheatsheets/js/jsdoc
* https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules






