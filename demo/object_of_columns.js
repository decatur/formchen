/** @import { JSONSchema } from "../formchen/types" */

import { createFormChen } from "../formchen/formchen.js";
import { bindDemoTabs } from "./utils.js";

/** @type {JSONSchema} */
const schema = {
    type: 'object',
    title: 'Object of Columns',
    properties: {
        columns: {
    title: 'Columns',
    type: 'object',
    format: 'grid',
    properties: {
        timestamp: {
            type: 'array',
            items: { title: 'TimeStamp', type: 'string', format: 'date', width: 200 }
        },
        age: {
            type: 'array', items: { title: 'Age', width: 100, type: 'number' }
        },
        weight: {
            type: 'array', items: { title: 'Weight', width: 100, type: 'number' }
        }
    }
}}};

const data = {columns: {
    timestamp: ["2019-01-01", "2019-01-02", "2019-01-03"],
    age: [0, 2, 4],
    weight: [0, 1, 2]
}};

bindDemoTabs(document.getElementById(schema.title), schema, value, patch);
const formchen = createFormChen(document.getElementById(schema.title), schema, data);

function value() {
    return formchen.value
}

function patch() {
    return formchen.patch
}
