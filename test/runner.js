import {execute, log} from './utils.js'

export function create(moduleName, module, test) {
    document.title = moduleName;
    document.getElementById('moduleName').textContent = moduleName;

    module
        .then(function () {
            return execute(test)
        })
        .then(() => {})
        .catch(function (reason) {
            console.error(reason);
            log(reason);
        })
        .then(function () {
            if (window.opener) {
                window.opener.moduleDone(moduleName);
            }
        });
}
