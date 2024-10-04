/** @import { F1Type } from "../formchen/utils.js" */
/** @import { JSONPatch } from "../formchen/types" */

/**
 * @param {string} msg 
 */
export function log(msg) {
    console.log(msg);
}

function error(a, b, msg) {
    const err = Error('assertEqual failed');
    // console.error(err);
    console.error(msg, 'Expected ' + a, 'Actual ' + b);
    throw err;
}

function assertEqualAtomic(a, b, msg) {
    if (Number.isNaN(a) && Number.isNaN(b)) {
        // Handle special case because NaN !== NaN is true
        return
    }
    if (a !== b) {
        error(a, b, msg);
    }
}

/**
 * @param {?} a
 * @param {?} b
 * @param {string} [path]
 */
function assertEqual(a, b, path) {
    path = path || '';
    //console.log(path);
    if (a == null || b == null) {
        // Take care of either null and void 0.
        assertEqualAtomic(a, b, path);
        return;
    }
    assertEqualAtomic(a.constructor, b.constructor, path);
    // assertEqualAtomic(Array.isArray(a), Array.isArray(b), path);
    if (Array.isArray(a)) {
        assertEqualAtomic(a.length, b.length, path);
        for (let i = 0; i < a.length; i++) {
            assertEqual(a[i], b[i], path + '/' + i);
        }
    } else if (a instanceof Date) {
        if (isNaN(a.getTime()) && isNaN(b.getTime())) {
            // pass
        } else if (a.getTime() !== b.getTime()) {
            error(a, b, path);
        }
    } else if (typeof a === 'object') {
        assertEqualAtomic(Object.keys(a).sort().join(), Object.keys(b).sort().join(), 'Keys mismatch at path ' + path);
        for (let key of Object.keys(a)) {
            assertEqual(a[key], b[key], path + '/' + key);
        }
    } else {
        assertEqualAtomic(a, b, path);
    }
}

/**
 * @param {boolean} b 
 */
function assertTrue(b) {
    if (b !== true) {
        throw Error()
    }
}

export const assert = {
    equal: assertEqual,
    true: assertTrue
};

/**
 * @callback F2Type
 * @param {string} test_name 
 * @returns {void}
 */

/**
 * 
 * @param {string} test_name 
 * @param {F2Type} func 
 */
export function test(test_name, func) {
    if (window.location.hash === '' || window.location.hash == '#' + test_name) {
        log('Running ' + test_name);
        func(test_name);
    }
}

export async function async_test(test_name, func) {
    if (window.location.hash === '' || window.location.hash == '#' + test_name) {
        log('Running ' + test_name);
        await func(test_name);
    }
}

/**
 * Same as the global JSON object, but representation is JavaScript, not JSON.
 */
export const REPR = {
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
 *     <label>Page<input type="radio" name="tabs" value="page"></label>
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
 * @param {PatchCallBack} valueCallback 
 * @param {ValueCallBack} patchCallback 
 */
export async function bindTabs(someElement, schema, valueCallback, patchCallback) {
    const container = someElement.closest('.demo');
    // HTML mutates once it is bound to formchen or gridchen. So we take a snapshot here.
    let html = container.innerHTML;
    let m = html.match(/\s+/);
    html = html.replaceAll(m[0], '\n');

    // Schema mutates once it is attached to gridchen. So we take a snapshot here.
    const schemaRepr = REPR.stringify(schema, null, 2);

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
        if (name == 'Page') {
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

    appendRadio('Page').onchange = () => {
        codeElement.style.display = 'none';
        someElement.style.display = 'block';
    }

    appendRadio('Html').onchange = () => showCode(() => {
        codeElement.textContent = html;
    })

    appendRadio('Schema').onchange = () => showCode(() => {
        codeElement.textContent =schemaRepr;
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

