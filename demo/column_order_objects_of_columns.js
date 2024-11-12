/** @import { JSONSchema } from "../formchen/types" */

import { createFormChen } from "../formchen/formchen.js";
import { bindDemoTabs } from "./utils.js";

/** @type {JSONSchema} */
const schema = {
    type: 'object',
    title: 'Order_objects_of_columns',
    properties: {
        columns: {
            title: 'Columns',
            type: 'object',
            format: 'grid',
            properties: {
                a: { type: 'array', title: 'a', columnIndex: 0, width: 100, items: { type: 'number' } },
                1: { type: 'array', title: '1', columnIndex: 1, width: 100, items: { type: 'number' } }
            }
        }
    }
};

const data = { columns: { a: [1, 2], 1: [3, 4] } };

bindDemoTabs(document.getElementById(schema.title), schema, value, patch);
const formchen = createFormChen(document.getElementById(schema.title), schema, data);

function value() {
    return formchen.value
}

function patch() {
    return formchen.patch
}