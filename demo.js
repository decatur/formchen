import {createFormChen} from "./formchen/webcomponent.js"
import * as u from "/gridchen/utils.js";

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
    const rootElement = document.getElementById('/myPrefix');
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

    if (document.querySelector('.form-chen').childElementCount <= 1) {
        document.querySelector('.form-chen').innerHTML = `<div id="${schema.pathPrefix}"/>`;
    }

    let fc;
    try {
        fc = createFormChen(schema, data);
    } catch (e) {
        console.error(e);
        rootElement.textContent = String(e);
    }

    const tm = u.globalTransactionManager;
    tm.addEventListener('change', function () {
        patchElement.value = JSON.stringify(tm.patch, null, 2);
        dataElement.value = JSON.stringify(fc.value, null, 2);
    });
}