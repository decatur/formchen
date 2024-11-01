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
function addOp(obj, op) {
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

    let removes = [];
    for (const op of patch) {
        if (op.path === undefined) throw Error('missing path parameter');
        if (typeof op.path !== 'string') throw Error(`invalid path parameter: ${op.path}`);
        let o = obj;
        let path = new Path(op.path);
        if (op.op == 'add') {
            if (op.path === '') {
                if (!('value' in op)) throw Error("missing 'value' parameter")
                obj = o = clone(op.value);
                addOp(o, op);
            } else {
                for (let i = 1; i < path.parts.length - 1; i++) {
                    addOp(o, op);
                    o = o[path.parts[i]];
                    if (o === undefined) {
                        throw Error(`path ${path.parts.slice(0, i + 1).join('/')} does not exist`);
                    }
                }
                addOp(o, op);
                if (!('value' in op)) throw Error("missing 'value' parameter")
                let value = addOp(clone(op.value), op);
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
            if (op.path === '') {
                removes = removes.concat(obj[childPatchKey]);
                if (!('value' in op)) throw Error("missing 'value' parameter")
                obj = o = clone(op.value);
                addOp(o, op);
            } else {
                for (let i = 1; i < path.parts.length - 1; i++) {
                    addOp(o, op);
                    o = o[path.parts[i]];
                    if (o === undefined) {
                        throw Error(`path ${path.parts.slice(0, i + 1).join('/')} does not exist`);
                    }
                }

                addOp(o, op);
                if (!('value' in op)) throw Error("missing 'value' parameter")
                let value = addOp(clone(op.value), op);
                let oo = o[path.parts.at(-1)];
                if (oo === undefined) {
                    throw Error(`path ${op.path} does not exist`);
                }
                if (oo != null && typeof oo === 'object' && childPatchKey in oo) {
                    if (oo[wasAddedKey]) {
                        op.op = 'add';
                    }
                    removes = removes.concat(oo[childPatchKey]);
                }
                o[path.parts.at(-1)] = value;
            }

        } else if (op.op == 'remove') {
            if (op.path === '') {
                if (o === undefined) {
                    throw Error(`path "${op.path}" does not exist`);
                }
                removes = removes.concat(o[childPatchKey]);
                o = undefined;
            } else {
                for (let i = 1; i < path.parts.length - 1; i++) {
                    if (o === undefined) {
                        throw Error(`path "${path.parts.slice(0, i).join('/')}" does not exist`);
                    }
                    o = o[path.parts[i]];
                    if (o === undefined) {
                        throw Error(`path ${path.parts.slice(0, i + 1).join('/')} does not exist`);
                    }
                }
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
    obj = clone(obj);
    return [obj, p]
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
}


