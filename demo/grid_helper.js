/** @import { JSONSchema } from "../formchen/gridchen/gridchen" */

import { GridChen } from "../formchen/gridchen/webcomponent.js"
import { createView } from "../formchen/gridchen/matrixview.js"
import { createTransactionManager, registerUndo } from "../formchen/gridchen/utils.js";

/**
 * @param {JSONSchema} schema
 * @param {any} data
 */
export function create_grid(schema, data) {
    const container = document.getElementById(schema.title);
    container.querySelector('code').innerText = JSON.stringify(data, null, 4);
    const view = createView(schema, data);
    const gridElement = /** @type{GridChen} */ (container.querySelector('grid-chen'));
    const tm = createTransactionManager();
    registerUndo(document.body, tm);
    tm.addEventListener('change', function (evt) {
        console.log(view.getModel());
        console.log(evt.transaction.operations);
    });

    gridElement.resetFromView(view, tm);
}