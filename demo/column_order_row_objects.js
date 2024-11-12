/** @import { JSONSchema } from "../formchen/types" */

import { createFormChen } from "../formchen/formchen.js";
import { bindDemoTabs } from "./utils.js";

/** @type {JSONSchema} */
const schema = {
    type: 'object',
    title: 'Column Order',
    properties: {
        rows: {
            title: 'Rows',
            type: 'array',
            format: 'grid',
            items: {
                type: 'object',
                properties: {
                    a: { title: 'a', type: 'number', columnIndex: 0, width: 100 },
                    1: { title: '1', type: 'number', columnIndex: 1, width: 100 }
                }
            }
        }
    }
};

const data = { rows: [{ a: 1, 1: 3 }, { a: 2, 1: 4 }] };

bindDemoTabs(document.getElementById(schema.title), schema, value, patch);
const formchen = createFormChen(document.getElementById(schema.title), schema, data);

function value() {
    return formchen.value
}

function patch() {
    return formchen.patch
}
