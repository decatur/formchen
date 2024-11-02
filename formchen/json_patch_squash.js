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


function checkIndex(key, supValue) {
    if (typeof key != 'number') throw Error(`Invalid array index ${key}`);
    if (key >= supValue) throw Error(`index ${key} is greater than max value ${supValue-1}`);
    return key
}

/**
 * Applies a patch to a mutable object.
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
        if (op.path === undefined) throw Error('missing path parameter');
        if (typeof op.path !== 'string') throw Error(`invalid path parameter: ${op.path}`);
        let path = new Path(op.path);
        let holder = { "": root };
        let [p, c] = path.query(holder, op);

        if (op.op == 'add') {
            if (op.value === undefined) throw Error("missing 'value' parameter");
            let targetValue = appendOp(clone(op.value), op);
            targetValue[wasAddedKey] = true;
            if (Array.isArray(p)) {
                const i = checkIndex(path.key(), p.length+1);
                p.splice(i, 0, targetValue);
            } else {
                p[path.key()] = targetValue;
            }
            root = holder[""];
        } else if (op.op == 'replace') {
            if (op.value === undefined) throw Error("missing 'value' parameter");
            let targetValue = appendOp(clone(op.value), op);

            let srcValue = c;
            if (srcValue === undefined) {
                throw Error(`path "${op.path}" does not exist`);
            }
            if (srcValue != null && typeof srcValue === 'object' && childPatchKey in srcValue) {
                if (srcValue[wasAddedKey]) {
                    op.op = 'add';
                }
                removes = removes.concat(srcValue[childPatchKey]);
            }
            p[path.key()] = targetValue;
            root = holder[""];
        } else if (op.op == 'remove') {
            if (Array.isArray(p)) {
                const i = checkIndex(path.key(), p.length);
                if (c[wasAddedKey]) {
                    removes.push(op);
                }
                removes = removes.concat(c[childPatchKey]);
                p.splice(i, 1);
            } else {
                if (c === undefined) {
                    throw Error(`path "${op.path}" does not exist`);
                }
                if (c != null && typeof c === 'object' && childPatchKey in c) {
                    if (c[wasAddedKey]) {
                        removes.push(op);
                    }
                    removes = removes.concat(c[childPatchKey]);
                }
                delete p[path.key()];
            }
            root = holder[""];
            if (root === undefined) root = null;

        } else {
            throw Error(`Unsupported op ${op.op}`)
        }
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
     * @param {string} path 
     */
    constructor(path) {
        /** @type{(string | number)[]} */
        if (path.length > 0 && !path.startsWith('/')) throw Error(`path should start with a slash: ${path}`)
        this.parts = path.split('/').map(key => /^\d+$/.test(key) ? parseInt(key) : key);
    }

    /**
     * @returns {string | number}
     */
    key() {
        return this.parts.at(-1)
    }

    /**
     * @param {any} o
     * @param {JSONPatchOperation} op
     * @returns {[any, any]}
     */
    query(o, op) {
        if (o === null) {
            throw Error(`path "" does not exist`);
        }
        for (let i = 0; i < this.parts.length - 1; i++) {
            if (op.op != 'remove') appendOp(o, op);
            o = o[this.parts[i]];
            if (o === undefined) {
                throw Error(`path "${this.parts.slice(0, i + 1).join('/')}" does not exist`);
            }
        }
        if (op.op != 'remove') appendOp(o, op);
        if (o == null || !(o.constructor == Object || o.constructor == Array)) {
            throw Error(`path "${this.parts.join('/')}" does not exist`);
        }
        return [o, o[this.key()]]
    }
}


