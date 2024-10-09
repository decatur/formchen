/** @import { JSONSchema, GridChenElement } from "../formchen/types" */

import { bindTabs } from "../test/utils.js";

/** @type{JSONSchema} */
const schema = {
    title: 'Single Column Array',
    type: 'array',
    items: { width: 200, type: 'string', format: 'date' }
};

const data = ["2019-01-01", "2019-01-02", "2019-01-03"];

const gridElement = /** @type{GridChenElement} */ (document.getElementById(schema.title));
bindTabs(gridElement, schema, value, patch);
gridElement.bind(schema, data);

function value() {
    return gridElement.value
}

function patch() {
    return gridElement.patch
}