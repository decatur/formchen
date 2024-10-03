import { GridChen } from "../formchen/gridchen/gridchen.js"
import { TransactionManager } from "../formchen/utils.js";
import { bindTabs } from "../test/utils.js";

const schema = {
    title: 'Array of Column Arrays',
    type: 'array',
    items: [ // tuple schema
        { type: 'array', items: { title: 'TimeStamp', width: 200, type: 'string', format: 'full-date' } },
        { type: 'array', items: { title: 'Age', width: 100, type: 'number' } },
        { type: 'array', items: { title: 'Weight', width: 100, type: 'number' } }
    ]
};
const data = [
    ["2019-01-01", "2019-01-02", "2019-01-03"],
    [0, 1, 2],
    [0, 2, 4]
];

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



