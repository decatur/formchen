/** @import { JSONSchema, GridChenElement } from "../formchen/types" */

import { bindTabs } from "../test/utils.js";

/** @type {JSONSchema} */
const schema = {
    title: 'Array of Row Objects',
    type: 'array',
    items: {
        type: 'object',
        properties: {
            timestamp: { title: 'TimeStamp', width: 200, type: 'string', format: 'full-date' },
            age: { title: 'Age', width: 100, type: 'number' },
            weight: { title: 'Weight', width: 100, type: 'number' }
        }
    }
};
const data = [
    { timestamp: "2019-01-01", age: 0, weight: 0 },
    { timestamp: "2019-01-02", age: 1, weight: 2 },
    { timestamp: "2019-01-03", age: 2, weight: 4 }
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


