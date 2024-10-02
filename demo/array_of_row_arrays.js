
import { GridChen } from "../formchen/gridchen/gridchen.js"
import { TransactionManager } from "../formchen/utils.js";
import { bindTabs } from "../test/utils.js";

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

