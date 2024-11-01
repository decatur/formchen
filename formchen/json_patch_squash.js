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
        let o = root;
        let path = new Path(op.path);
        if (op.op == 'add') {
            if (op.path === '') {
                if (!('value' in op)) throw Error("missing 'value' parameter")
                root  = clone(op.value);
                appendOp(root, op);
            } else {
                o = path.query(o, op);

                if (!('value' in op)) throw Error("missing 'value' parameter")
                let value = appendOp(clone(op.value), op);
                value[wasAddedKey] = true;
                if (Array.isArray(o)) {
                    const i = path.index();
                    if (i > o.length) throw Error('index is greater than number of items in array');
                    o.splice(path.index(), 0, value);
                } else {
                    o[path.parts.at(-1)] = value;
                }
            }
        } else if (op.op == 'replace') {
            if (op.value === undefined) throw Error("missing 'value' parameter");
            let targetValue = appendOp(clone(op.value), op);

            if (op.path === '') {
                if (o != null && typeof o === 'object' && childPatchKey in o) removes = removes.concat(o[childPatchKey]);
                root = targetValue;
            } else {
                o = path.query(o, op);

                let srcValue = o[path.parts.at(-1)];
                if (srcValue === undefined) {
                    throw Error(`path ${op.path} does not exist`);
                }
                if (srcValue != null && typeof srcValue === 'object' && childPatchKey in srcValue) {
                    if (srcValue[wasAddedKey]) {
                        op.op = 'add';
                    }
                    removes = removes.concat(srcValue[childPatchKey]);
                }
                o[path.parts.at(-1)] = targetValue;
            }

        } else if (op.op == 'remove') {
            if (op.path === '') {
                if (o != null && typeof o === 'object' && childPatchKey in o) removes = removes.concat(o[childPatchKey]);
                root = null;
            } else {
                o = path.query(o, op);
               
                if (Array.isArray(o)) {
                    const i = path.index();
                    if (i >= o.length) throw Error('index is greater than number of items in array');
                    if (o[path.index()][wasAddedKey]) {
                        removes.push(op);
                    }
                    removes = removes.concat(o[path.index()][childPatchKey]);
                    o.splice(path.index(), 1);

                } else {
                    let oo = o[path.parts.at(-1)];
                    if (oo === undefined) {
                        throw Error(`path ${op.path} does not exist`);
                    }
                    if (oo != null && typeof oo === 'object' && childPatchKey in oo) {
                        if (oo[wasAddedKey]) {
                            removes.push(op);
                        }
                        removes = removes.concat(oo[childPatchKey]);
                    }
                    delete o[path.parts.at(-1)];
                }
            }

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
     * @returns  {number}
     */
    index() {
        let key = this.parts.at(-1);
        if (typeof key === 'number') return key;
        throw Error(`Invalid array index ${key}`);
    }

    /**
     * @param {any} o
     * @param {JSONPatchOperation} op
     * @returns {any}
     */
    query(o, op) {
        if (o === null) {
            throw Error(`path "" does not exist`);
        }
        for (let i = 1; i < this.parts.length - 1; i++) {
            if (op.op != 'remove') appendOp(o, op);
            o = o[this.parts[i]];
            if (o === undefined) {
                throw Error(`path ${this.parts.slice(0, i + 1).join('/')} does not exist`);
            }
        }
        if (op.op != 'remove') appendOp(o, op);
        return o
    }
}


