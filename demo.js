import {createFormChen} from "./formchen/webcomponent.js"
import * as utils from "./gridchen/utils.js";

const patchElement = document.querySelector('.patch');

export function init(schema, data) {
    const rootElement = document.getElementById('/myPrefix');

    let fc;
    const tm = utils.createTransactionManager();
    utils.registerUndo(document.body, tm);
    fc = createFormChen(document.getElementById("ROOT"), schema, data, tm);
    
    tm.addEventListener('change', function () {
        patchElement.value = JSON.stringify(tm.patch, null, 2);
    });
}