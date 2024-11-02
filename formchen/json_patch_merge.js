/** @import { JSONPatchOperation } from "./types" */

import { clone } from "./utils.js";

// /**
//  * @typedef {Object} WizardProperties
//  * @property {Path=} currentPath
//  * 
//  * @typedef {JSONPatchOperation & WizardProperties} JSONPatchOperationExt
//  */

// We use symbols as property keys on wrapper objects
const childPatchKey = Symbol();
const wasAddedKey = Symbol();

/**
 * 
 * @param {any} obj
 * @param {JSONPatchOperation} op
 */
function appendOp(obj, op) {
    if (typeof obj === 'number') obj = new Number(obj);
    else if (typeof obj === 'string') obj = new String(obj);
    else if (typeof obj === 'boolean') obj = new Boolean(obj);
    else if (obj === null) obj = new Number(NaN);
    if (!(childPatchKey in obj)) obj[childPatchKey] = [];
    obj[childPatchKey].push(op);

    return obj
}

function isWrapper(o) {
    return o != null && typeof o === 'object' && childPatchKey in o
}

/**
 * Applies a patch to an immutable object.
 * @param {any} obj
 * @param {JSONPatchOperation[]} patch
 * @returns {[any, JSONPatchOperation[]]}
 */
export function merge(obj, patch) {
    if (obj === undefined) {
        throw Error(`"undefined" is not valid JSON`);
    }

    let removes = [];
    let root = clone(obj);
    for (const op of patch) {
        const operation = op.op;

        if (op.path === undefined) throw Error('missing path parameter');
        if (typeof op.path !== 'string') throw Error(`invalid path parameter "${op.path}"`);

        let targetValue;
        if (operation == 'add' || operation == 'replace') {
            if (op.value === undefined) throw Error("missing 'value' parameter");
            targetValue = appendOp(clone(op.value), op);
        } else if (operation !== 'remove') {
            throw Error(`Unsupported op "${operation}"`)
        }

        let holder = { "": root };
        let [p, c, key] = Path.query(holder, op);

        if (operation == 'remove' || operation == 'replace') {
            if ( c === undefined) {
                throw Error(`path "${op.path}" does not exist`);
            }

            if (isWrapper(c)) {
                if (c[wasAddedKey]) {
                    if (operation == 'replace') op.op = 'add';
                    else removes.push(op);
                }
                removes = removes.concat(c[childPatchKey]);
            }
        }

        if (operation == 'add') {
            targetValue[wasAddedKey] = true;
            if (Array.isArray(p)) {
                p.splice(Number(key), 0, targetValue);
            } else {
                p[key] = targetValue;
            }
        } else if (operation == 'replace') {
            p[key] = targetValue;
        } else if (operation == 'remove') {
            if (Array.isArray(p)) {
                p.splice(Number(key), 1);
            } else {
                delete p[key];
            }
        }

        root = holder[""];
        if (root === undefined) root = null;
    }

    let p = patch.filter((op) => !removes.includes(op));
    // Get rid of the symbol keys.
    root = clone(root);
    return [root, p]
}

/**
 * Removes all null operations, for example in the patch
 *   [
 *     {op:replace, path:/foo/bar, value:...},
 *     {op:replace, path:/foo, value:...}
 *   ]
 * the first operation is removed.
 *
 * @param {any} obj
 * @param {JSONPatchOperation[]} patch
 * @returns {JSONPatchOperation[]}
 */
export function removeNoOps(obj, patch) {
    return merge(obj, patch)[1];
}

/**
 * Represents a JSON Pointer.
 */
export class Path {
    /**
     * @param {string} jsonPointer 
     */
    constructor(jsonPointer) {
        /** @type{(string | number)[]} */
        if (jsonPointer.length > 0 && !jsonPointer.startsWith('/')) throw Error(`path should start with a slash: ${jsonPointer}`)
        this.parts = jsonPointer.split('/').map(key => /^\d+$/.test(key) ? parseInt(key) : key);
    }

    /**
     * @param {any} o
     * @param {JSONPatchOperation} op
     * @returns {[any, any, string | number]}
     */
    static query(o, op) {
        let path = new Path(op.path);
        for (let i = 0; i < path.parts.length - 1; i++) {
            o = o[path.parts[i]];
            if (o === undefined) {
                throw Error(`path "${path.parts.slice(0, i + 1).join('/')}" does not exist`);
            }
            if (op.op != 'remove') appendOp(o, op);
        }

        if (o == null || !(o.constructor == Object || o.constructor == Array)) {
            throw Error(`path "${path.parts.join('/')}" does not exist`);
        }

        let key = path.parts.at(-1);
        if (o.constructor == Array) {
            if (typeof key != 'number') throw Error(`Invalid array index "${key}"`);
            const supValue = op.op === 'add' ? o.length + 1 : o.length;
            if (key >= supValue) throw Error(`index ${key} is greater than max value ${supValue - 1}`);
        }

        return [o, o[key], key]
    }
}


