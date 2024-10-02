import { GridChen } from "../formchen/gridchen/gridchen.js"
import { TransactionManager } from "../formchen/utils.js";
import { bindTabs } from "../test/utils.js";

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

const tm = new TransactionManager();
const gridElement = /** @type{GridChen} */ (document.getElementById(schema.title));
gridElement.bind(schema, data, tm);

function value() {
    return gridElement.value
}

function patch() {
    return tm.patch
}

// ==== End of displayed code
bindTabs(gridElement.parentElement, schema, value, patch, './demo/array_of_row_objects.js');

