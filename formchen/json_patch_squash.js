
/** @import { JSONPatchOperation } from "./types" */

/**
 * @typedef {Object} WizardProperties
 * @property {Path=} currentPath
 * 
 * @typedef {JSONPatchOperation & WizardProperties} JSONPatchOperationExt
 */

export const dispense = squash;

/**
 * Squashes all redundant operations.
 *
 * @param {JSONPatchOperationExt[]} patch
 * @returns {JSONPatchOperation[]}
 */
export function squash(patch) {
    if (patch.length <= 1) return patch;

    /** 
     * Contains only operations add and remove.
     * @type{JSONPatchOperationExt[]} 
     */
    const normalizedPatch = [];
    for (const op of patch) {
        op.currentPath = new Path(op.path);
        // if (op.op === 'replace') {
        //     normalizedPatch.push({op: 'remove', path: op.path, currentPath: op.currentPath});
        //     normalizedPatch.push({op: 'add', path: op.path, value: op.value, currentPath: op.currentPath});
        // } else {
        normalizedPatch.push(op);
        // }
    }

    let p = [];
    for (const op of normalizedPatch) {
        /** @type{(string | number)[]} */
        //const path = op.path.split('/').map(key => /^\d+$/.test(key) ? parseInt(key) : key);
        p = squashOperation(p, op);
    }

    for (const op of p) {
        delete op.currentPath
    }

    return p
}

