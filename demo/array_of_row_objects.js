/** @import { JSONSchema } from "../formchen/types" */

import { createFormChen } from "../formchen/formchen.js";
import { bindDemoTabs } from "./utils.js";

/** @type {JSONSchema} */
const schema = {
    type: 'object',
    title: 'Array of Row Objects',
    properties: {
        rows: {
            title: 'Rows',
            type: 'array',
            format: 'grid',
            items: {
                type: 'object',
                properties: {
                    timestamp: { title: 'TimeStamp', width: 200, type: 'string', format: 'date' },
                    age: { title: 'Age', width: 100, type: 'number' },
                    weight: { title: 'Weight', width: 100, type: 'number' }
                }
            }
        }
    }
};
const data = {
    rows: [
        { timestamp: "2019-01-01", age: 0, weight: 0 },
        { timestamp: "2019-01-02", age: 1, weight: 2 },
        { timestamp: "2019-01-03", age: 2, weight: 4 }
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


