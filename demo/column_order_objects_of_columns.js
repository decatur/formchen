/** @import { GridChenElement } from "../formchen/types" */

import { bindTabs } from "./utils.js";

const schema = {
    title: 'Order_objects_of_columns',
    type: 'object',
    properties: {
        a: { type: 'array', title: 'a', columnIndex: 0, width: 100, items: { type: 'number' } },
        1: { type: 'array', title: '1', columnIndex: 1, width: 100, items: { type: 'number' } }
    }
};


const data = { a: [1, 2], 1: [3, 4] };

const gridElement = /** @type{GridChenElement} */ (document.getElementById(schema.title));
bindTabs(gridElement, schema, value, patch);
gridElement.bind(schema, data);

function value() {
    return gridElement.value
}

function patch() {
    return gridElement.patch
}