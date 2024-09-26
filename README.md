Generate HTML forms and two-way-binding of hierarchical and tabular/grid data with the help of [JSON Schema](https://json-schema.org).

Formchen (little form) supports undo/redo transaction management.

Edits on the original object are emitted as standard [JSON Patch](https://tools.ietf.org/html/rfc6902),
which can be directly passed to the back end.

Formchen is written in plain EcmaScript 2017 modules and can be directly imported as such with any modern browser.


# Usage

See https://decatur.github.io/formchen/index.html

# Testing

Both pages https://decatur.github.io/formchen/index.html and https://decatur.github.io/formchen/test/testrunner.html should load without errors or warnings in the javascript console.

Check both pages with
1. different browsers
2. different locales/languages

Check https://decatur.github.io/formchen/index.html with both light and dark mode.


# Development

* Use TypeScript 5.5 `@import`, see 
https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html#the-jsdoc-import-tag

* https://docs.joshuatz.com/cheatsheets/js/jsdoc
* https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules




