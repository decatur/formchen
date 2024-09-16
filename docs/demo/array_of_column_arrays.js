import { GridChen } from "../gridchen/webcomponent.js"
import { createView } from "../gridchen/matrixview.js"
import { createTransactionManager, registerUndo } from "../gridchen/utils.js";

const schema =        {
            title: 'Array of Column Arrays',
            type: 'array',
            items: [ // tuple schema
                {type: 'array', items: {title: 'TimeStamp', width: 200, type: 'string', format: 'full-date'}},
                {type: 'array', items: {title: 'Age', width: 100, type: 'number'}},
                {type: 'array', items: {title: 'Weight', width: 100, type: 'number'}}
            ]
        };
        const data =
        [
            ["2019-01-01", "2019-01-02", "2019-01-03"],
            [0, 1, 2],
            [0, 2, 4]
        ];

        const view = createView(schema, data);

const container = document.getElementById('Array of Column Arrays');
container.querySelector('code').innerText = JSON.stringify(data, null, 4);
const gridElement = /** @type{GridChen} */ (container.querySelector('grid-chen'));
const tm = createTransactionManager();
registerUndo(document.body, tm);
tm.addEventListener('change', function (evt) {
    console.log(view.getModel());
    console.log(evt.transaction.operations);
});

gridElement.resetFromView(view, tm);
