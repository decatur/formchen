
/** @import { JSONPatchOperation } from "./types" */

/**
 * @typedef {Object} WizardProperties
 * @property {Path=} currentPath
 * 
 * @typedef {JSONPatchOperation & WizardProperties} JSONPatchOperationExt
 */

/**
 * Applies a patch to a mutable object.
 * @param {any} obj
 * @param {JSONPatchOperationExt[]} patch
 * @returns {any}
 */
export function merge_(obj, patch) {

    for (const op of patch) {
        let o = obj;
        let path = new Path(op.path);
        if (op.op == 'add') {
            for (let i = 1; i < path.parts.length - 1; i++) {
                o = o[path.parts[i]];
            }
            if (Array.isArray(o)) {
                const i = path.index();
                if (i > o.length) throw Error();
                o.splice(path.index(), 0, op.value);
            } else {
                o[path.parts.at(-1)] = op.value;
            }
        } else if (op.op == 'replace') {
            if (op.path === '') {
                obj = o = op.value;
            } else {
                for (let i = 1; i < path.parts.length - 1; i++) {
                    o = o[path.parts[i]];
                }
                o[path.parts.at(-1)] = op.value;
            }

        } else if (op.op == 'remove') {
            if (op.path === '') {
                o = undefined;
            } else {
                for (let i = 1; i < path.parts.length - 1; i++) {
                    o = o[path.parts[i]];
                }
                if (Array.isArray(o)) {
                    const i = path.index();
                    if (i > o.length) throw Error();
                    o.splice(path.index(), 1);
                } else {
                    delete o[path.parts.at(-1)];
                }
            }

        }
    }
    return obj
}

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
    obj.foo = obj.foo || [];
    obj.foo.push(op);

    return obj
}

function clone(obj) {
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
        let o = obj;
        let path = new Path(op.path);
        if (op.op == 'add') {
            if (op.path === '') {
                obj = o = clone(op.value);
                addOp(o, op);
            } else {
                for (let i = 1; i < path.parts.length - 1; i++) {
                    addOp(o, op);
                    o = o[path.parts[i]];
                }
                addOp(o, op);
                let value = addOp(clone(op.value), op);
                value.wasAdded = true;
                if (Array.isArray(o)) {
                    const i = path.index();
                    if (i > o.length) throw Error();
                    o.splice(path.index(), 0, value);
                } else {
                    o[path.parts.at(-1)] = value;
                }
            }
        } else if (op.op == 'replace') {
            if (op.path === '') {
                removes = removes.concat(obj.foo);
                obj = o = clone(op.value);
                addOp(o, op);
            } else {
                for (let i = 1; i < path.parts.length - 1; i++) {
                    addOp(o, op);
                    o = o[path.parts[i]];
                }
                addOp(o, op);
                let value = addOp(clone(op.value), op);
                let oo = o[path.parts.at(-1)];
                if (oo != null && typeof oo === 'object' && 'foo' in oo) {
                    if (oo.wasAdded) {
                        op.op = 'add';
                    }
                    removes = removes.concat(oo.foo);
                }
                o[path.parts.at(-1)] = value;
            }

        } else if (op.op == 'remove') {
            if (op.path === '') {
                removes = removes.concat(o.foo);
                o = undefined;
            } else {
                for (let i = 1; i < path.parts.length - 1; i++) {
                    o = o[path.parts[i]];
                }
                if (Array.isArray(o)) {
                    const i = path.index();
                    if (i > o.length) throw Error();
                    if (o[path.index()].wasAdded) {
                        removes.push(op);
                    }
                    removes = removes.concat(o[path.index()].foo);
                    o.splice(path.index(), 1);

                } else {
                    if (o[path.parts.at(-1)].wasAdded) {
                        removes.push(op);
                    }
                    removes = removes.concat(o[path.parts.at(-1)].foo);
                    delete o[path.parts.at(-1)];
                }
            }

        }
    }

    let p = patch.filter((op) => !removes.includes(op));
    obj = JSON.parse(JSON.stringify(obj, (key, value) => {
        if (key === 'wasAdded' || key === 'foo')
            return undefined
        else
            return value
    }
    ));

    return [obj, p]
}

export const dispense = squash;

/**
 * Squashes all redundant operations.
 *
 * @param {any} obj
 * @param {JSONPatchOperationExt[]} patch
 * @returns {JSONPatchOperation[]}
 */
export function squash(obj, patch) {
    return merge(obj, patch)[1];
    if (patch.length <= 1) return patch;

    /** 
     * Contains only operations add and remove.
     * @type{JSONPatchOperationExt[]} 
     */
    const normalizedPatch = [];
    for (const op of patch) {
        normalizedPatch.push(op);
    }

    let p = [];
    for (let i = 0; i < normalizedPatch.length - 1; i++) {
        const op = normalizedPatch[i];
        if (op.op != 'foo' && !squashOperation(normalizedPatch.slice(i + 1), op)) {
            p.push(op);
        }
    }

    let op = normalizedPatch.at(-1);
    if (op.op != 'foo') p.push(op);

    return p
}

export class Path {
    /** @type{string} path */
    constructor(path) {
        /** @type{(string | number)[]} */
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
        throw Error();
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

/**
 * Dispense all redundant operation values.
 *
 * @param {JSONPatchOperationExt[]} patch
 * @param {JSONPatchOperationExt} operation
 * @returns {boolean}
 */
export function squashOperation(patch, operation) {
    if (!(operation.op == 'remove' || operation.op == 'add' || operation.op == 'replace')) throw Error(`Invalid op ${operation.op}`);

    if (patch.length === 0) {
        return false
    }

    const path = new Path(operation.path);

    for (const op of patch) {
        if (!(op.op == 'remove' || op.op == 'add' || op.op == 'replace')) throw Error(`Invalid op ${op.op}`);
        let p = new Path(op.path);

        if (path.equals(p)) {
            // operation = {/foo/a/b add value}
            // op        = {/foo/a/b replace value}
            if (operation.op == 'add' && op.op == 'replace') {
                op.op = 'add';
                return true;
            } else if (operation.op == 'add' && op.op == 'remove') {
                // { "op": "add", "path": "/a/b", "value": "A" },
                // { "op": "remove", "path": "/a/b" }
                op.op = 'foo';
                op.path = '/foo/bar/fooo';
                return true;
            } else if (operation.op == 'add' && op.op == 'add') {
                if (!p.isArray()) return true
            } else {
                return true
            }
        } else if (path.startsWith(p)) {
            // operation = {/foo/a/b add value}
            // op        = {/foo/a replace value}
            return true
        } else if (p.startsWith(path)) {
            // operation = {/foo/a add value}
            // op        = {/foo/a/b add value}
            return false
        }

        if (path.isArray()) {
            if (path.sameArray(p)) {
                let [index, otherIndex] = path.indices(p);
                if (otherIndex <= index) {
                    if (op.op == 'add') {
                        // operation = {/foo/2 add value}
                        // op        = {/foo/3 replace value}
                        path.increment(path.parts.length - 1);
                    } else if (op.op == 'remove') {
                        // operation = {/foo/2 add value}
                        // op        = {/foo/3 replace value}
                        path.decrement(path.parts.length - 1);
                    }
                }
            }
        }
    }

    return false

}