class Path {
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
 * @returns {JSONPatchOperation[]}
 */
export function squashOperation(patch, operation) {
    if (!(operation.op == 'remove' || operation.op == 'add' || operation.op == 'replace')) throw Error(`Invalid op ${operation.op}`);

    if (patch.length === 0) {
        return [operation]
    }

    operation.currentPath = new Path(operation.path);
    const path = operation.currentPath;

    let squashed = [];
    let oops;

    if (path.isArray && operation.op == 'add') {
        squashed = patch;
        oops = operation;
    } else {
        /** @type{JSONPatchOperationExt} */


        squashed = [];
        for (const op of patch.reverse()) {
            if (!(op.op == 'remove' || op.op == 'add' || op.op == 'replace')) throw Error(`Invalid op ${op.op}`);
            const p = op.currentPath;

            // 3 * 3 = 3 + 2 + 2 + 2

            if (operation.op == 'add' && op.op == 'add') {
                if (path.equals(p)) {
                    // operation = {/foo/a add value}
                    // op        = {/foo/a add value}
                    throw Error();
                } else if (path.startsWith(p)) {
                    // operation = {/foo/a/b add value}
                    // op        = {/foo/a add value}
                    squashed.push(op);
                    oops = operation;
                    break;
                } else if (p.startsWith(path)) {
                    // operation = {/foo/a add value}
                    // op        = {/foo/a/b add value}
                    throw Error();
                } else {
                    squashed.push(op);
                    oops = operation;
                }
            } else if (operation.op == 'remove' && op.op == 'remove') {
                if (path.equals(p)) {
                    // operation = {/foo/a remove value}
                    // op        = {/foo/a remove value}
                    throw Error();
                } else if (path.startsWith(p)) {
                    // operation = {/foo/a/b remove value}
                    // op        = {/foo/a remove value}
                    throw Error();
                } else if (p.startsWith(path)) {
                    // operation = {/foo/a remove value}
                    // op        = {/foo/a/b remove value}
                    oops = operation;
                } else {
                    squashed.push(op);
                    oops = operation;
                }
            } else if (operation.op == 'replace' && op.op == 'replace') {
                if (path.equals(p)) {
                    // operation = {/foo/a replace value}
                    // op        = {/foo/a replace value}
                    oops = operation;
                } else if (path.startsWith(p)) {
                    // operation = {/foo/a/b replace value}
                    // op        = {/foo/a replace value}
                    squashed.push(op);
                    oops = operation;
                } else if (p.startsWith(path)) {
                    // operation = {/foo/a replace value}
                    // op        = {/foo/a/b replace value}
                    oops = operation;
                } else {
                    squashed.push(op);
                    oops = operation;
                }
            } else if (operation.op == 'add' && op.op == 'remove') {
                if (path.equals(p)) {
                    // operation = {/foo/a add value}
                    // op        = {/foo/a remove value}
                    oops = { path: operation.path, op: 'replace', value: operation.value };
                    break;
                } else if (path.startsWith(p)) {
                    // operation = {/foo/a/b add value}
                    // op        = {/foo/a remove value}
                    oops = operation;
                    break;
                } else if (p.startsWith(path)) {
                    // operation = {/foo/a add value}
                    // op        = {/foo/a/b remove value}
                    throw Error();
                } else {
                    squashed.push(op);
                    oops = operation;
                }
            } else if (operation.op == 'remove' && op.op == 'add') {
                if (path.equals(p)) {
                    // operation = {/foo/a remove value}
                    // op        = {/foo/a add value}
                    oops = undefined;
                    break;
                } else if (path.startsWith(p)) {
                    // operation = {/foo/a/b remove value}
                    // op        = {/foo/a add value}
                    squashed.push(op);
                    oops = operation;
                    break;
                } else if (p.startsWith(path)) {
                    // operation = {/foo/a remove value}
                    // op        = {/foo/a/b add value}
                    oops = operation;
                    break;
                } else {
                    squashed.push(op);
                    oops = operation;
                }
            } else if (operation.op == 'replace' && op.op == 'add') {
                if (path.equals(p)) {
                    // operation = {/foo/a replace value}
                    // op        = {/foo/a add value}
                    oops = { path: operation.path, op: 'add', value: operation.value };
                    break;
                } else if (path.startsWith(p)) {
                    // operation = {/foo/a/b replace value}
                    // op        = {/foo/a add value}
                    squashed.push(op);
                    oops = operation;
                    break;
                } else if (p.startsWith(path)) {
                    // operation = {/foo/a replace value}
                    // op        = {/foo/a/b add value}
                    oops = { path: operation.path, op: 'replace', value: operation.value };
                    break;
                } else {
                    squashed.push(op);
                    oops = operation;
                }
            } else if (operation.op == 'add' && op.op == 'replace') {
                if (path.equals(p)) {
                    // operation = {/foo/a add value}
                    // op        = {/foo/a replace value}
                    oops = operation;
                    break;
                } else if (path.startsWith(p)) {
                    // operation = {/foo/a/b add value}
                    // op        = {/foo/a replace value}
                    throw Error();
                } else if (p.startsWith(path)) {
                    // operation = {/foo/a add value}
                    // op        = {/foo/a/b replace value}
                    oops = operation;
                } else {
                    squashed.push(op);
                    oops = operation;
                }
            } else if (operation.op == 'remove' && op.op == 'replace') {
                if (path.equals(p)) {
                    // operation = {/foo/a remove value}
                    // op        = {/foo/a replace value}
                    oops = operation;
                    break;
                } else if (path.startsWith(p)) {
                    // operation = {/foo/a/b remove value}
                    // op        = {/foo/a replace value}
                    squashed.push(op);
                    oops = operation;
                    break;
                } else if (p.startsWith(path)) {
                    // operation = {/foo/a remove value}
                    // op        = {/foo/a/b replace value}
                    oops = operation;
                    break;
                } else {
                    squashed.push(op);
                    oops = operation;
                }
            } else if (operation.op == 'replace' && op.op == 'remove') {
                if (path.equals(p)) {
                    // operation = {/foo/a replace value}
                    // op        = {/foo/a remove value}
                    throw Error();
                } else if (path.startsWith(p)) {
                    // operation = {/foo/a/b replace value}
                    // op        = {/foo/a remove value}
                    throw Error();
                } else if (p.startsWith(path)) {
                    // operation = {/foo/a replace value}
                    // op        = {/foo/a/b remove value}
                    oops = operation;
                } else {
                    squashed.push(op);
                    oops = operation;
                }
            } else throw Error();
        }
    }

    if (oops) {
        squashed.push(oops);
    }

    if (path.isArray()) {
        for (let i=0; i<squashed.length-1; i++) {
            const op = squashed[i];
            const p = op.currentPath;
            if (path.sameArray(p)) {
                let [index, otherIndex] = path.indices(p);
                if (index <= otherIndex) {
                    if (operation.op == 'add') {
                        // operation = {/foo/2 add value}
                        // op        = {/foo/3 replace value}
                        op.currentPath.increment(path.parts.length - 1);
                    } else if (operation.op == 'remove') {
                        // operation = {/foo/2 add value}
                        // op        = {/foo/3 replace value}
                        op.currentPath.decrement(path.parts.length - 1);
                    }
                }
            }

        }
    }



    return squashed
}
