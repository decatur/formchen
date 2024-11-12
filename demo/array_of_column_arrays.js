/** @import { JSONSchema } from "../formchen/types" */

import { createFormChen } from "../formchen/formchen.js";
import { bindDemoTabs } from "./utils.js";

/** @type{JSONSchema} */
const schema = {
    type: 'object',
    title: 'Array of Column Arrays',
    properties: {
        columns: {
            type: 'array',
            format: 'grid',
            items: [ // tuple schema
                { type: 'array', items: { title: 'TimeStamp', width: 200, type: 'string', format: 'date' } },
                { type: 'array', items: { title: 'Age', width: 100, type: 'number' } },
                { type: 'array', items: { title: 'Weight', width: 100, type: 'number' } }
            ]
        }
    }
};
const data = {
    columns: [
        ["2019-01-01", "2019-01-02", "2019-01-03"],
        [0, 1, 2],
        [0, 2, 4]
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



