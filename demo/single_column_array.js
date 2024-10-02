import { GridChen } from "../formchen/gridchen/gridchen.js"
import { TransactionManager } from "../formchen/utils.js";
import { bindTabs } from "../test/utils.js";

const schema = {
    title: 'Single Column Array',
    type: 'array',
    items: { width: 200, type: 'string', format: 'full-date' }
};

const data = ["2019-01-01", "2019-01-02", "2019-01-03"];

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