/** @import { JSONSchema, GridChenElement } from "../formchen/types" */

import { bindTabs } from "../test/utils.js";

/** @type {JSONSchema} */
const schema = {
    title: 'Array of Row Tuples',
    type: 'array',
    items: {
        type: 'array',
        items: [  // tuple schema
            { title: 'TimeStamp', width: 200, type: 'string', format: 'full-date' },
            { title: 'Age', width: 100, type: 'number' },
            { title: 'Weight', width: 100, type: 'number' }
        ]
    }
};

const data = [
    ["2019-01-01", 0, 0],
    ["2019-01-02", 1, 2],
    ["2019-01-03", 2, 4]
];

const gridElement = /** @type{GridChenElement} */ (document.getElementById(schema.title));
bindTabs(gridElement, schema, value, patch);
gridElement.bind(schema, data);

function value() {
    return gridElement.value
}

function patch() {
    return gridElement.patch
}

