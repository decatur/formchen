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
 *   <code></code>
 *   <div>
 *     ...
 *   </div>
 * </div>
 * 
 * @param {HTMLElement} someElement 
 * @param {object} schema
 * @param {ValueCallBack} valueCallback 
 * @param {PatchCallBack} patchCallback 
 */
export async function bindTabs(someElement, schema, valueCallback, patchCallback) {
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
        someElement.style.display = 'none';
        codeElement.style.display = 'block';
        func()
    }

    appendRadio('Live').onchange = () => {
        codeElement.style.display = 'none';
        someElement.style.display = 'block';
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

    let codeElement = document.createElement('code');
    container.insertAdjacentElement('afterbegin', codeElement);
    container.insertAdjacentElement('afterbegin', tabsElement);


    const response = await fetch(scripts.shift().src);
    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
    }

    let script = await response.text();
    // Remove all lines containing bindTabs stuff
    script = script.replaceAll(/.*bindTabs.*\n/g, '');
    // Remove schema and data content
    script = script.replaceAll(/(schema|data) = ([^;]*)/g, '$1 = {...}');

}

