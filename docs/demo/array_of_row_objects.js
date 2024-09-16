import { GridChen } from "../gridchen/webcomponent.js"
import { createView } from "../gridchen/matrixview.js"
import { createTransactionManager, registerUndo } from "../gridchen/utils.js";

const schema =
{
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
const data =
    [
        { timestamp: "2019-01-01", age: 0, weight: 0 },
        { timestamp: "2019-01-02", age: 1, weight: 2 },
        { timestamp: "2019-01-03", age: 2, weight: 4 }
    ];

const view = createView(schema, data);
const gridElement = /** @type{GridChen} */ (document.querySelector('grid-chen'));
const tm = createTransactionManager();
registerUndo(document.body, tm);
tm.addEventListener('change', function (evt) {
    console.log(view.getModel());
    console.log(evt.transaction.operations);
});

gridElement.resetFromView(view, tm);
