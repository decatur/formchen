import { createFormChen } from "../formchen/formchen.js";
import { TransactionManager } from "../formchen/utils.js";
import { bindTabs } from "../test/utils.js";

const schema = {
    title: 'UnicodeTable',
    type: 'object',
    properties: {
        min: {
            title: 'Lower CP',
            type: 'string'
        },
        max: {
            title: 'Upper CP',
            type: 'string'
        },
        symbols: {
            type: 'array',
            format: 'grid',
            items: {
                type: 'array',
                items: [
                    // Schema for first column
                    { title: 'CodePoint', type: 'string', width: 100 }
                ]
            }
        }
    }
};

const tm = new TransactionManager();
const formElement = document.getElementById(schema.title);
bindTabs(formElement, schema, value, patch);

// Range from 0x0 ... 0xf
const rowRange = Array.from({ length: 0x10 }, (_, k) => k);
// Add corresponding column schemas
const columnSchemas = rowRange.map(k => ({ title: '0x' + k.toString(0x10), type: 'string', width: 30 }));
schema.properties.symbols.items.items.push(...columnSchemas);

// Set initial codepoint range.
const obj = { min: '0x1f300', max: '0x1F9FF' };

function refreshSymbols() {
    obj.symbols = [];
    for (let cp = Number(obj.min); cp <= Number(obj.max); cp += 0x10) {
        obj.symbols.push(['0x' + cp.toString(0x10), ...rowRange.map(k => String.fromCodePoint(cp + k))]);
    }
    return createFormChen(formElement, schema, obj, tm);
}

let formchen = refreshSymbols();
document.getElementById('UnicodeTableRefresh').onclick = refreshSymbols;

function value() {
    return formchen.value
}

function patch() {
    return tm.patch
}


