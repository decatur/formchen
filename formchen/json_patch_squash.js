
/** @import { JSONPatchOperation } from "./types" */

/**
 * @typedef {Object} WizardProperties
 * @property {Path=} currentPath
 * 
 * @typedef {JSONPatchOperation & WizardProperties} JSONPatchOperationExt
 */

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
    obj.fooo = obj.fooo || [];
    obj.fooo.push(op);

    return obj
}

function clone(obj) {
    if (obj === undefined) throw Error('"undefined" is not valid JSON');
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Applies a patch to a mutable object.
 * @param {any} obj
 * @param {JSONPatchOperationExt[]} patch
 * @returns {[any, JSONPatchOperationExt[]]}
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
                value.wasAdded = true;
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
                removes = removes.concat(obj.fooo);
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
                if (oo != null && typeof oo === 'object' && 'fooo' in oo) {
                    if (oo.wasAdded) {
                        op.op = 'add';
                    }
                    removes = removes.concat(oo.fooo);
                }
                o[path.parts.at(-1)] = value;
            }

        } else if (op.op == 'remove') {
            if (op.path === '') {
                removes = removes.concat(o.fooo);
                o = undefined;
            } else {
                for (let i = 1; i < path.parts.length - 1; i++) {
                    o = o[path.parts[i]];
                    if (o === undefined) {
                        throw Error(`path ${path.parts.slice(0, i + 1).join('/')} does not exist`);
                    }
                }
                if (Array.isArray(o)) {
                    const i = path.index();
                    if (i >= o.length) throw Error('index is greater than number of items in array');
                    if (o[path.index()].wasAdded) {
                        removes.push(op);
                    }
                    removes = removes.concat(o[path.index()].fooo);
                    o.splice(path.index(), 1);

                } else {
                    let oo = o[path.parts.at(-1)];
                    if (oo === undefined) {
                        throw Error(`path ${op.path} does not exist`);
                    }
                    if (oo != null && typeof oo === 'object' && 'fooo' in oo) {
                        if (oo.wasAdded) {
                            removes.push(op);
                        }
                        removes = removes.concat(oo.fooo);
                    }
                    delete o[path.parts.at(-1)];
                }
            }

        } else {
            throw Error(`Unsupported op ${op.op}`)
        }
    }

    let p = patch.filter((op) => !removes.includes(op));
    obj = JSON.parse(JSON.stringify(obj, (key, value) => {
        if (key === 'wasAdded' || key === 'fooo')
            return undefined
        else
            return value
    }
    ));

    return [obj, p]
}

/**
 * Squashes all redundant operations.
 *
 * @param {any} obj
 * @param {JSONPatchOperationExt[]} patch
 * @returns {JSONPatchOperation[]}
 */
export function dispense(obj, patch) {
    return merge(obj, patch)[1];
}

export class Path {
    /** @type{string} path */
    constructor(path) {
        /** @type{(string | number)[]} */
        if (path.length > 0 && !path.startsWith('/')) throw Error(`path should start with a slash: ${path}`)
        this.parts = path.split('/').map(key => /^\d+$/.test(key) ? parseInt(key) : key);
        
    }

    /**
     * @returns {boolean}
     */
    isArray() {
        return typeof this.parts.at(-1) === 'number'
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
     * @param {Path} other 
     * @returns {boolean}
     */
    equals(other) {
        return other.parts.length == this.parts.length && this.startsWith(other)
    }

    parent() {
        if (this.parts.length === 0) {
            throw Error();
        }
        if (this.parts.length === 1) {
            // the whole document
            return new Path('')
        }
        return new Path(this.parts.slice(0, this.parts.length - 1).join('/'))
    }

    /**
     * @param {Path} other 
     * @returns {boolean} return true if this is an array and the other path is a child of this array.
     */
    sameArray(other) {
        if (!this.isArray()) return false;
        if (other.parts.length < this.parts.length) return false;
        // TODO: Assert that this is not the case
        //   this:  /a/1
        //   other: /a/b
        return other.startsWith(this.parent())
    }

    /**
     * 
     * @param {Path} other 
     * @returns {[number, number]}
     */
    indices(other) {
        if (!this.sameArray(other)) throw Error();
        const otherIndex = other.parts[this.parts.length - 1];
        if (typeof otherIndex !== 'number') throw Error();
        return [this.index(), otherIndex]
    }

    /**
     * 
     * @param {Path} other 
     * @returns 
     */
    startsWith(other) {
        if (other.parts.length > this.parts.length) return false
        for (const i in other.parts) {
            if (this.parts[i] !== other.parts[i]) return false;
        }
        return true
    }

    /**
     * @param {number} level 
     */
    increment(level) {
        console.log('increment', this.parts, level)
        let index = this.parts[level];
        if (typeof index !== 'number') throw Error();
        this.parts[level] = index + 1;
    }

    /**
     * @param {number} level 
     */
    decrement(level) {
        let index = this.parts[level];
        if (typeof index !== 'number') throw Error();
        this.parts[level] = index - 1;
    }
}


