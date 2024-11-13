/** @import { F1Type } from "../formchen/utils.js" */
/** @import { JSONPatch } from "../formchen/private-types.js" */

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
    // if (someElement.id != 'BasicDemoReadOnly') someElement.remove();
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
        codeElement.textContent = patch.length?REPR.stringify(patch, null, 2):'Patch is empty unless you make edits';
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

