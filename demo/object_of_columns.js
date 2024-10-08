/** @import { GridChenElement } from "../formchen/types" */

import { bindTabs } from "../test/utils.js";

const schema = {
    title: 'Object of Columns',
    type: 'object',
    properties: {
        timestamp: {
            type: 'array',
            items: { title: 'TimeStamp', type: 'string', format: 'full-date', width: 200 }
        },
        age: {
            type: 'array', items: { title: 'Age', width: 100, type: 'number' }
        },
        weight: {
            type: 'array', items: { title: 'Weight', width: 100, type: 'number' }
        }
    }
};

const data = {
    timestamp: ["2019-01-01", "2019-01-02", "2019-01-03"],
    age: [0, 2, 4],
    weight: [0, 1, 2]
};

const gridElement = /** @type{GridChenElement} */ (document.getElementById(schema.title));
bindTabs(gridElement, schema, value, patch);
gridElement.bind(schema, data);

function value() {
    return gridElement.value
}

function patch() {
    return gridElement.patch
}
