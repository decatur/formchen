/** @import { F1Type } from "../formchen/utils.js" */
/** @import { JSONPatch } from "../formchen/types.js" */

import { applyJSONPatchOperation } from "../formchen/utils.js";
let scripts = Array(...document.body.getElementsByTagName('script'));

/**
 * @callback ValueCallBack
 * @returns {object}
 */

/**
 * @callback PatchCallBack
 * @returns {JSONPatch}
 */

/**
 * Augments HTML of the form
 * 
 * <div class=".demo" id="DemoId">
 *   <div>
 *     ...
 *   </div>
 * </div>
 * 
 * with a radio group and a code element as such
 * 
 * <div class=".demo" id="DemoId">
 *   <form>
 *     <label>Live<input type="radio" name="tabs" value="live"></label>
 *     ...
 *   </form>
 *   <div>
 *     <code></code>
 *     <div>
 *       ...
 *     </div>
 *   </div>
 * </div>
 * 
 * @param {HTMLElement} someElement 
 * @param {object} schema
 * @param {ValueCallBack} valueCallback 
 * @param {PatchCallBack} patchCallback 
 */
export async function bindDemoTabs(someElement, schema, valueCallback, patchCallback) {
    const id = someElement.id;
    let hash = encodeURIComponent(id);
    if (window.location.hash === '' || window.location.hash == '#' + hash) {
        let url = window.location.origin + window.location.pathname + '#' + hash;
        console.log(`Loading ${url}`)
    } else {
        // This will, intentionally, crash the demo.
        someElement.remove();
        return;
    }

    const container = someElement.closest('.demo');
    // HTML mutates once it is bound to formchen or gridchen. So we take a snapshot here.
    let html = container.innerHTML;
    let m = html.match(/\s+/);
    html = html.replaceAll(m[0], '\n');

    const tabsElement = document.createElement('form');
    tabsElement.className = 'tabs';

    /**
     * @param {string} name 
     * @returns {HTMLInputElement}
     */
    function appendRadio(name) {
        let label = document.createElement('label');
        label.textContent = name;
        let input = document.createElement('input');
        input.type = 'radio';
        input.name = 'tabs';
        input.value = name.toLowerCase();
        if (name == 'Live') {
            input.checked = true;
        }
        label.appendChild(input);
        tabsElement.appendChild(label);
        return input
    }

    /**
     * @param {F1Type} func 
     */
    function showCode(func) {
        someElement.style.visibility = 'hidden';
        codeElement.style.visibility = 'visible';
        func()
    }

    appendRadio('Live').onchange = () => {
        codeElement.style.visibility = 'hidden';
        someElement.style.visibility = 'visible';
    }

    appendRadio('Html').onchange = () => showCode(() => {
        codeElement.textContent = html;
    })

    appendRadio('Schema').onchange = () => showCode(() => {
        codeElement.textContent = REPR.stringify(schema, null, 2);
    })

    appendRadio('Data').onchange = () => showCode(() => {
        codeElement.textContent = REPR.stringify(valueCallback(), null, 2);
    })

    appendRadio('Patch').onchange = () => showCode(() => {
        let patch = patchCallback();
        codeElement.textContent = patch.length ? REPR.stringify(patch, null, 2) : 'Patch is empty unless you make edits';
    })

    appendRadio('Script').onchange = () => showCode(() => {
        codeElement.textContent = script;
    })

    someElement.remove();
    container.appendChild(tabsElement);
    const tabContainer = document.createElement('div');
    tabContainer.style.position = 'relative';
    tabContainer.appendChild(someElement);
    let codeElement = document.createElement('code');
    codeElement.className = 'codeTab';
    tabContainer.appendChild(codeElement);
    container.appendChild(tabContainer);

    const response = await fetch(scripts.shift().src);
    if (!response.ok) {
        throw Error(`Response status: ${response.status}`);
    }

    let script = await response.text();
    // Remove all lines containing bindDemoTabs stuff
    script = script.replaceAll(/.*bindDemoTabs.*\n/g, '');
    // Remove schema and data content
    script = script.replaceAll(/(schema|data) = ([^;]*)/g, '$1 = {...}');

}

