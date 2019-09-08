import {createFormChen} from "./form-chen/FormChen.js"

const schemaElement = document.querySelector('.schema');
const dataElement = document.querySelector('.data');
const patchElement = document.querySelector('.patch');
schemaElement.oninput = dataElement.oninput = rebind;

export function init(schema, data) {
    schemaElement.value = JSON.stringify(schema, null, 2);
    dataElement.value = JSON.stringify(data, null, 2);
    rebind();
}

function rebind() {
    patchElement.value = '';
    const rootElement = document.querySelector('[data-path=""]');
    let schema;

    try {
        schema = JSON.parse(schemaElement.value);
    } catch (e) {
        rootElement.textContent = String(e);
        return;
    }

    const dataString = dataElement.value.trim();
    let data;

    if (dataString === '') {
        data = null;
    } else {
        try {
            data = JSON.parse(dataElement.value);
        } catch (e) {
            rootElement.textContent = String(e);
            return;
        }
    }

    function changeHandler(pointer, newValue) {
        console.log(`${pointer} -> ${newValue}`);
        patchElement.value = JSON.stringify(fc.getPatches(), null, 2);
        dataElement.value = JSON.stringify(fc.getValue(), null, 2);
    }

    const fc = createFormChen(schema, data, 'theObject', changeHandler);
}