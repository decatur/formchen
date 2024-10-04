import { GridChen } from "../formchen/gridchen/gridchen.js"
import { TransactionManager } from "../formchen/utils.js";
import { bindTabs } from "../test/utils.js";

const schema = {
    title: 'UnicodeTable',
    type: 'array',
    items: {
        type: 'array',
        items: [
            { title: 'CodePoint', type: 'string', width: 100 }
        ]
    }
};

const tm = new TransactionManager();
const gridElement = /** @type{GridChen} */ (document.getElementById(schema.title));
bindTabs(gridElement, schema, value, patch);
const i16 = Array.from({ length: 0x10 }, (_, k) => ({ title: '0x' + k.toString(0x10), type: 'string', width: 30 }));
schema.items.items.push(...i16);

const demoElement = gridElement.closest('.demo');

function refresh() {
    const [min, max] = ['min', 'max'].map((s) => {
        return Number(/** @type{HTMLInputElement} */ (demoElement.querySelector(`.${s}`)).value)
    });
    const data = [];
    for (let cp = min; cp <= max; cp += 0x10) {
        data.push(['0x' + cp.toString(0x10), ...i16.map((_, k) => String.fromCodePoint(cp + k))]);
    }
    gridElement.bind(schema, data, tm);
}

demoElement.getElementsByTagName('button')[0].onclick = refresh;
refresh();

function value() {
    return gridElement.value
}

function patch() {
    return tm.patch
}