/**
 * Same as the global JSON object, but representation is JavaScript, not JSON.
 */
const REPR = {
    /**
     * Return a string containing a printable representation of a value.
     * @param {*} v
     * @param {null} replacer
     * @param {number=} depth
     * @param {number=} level
     * @returns {string}
     */
    stringify(v, replacer, depth, level) {
        level = level || 0;
        depth = depth || 0;
        const nl0 = '\n' + Array.from({ length: level * depth }, () => '  ').join('');
        const nl1 = nl0 + Array.from({ length: depth }, () => '  ').join('');
        const out = [];
        if (v == null) {
            out.push('null');
        } else if (v.constructor === String) {
            out.push("'");
            out.push(v.replace('\n', '\\n'));
            out.push("'");
        } else if (v.constructor === Date) {
            out.push('new Date("' + v.toISOString().replace(':00.000Z', 'Z') + '")');
        } else if (Array.isArray(v)) {
            const nestedArray = Array.isArray(v[0]);
            out.push('[');
            if (nestedArray) {
                out.push(nl1);
            }
            const a = [];
            for (const value of v) {
                a.push(REPR.stringify(value, replacer, depth, level + 1));
            }
            if (nestedArray) {
                out.push(a.join(',' + nl1));
                out.push(nl0);
            } else {
                out.push(a.join(', '));
            }
            out.push(']');
        } else if (typeof v === 'object') {
            out.push('{' + nl1);
            const a = [];
            for (const [key, value] of Object.entries(v)) {
                a.push(key + ': ' + REPR.stringify(value, replacer, depth, level + 1));
            }
            out.push(a.join(',' + nl1));
            out.push(nl0 + '}');
        } else {
            out.push(v);
        }
        return out.join('')
    }
};

/**
 * @param{string} _input
 * @param{RequestInit=} init
 * @returns{Promise<Response>}
 */
export async function fakeFetch(_input, init) {
    let plant = JSON.parse(window.localStorage.getItem('plant'));
    if (plant == null) {
        plant = {
            "_id": '4711',
            "plant": 'Rubus idaeus',
            "reference": 'https://en.wikipedia.org/wiki/Rubus_idaeus',
            "observer": 'Frida Krum',
            "start": '2019-01-01T00:00Z',
            "latitude": 41.40338,
            "longitude": 2.17403,
            "measurements": [
                ["2019-01-01T00:00Z", 0, 0],
                ["2019-02-01T00:00Z", 1, 2.3],
                ["2019-03-01T00:00Z", 2, 4]
            ],
            "isCompleted": true
        }
    }

    let response;
    if (!init || init.method == 'GET') {
        response = {
            ok: true, statusText: 'Ok', status: 200,
            json: async () => { return plant }
        }
    } else {
        const payload = JSON.parse(String(init.body));
        if (payload._id == plant._id) {
            for (const operation of payload['patch']) {
                applyJSONPatchOperation({ '': plant }, operation);
            }
            plant._id = String(Number(plant._id) + 1);
            window.localStorage.setItem('plant', JSON.stringify(plant));
            response = {
                ok: true, statusText: 'Ok', status: 200,
                json: async () => { return { "patch": [{ "op": "replace", "path": "/_id", "value": plant._id }] } }
            }
        } else {
            response = {
                ok: false, statusText: 'Conflict', status: 409,
                json: async () => { return { "patch": [{ "op": "replace", "path": "", "value": plant }] } }
            }
        }
    }

    return /** @type{Response} */(response)
}

const useFakeServerElement = /** @type{HTMLInputElement} */(document.getElementById('fake_server'));
if (useFakeServerElement) {
    useFakeServerElement.checked = !(window.localStorage.getItem('useFakeServer') == 'false');
    useFakeServerElement.onchange = () => {
        window.localStorage.setItem('useFakeServer', String(useFakeServerElement.checked));
    }
}

export function fetchFactory() {
    return (useFakeServerElement?.checked)?fakeFetch:fetch
}

