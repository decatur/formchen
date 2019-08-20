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
    const containerElement = document.querySelector('.form-chen');
    let schema;

    try {
        schema = JSON.parse(schemaElement.value);
    } catch (e) {
        containerElement.textContent = String(e);
        return;
    }

    let data;

    try {
        data = JSON.parse(dataElement.value);
    } catch (e) {
        containerElement.textContent = String(e);
        return;
    }

    function changeHandler(pointer, newValue) {
        console.log(`${pointer} -> ${newValue}`);
        patchElement.value = JSON.stringify(fc.getPatches(), null, 2);
        dataElement.value = JSON.stringify(fc.getValue(), null, 2);
    }

    const fc = createFormChen(schema, data, containerElement, changeHandler);
}