
import { GridChen } from "../gridchen/webcomponent.js"
import { createView } from "../gridchen/matrixview.js"
import { createTransactionManager, registerUndo } from "../gridchen/utils.js";

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
}; const data =
    [
        ["2019-01-01", 0, 0],
        ["2019-01-02", 1, 2],
        ["2019-01-03", 2, 4]
    ];

const container = document.getElementById(schema.title);
container.querySelector('code').innerText = JSON.stringify(data, null, 4);
const view = createView(schema, data);
const gridElement = /** @type{GridChen} */ (container.querySelector('grid-chen'));
const tm = createTransactionManager();
registerUndo(document.body, tm);
tm.addEventListener('change', function (evt) {
    console.log(view.getModel());
    console.log(evt.transaction.operations);
});

gridElement.resetFromView(view, tm);
