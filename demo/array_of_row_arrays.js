/** @import { JSONSchema } from "../formchen/types" */

import { createFormChen } from "../formchen/formchen.js";
import { bindDemoTabs } from "./utils.js";

/** @type {JSONSchema} */
const schema = {
    type: 'object',
    title: 'Array of Row Tuples',
    properties: {
        rows: {
            title: 'Rows',
            type: 'array',
            format: 'grid',
            items: {
                type: 'array',
                items: [  // tuple schema
                    { title: 'TimeStamp', width: 200, type: 'string', format: 'date' },
                    { title: 'Age', width: 100, type: 'number' },
                    { title: 'Weight', width: 100, type: 'number' }
                ]
            }
        }
    }
};

const data = {
    rows: [
        ["2019-01-01", 0, 0],
        ["2019-01-02", 1, 2],
        ["2019-01-03", 2, 4]
    ]
};

bindDemoTabs(document.getElementById(schema.title), schema, value, patch);
const formchen = createFormChen(document.getElementById(schema.title), schema, data);

function value() {
    return formchen.value
}

function patch() {
    return formchen.patch
}

