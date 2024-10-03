import { GridChen } from "../formchen/gridchen/gridchen.js"
import { TransactionManager } from "../formchen/utils.js";
import { bindTabs } from "../test/utils.js";

const schema = {
    title: 'Order_objects_of_columns',
    type: 'object',
    properties: {
        a: { type: 'array', title: 'a', columnIndex: 0, width: 100, items: { type: 'number' } },
        1: { type: 'array', title: '1', columnIndex: 1, width: 100, items: { type: 'number' } }
    }
};


const data = { a: [1, 2], 1: [3, 4] };

const tm = new TransactionManager();
const gridElement = /** @type{GridChen} */ (document.getElementById(schema.title));
bindTabs(gridElement, schema, value, patch);
gridElement.bind(schema, data, tm);

function value() {
    return gridElement.value
}

function patch() {
    return tm.patch
}