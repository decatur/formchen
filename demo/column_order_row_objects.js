import { GridChen } from "../formchen/gridchen/gridchen.js"
import { TransactionManager } from "../formchen/utils.js";
import { bindTabs } from "../test/utils.js";

const schema = {
    title: 'Column Order',
    type: 'array',
    items: {
        type: 'object',
        properties: {
            a: { title: 'a', type: 'number', columnIndex: 0, width: 100 },
            1: { title: '1', type: 'number', columnIndex: 1, width: 100 }
        }
    }
};

const data = [{ a: 1, 1: 3 }, { a: 2, 1: 4 }];

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
