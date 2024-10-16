/**
 * Author: Wolfgang Kühn 2019-2024
 * Source located at https://github.com/decatur/formchen
 *
 * Module implementing, well, utilities.
 */

/** @import { JSONPatchOperation, } from "./types" */

const logLevels = {
    null: 0,
    error: 1,
    info: 2
};

const href = new URL(window.location.href);
// if loglevel is not set then we get logLevels.null, which is 0
const logLevel = logLevels[(href.searchParams.get('loglevel'))];

const showConsole = Boolean(href.searchParams.get('console'));

/**
 * @callback F6Type
 * @param{string} a
 * @param{string=} b
 * @returns {void}
 */

/**
 * @callback F4Type
 * @param{number} level
 * @param{string} a
 * @param{string=} b
 * @returns {void}
 */

/** @type{F4Type} */
let log;

if (logLevel) {
    log = (level, a, b) => {
        if (level > logLevel) return
        if (showConsole) {
            let div = document.createElement('div');
            div.textContent = a + (b?' : ' + b: '');
            document.body.appendChild(div);
        } else {
            console.log(a, b)
        }
    };
} else {
    log = () => undefined;
}

if (showConsole) {
    window.onerror = (e) => {
        let div = document.createElement('div');
        div.textContent = String(e); // + ' ' + String(e.stack);
        document.body.appendChild(div);
    }
}

export const logger = {
    log,
    /** @type{F6Type} */
    info: function (a, b) {
        this.log(logLevels.info, a, b)
    },
    /** @type{F6Type} */
    error: function (a, b) {
        this.log(logLevels.error, a, b)
    }
};

export class Patch {
    constructor() {
        this.pathPrefix = '';
        /** @type{JSONPatchOperation[]} */
        this.operations = [];
    }

    apply() {
        throw Error('Not implemented')
    }
    
    /**
     * @returns {Patch}
     */
    reverse() {
        const patch = new Patch();
        patch.apply = this.apply;
        patch.pathPrefix = this.pathPrefix;
        patch.operations = reversePatch(this.operations);
        return patch;
    }
}


/**
 * @callback F2Type
 * @param {Event} event
 * @returns {void}
 */

/**
 * @callback F3Type
 * @param {Event} event
 * @returns {void}
 */

/**
 * @param {HTMLElement} element
 * @param {F2Type} func
 * @returns {F3Type}
 */
export function wrap(element, func) {
    return function (evt) {
        try {
            func(evt);
        } catch (e) {
            console.error(e);
            const div = document.createElement('div');
            div.style.fontSize = 'large';
            div.textContent = '🙈 Oops, gridchen has experienced an unexpected error: ' + e.message;
            let root = element.tagName === 'GRID-CHEN' ? element.shadowRoot : element.getRootNode();
            root.textContent = '';
            root.appendChild(div);
        }
    }
}

/**
 * 
 * @param {number} v 
 * @returns {string}
 */
function pad(v) {
    return String(v).padStart(2, '0');
}

/**
 * @param {string} period
 * @returns {number}
 */
export function resolvePeriod(period) {
    const index = ['YEARS', 'MONTHS', 'DAYS', 'HOURS', 'MINUTES', 'SECONDS', 'MILLISECONDS'].indexOf(period.toUpperCase());
    if (index === -1) {
        throw new RangeError('Invalid period: ' + period);
    }
    return index;
}

const MONTHS = resolvePeriod('MONTHS');
const DAYS = resolvePeriod('DAYS');
const HOURS = resolvePeriod('HOURS');
const MINUTES = resolvePeriod('MINUTES');
const SECONDS = resolvePeriod('SECONDS');

/**
 * @callback F1Type
 * @returns {void}
 */

/**
 * @typedef {Object} Transaction
 * @property {Patch[]} patches
 * @property {F1Type} commit
 * @property {JSONPatchOperation[]} operations
 * @property {HTMLElement} target
 * @property {string} pathPrefix
 */

// /**
//  * @param {Date} d
//  * @param {number} period
//  * @returns {string}
//  */
// export function toUTCDateString(d, period) {
//     let s = pad(d.getUTCFullYear());
//     if (period >= MONTHS) {
//         s += '-' + pad(1 + d.getUTCMonth());
//     }
//     if (period >= DAYS) {
//         s += '-' + pad(d.getUTCDate());
//     }
//     return s
// }

// /**
//  * @param {Date} d
//  * @param {number} period
//  * @returns {string}
//  */
// export function toUTCDatePartialTimeString(d, period) {
//     let s = toUTCDateString(d, period);
//     if (period >= HOURS) {
//         // We use space, not 'T' as time separator to apeace MS-Excel.
//         s += ' ' + toUTCTimeString(d, period);
//     }
//     return s;
// }

// /**
//  * @param {Date} d
//  * @param {number} period
//  * @returns {string}
//  */
// function toUTCTimeString(d, period) {
//     let s = pad(d.getUTCHours());
//     if (period >= MINUTES) {
//         s += ':' + pad(d.getUTCMinutes());
//     }
//     if (period >= SECONDS) {
//         s += ':' + pad(d.getUTCSeconds());
//     }
//     if (period > SECONDS) {
//         s += '.' + String(d.getUTCMilliseconds()).padStart(3, '0');
//     }
//     return s;
// }

/**
 * @param {Date} d
 * @param {number} period
 * @returns {string}
 */
function toTimeString(d, period) {
    let s = pad(d.getHours());
    if (period >= MINUTES) {
        s += ':' + pad(d.getMinutes());
    }
    if (period >= SECONDS) {
        s += ':' + pad(d.getSeconds());
    }
    if (period > SECONDS) {
        s += '.' + String(d.getMilliseconds()).padStart(3, '0');
    }
    return s;
}

// /**
//  * @param {Date} d
//  * @param {number} period
//  * @returns {string}
//  */
// export function toUTCDateTimeString(d, period) {
//     let s = toUTCDatePartialTimeString(d, period);
//     return s + 'Z';
// }

/**
 * @param {Date} d
 * @param {number} period
 * @returns {string}
 */
export function toLocalISODateString(d, period) {
    let s = pad(d.getFullYear());
    if (period >= MONTHS) {
        s += '-' + pad(1 + d.getMonth());
    }
    if (period >= DAYS) {
        s += '-' + pad(d.getDate());
    }

    return s
}

/**
 * @param {Date} d
 * @param {number} period
 * @returns {string}
 */
export function toLocaleISODateTimeString(d, period) {
    let s = toLocalISODateString(d, period);
    if (period >= HOURS) {
        // We use space, not 'T' as time separator to apeace MS-Excel.
        s += ' ' + toTimeString(d, period);
    }
    let dh = d.getHours() - d.getUTCHours();
    if (dh < 0) dh += 24;
    return s + '+' + pad(dh) + ':00';
}

let localeDateParserSingleton = undefined;

/**
 * @returns {LocalDateParserClass}
 */
export function localeDateParser() {
    if (!localeDateParserSingleton) {
        localeDateParserSingleton = new LocalDateParserClass();
    }
    return localeDateParserSingleton;
}

/**
 * @param {number[]} a
 * @returns {boolean}
 */
function someNaN(a) {
    return a.some((v) => isNaN(v))
}

/**
 * @param {string} s 
 * @returns 
 */
function isAmbiguous(s) {
    let parts = /** @type{[number, number, number, number, number, number]} */(s.split(/\D/).map((x) => Number(x)));
    parts[1]--;
    let month = parts[1];
    let hours = parts[3];
    let d = new Date(...parts);
    
    //let ts_before = ts - 3600*1000;
    // console.log(hours, d.getHours());
    // console.log(new Date(ts_before));
    // console.log(d);
    // console.log(new Date(ts_after));
    if (month < 6) {
        // 2024-03-31T02:30 -> 2024-03-31T03:30+02:00 (later valid datetime) 
        if (hours != d.getHours()) {
            return true
        }
        return false 
    } else {
        // 2024-10-27T02:30 -> 2024-10-27T02:30+02:00 (earlier hour)
        let ts = d.getTime();
        let ts_after = ts + 3600*1000;
        if (hours == (new Date(ts_after)).getHours()) {
            return true
        }
        return false
    }
}

console.assert(!isAmbiguous('2024-10-09T13:30'));
console.assert(!isAmbiguous('2024-10-27T01:30'));
console.assert(isAmbiguous('2024-10-27T02:30'));
console.assert(!isAmbiguous('2024-10-27T03:30'));
console.assert(!isAmbiguous('2024-03-31T01:30'));
console.assert(isAmbiguous('2024-03-31T02:30'));
console.assert(!isAmbiguous('2024-03-31T03:30'));

export class FullDate {

    /**
     * @param {number} year 
     * @param {number} month 
     * @param {number} day 
     */
    constructor(year, month, day) {
        this.year = year;
        this.month = month;
        this.day = day;
    }

}

 /**
     * @param {string} s
     * @returns {FullDate|SyntaxError}
     */
 function parseFullDate(s) {
    const parts = s.split('-');
    if (parts.length === 3) {
        return new FullDate(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
    } else {
        return new SyntaxError(s)
    }
}

/**
 * @param {string} s
 * @returns {[number, number, number, number, number, number, number, number, number] | SyntaxError}
 */
function parseDateOptionalTimeTimezone(s) {
    const dateTimeParts = s.trim().split(/\s+|T/);
    const fullDateResult = parseFullDate(dateTimeParts[0]);
    if (fullDateResult instanceof SyntaxError) {
        return fullDateResult
    } else if (dateTimeParts.length === 1) {
        let parts = [...[fullDateResult.year, fullDateResult.month, fullDateResult.day], 0, 0, 0, 0];
        return /** @type{[number, number, number, number, number, number, number, number, number]} */ (parts)
    }

    //  19:52:53.3434+00:00 ->
    //   0                        1     2      3      4          5
    //  ["19:52:53.123456+00:00", "19", ":52", ":53", ".123456", "+00:00"]
    const m = dateTimeParts[1].match(/^(\d+)(:\d+)?(:\d+)?(\.[0-9]+)?(Z|[+-][0-9:]+)?$/);
    if (!m) {
        return new SyntaxError(s)
    }

    const hours = Number(m[1]);
    const minutes = m[2] ? Number(m[2].substring(1)) : 0;
    const seconds = m[3] ? Number(m[3].substring(1)) : 0;
    let millis = 0;
    if (m[4]) {
        // Ignore sub-millis as JS Date does not support those.
        // Example: ".1234567" -> .1234567 -> 123.4567 -> 123
        millis = Math.floor(Number(m[4]) * 1000);
    }
    let timeZone = [];
    if (m[5]) {
        if (m[5] === 'Z') {
            timeZone = [0, 0];
        } else {
            // This will also take care of negative offsets, i.e. "-01:00" -> [-1, 0]
            timeZone = m[5].split(':').map(v => Number(v));
        }
        if (timeZone.length !== 2 || someNaN(timeZone)) {
            return new SyntaxError(s)
        }
    }

    // Array of length 9
    return /** @type{[number, number, number, number, number, number, number, number, number]} */ ([...[fullDateResult.year, fullDateResult.month, fullDateResult.day], hours, minutes, seconds, millis, ...timeZone])
}

/**
* The created parser can parse strings of the form YYYY-MM-DDTHH:mm:ss.sssZ,
* see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#date_time_string_format
*/
export class LocalDateParserClass {
    /**
     * Parses full dates of the form 2019-10-27, 10/27/2019, ...
     * @param {string} s
     * @returns {FullDate|SyntaxError}
     */
    fullDate(s) {
        // This is currently only used for unit testing.
        return parseFullDate(s);
    }

    // /**
    //  * Parses dates with partial time of the form 2019-10-27 00:00, 10/27/2019T01:02, ...
    //  * @param {string} s
    //  * @returns {[number, number, number, number, number, number, number] | SyntaxError}
    //  */
    // datePartialTime(s) {
    //     const r = parseDateOptionalTimeTimezone(s);
    //     if (r instanceof SyntaxError) {
    //         return r
    //     } else if (r.length !== 7) {
    //         return new SyntaxError(s)
    //     } else {
    //         return r
    //     }
    // }

    /**
     * Parses date times of the form 2019-10-27 00:00Z, 10/27/2019T01:02+01:00, ...
     * @param {string} s
     * @returns {[number, number, number, number, number, number, number, number, number] | SyntaxError}
     */
    dateTime(s) {
        const r = parseDateOptionalTimeTimezone(s);
        if ( r instanceof SyntaxError ) {
            return r
        } else if (r.length !== 9) {
            return new SyntaxError(s)
        } else {
            return r
        }
    }
}

/**
 * @param {JSONPatchOperation} op
 */
function reverseOp(op) {
    if (op.op === 'replace') {
        // {"op":"replace","path":"/0/1"}
        return { op: op.op, path: op.path, value: op.oldValue, oldValue: op.value }
    } else if (op.op === 'add') {
        // {"op":"add","path":"/-","value":null}
        // {"op":"add","path":"/1"}
        return { op: 'remove', path: op.path }
    } else if (op.op === 'remove') {
        // {"op":"remove","path":"/1","oldValue":["2020-01-01",2]}
        return { op: 'add', path: op.path, value: op.oldValue }
    }
    // No need to support move, copy, or test.
    throw new RangeError(op.op)
}

/**
 * @param {JSONPatchOperation[]} patch
 * @returns {JSONPatchOperation[]}
 */
export function reversePatch(patch) {
    const reversedPatch = [];
    for (let op of patch) {
        reversedPatch.unshift(reverseOp(op));
    }
    return reversedPatch
}

/**
 * Applies a JSON Patch operation.
 * @param {{'':object}} holder
 * @param {JSONPatchOperation} op
 */
function applyJSONPatchOperation(holder, op) {
    const path = op.path.split('/');

    while (path.length > 1) {
        holder = holder[path.shift()];
    }
    const index = path[0];

    if (op.op === 'replace') {
        holder[index] = op.value;
    } else if (op.op === 'add') {
        if (Array.isArray(holder)) {
            (/**@type{object[]}*/(holder)).splice(parseInt(index), 0, op.value);
        } else {
            holder[index] = op.value;
        }
    } else if (op.op === 'remove') {
        if (Array.isArray(holder)) {
            (/**@type{object[]}*/(holder)).splice(parseInt(index), 1);
        } else {
            delete holder[index];
        }
    } else {
        // No need to support move, copy, or test.
        throw new RangeError(op.op)
    }
}

/**
 * @param {{'':*}} holder
 * @param {JSONPatchOperation[]} patch
 */
function applyPatch(holder, patch) {
    for (let op of patch) {
        applyJSONPatchOperation(holder, op);
    }
}

/**
 * Returns the mutated data (yes, data is mutated) object or, if some path is root '',
 * a new object (add) or undefined (remove).
 * This is a low budget implementation of RFC 6902 JSON Patch.
 * It does not implement the move, copy, or test operations.
 * It does not support corner cases such as the '-' path or ~ escapes.
 * It does not do any validation or error handling.
 *
 * @param {object} data
 * @param {JSONPatchOperation[]} patch
 * @returns {object|undefined}
 */
export function applyJSONPatch(data, patch) {
    const holder = { '': data };
    applyPatch(holder, patch);
    return holder[''];
}

/**
 * Add keydown listeners for KeyY and KeyZ to handle Undo/Redo.
 * @param {HTMLElement} container 
 * @param {TransactionManager} tm 
 */
export function registerUndo(container, tm) {

    /**
     * @param {KeyboardEvent} evt
     */
    function listener(evt) {
        if (evt.code === 'KeyY' && evt.ctrlKey) {

            const target = /**@type{HTMLElement} */ (evt.target);
            if (target instanceof HTMLInputElement && target.value !== target.defaultValue) {
                // Let the default browser undo action be performed on this input element.
            } else {
                evt.preventDefault();
                evt.stopPropagation();
                tm.undo();
            }
        } else if (evt.code === 'KeyZ' && evt.ctrlKey) {
            // Note: It it too complex to support default browser redos. We do not support those!
            evt.preventDefault();
            evt.stopPropagation();
            tm.redo();
        }
    }

    container.addEventListener('keydown', listener);
}

/**
 * @callback F5Type
 * @param{string} context
 * @returns {void}
 */

/**
 * @callback Listener
 * @param{{type: string, transaction:Transaction}} p
 * @returns {void}
 */

export class TransactionManager {
    constructor() {
        this.clear();
        /** @type{Object.<string, Listener[]>} */
        this.listenersByType = { change: [] };
        this.resolves = [];
    }

    // /**
    //  * 
    //  * @param {string} pathPrefix 
    //  */
    // withContext(pathPrefix) {
    //     return new Proxy(this, {
    //         get(target, prop) {
    //             if (prop == 'openTransaction') {
    //               return function (...args) {
    //                 const t = target[prop].apply(target, args);
    //                 t.pathPrefix = pathPrefix;
    //                 return t
    //               }
    //             }
    //             return target[prop];
    //         }
    //     });
    // }

    /**
     * @param {Transaction} transaction 
     */
    fireChange(transaction) {
        const type = 'change';
        for (let listener of this.listenersByType[type]) {
            listener({ type, transaction });
        }

        while (this.resolves.length) {
            this.resolves.pop()();
        }
    }

    /**
     * @param {string} type 
     * @param {Listener} listener 
     */
    addEventListener(type, listener) {
        this.listenersByType[type].push(listener);
    }

    /**
     * @param {string} type
     * @param {Listener} listener 
     */
    removeEventListener(type, listener) {
        this.listenersByType[type].every(function (l, index) {
            if (l === listener) {
                delete this.listenersByType[type][index];
                return false
            }
            return true
        });
    }

    /**
     * 
     * @param {F1Type} func 
     * @returns {Promise}
     */
    async requestTransaction(func) {
        const self = this;
        return new Promise(function (resolve) {
            self.resolves.push(resolve);
            func();
        });
    }

    /**
     * @param {HTMLElement} target
     * @returns {Transaction}
     */
    openTransaction(target) {
        const tm = this;
        return /**@type{Transaction}*/ ({
            patches: [],
            commit() {
                tm.transactions.push(this);
                tm.fireChange(this);
            },
            get operations() {
                const flattend = [];
                for (let patch of this.patches) {
                    for (let op of patch.operations) {
                        const clonedOp = Object.assign({}, op);
                        clonedOp.path = patch.pathPrefix + op.path;
                        flattend.push(clonedOp);
                    }
                }
                return flattend;
            },
            get target() { return target }
        });
    }

    undo() {
        const trans = this.transactions.pop();
        if (!trans) return;
        this.redoTransactions.push(trans);
        const reversedTransaction = /**@type{Transaction}*/ (Object.assign({}, trans));
        reversedTransaction.patches = [];           
        for (let patch of trans.patches.slice().reverse()) {
            const reversedPatch = patch.reverse();
            reversedTransaction.patches.push(reversedPatch);
            reversedPatch.apply();
        }

        this.fireChange(reversedTransaction);
    }

    redo() {
        const trans = this.redoTransactions.pop();
        if (!trans) return;
        this.transactions.push(trans);
        for (let patch of trans.patches) {
            patch.apply();
        }
        this.fireChange(trans);
    }

    clear() {
        /** @type {Transaction[]} */
        this.transactions = [];
        /** @type {Transaction[]} */
        this.redoTransactions = [];
    }

    /**
     * Returns a flat patch set according to JSON Patch https://tools.ietf.org/html/rfc6902
     * of all performed transactions.
     * @returns {JSONPatchOperation[]}
     */
    get patch() {
        const allPatches = [];
        for (let trans of this.transactions) {
            allPatches.push(...trans.operations);
        }
        return allPatches
    }
}

// For replace operations on non-array fields only keep the lattest operation.
// TODO: Consider using https://github.com/alshakero/json-squash
// export function squash_patch(patch) {

//     /**
//      * @param {string} a
//      * @param {string} a
//      */
//     function isChild(a, b) {
//         a = a + '/';
//         if (!b.startsWith(a)) return null;
//         b = b.substr(a.length);
//         if (b.indexOf('/') != -1) return null;
//         return b
//         /*a = a.split('/');
//         b = b.split('/');
//         if (a.length + 1 != b.length) return null;
//         for (let i in a) {
//             if (a[i] != b[i]) return null;
//         }
//         return b[b.length - 1]*/
//     }

//     let squashed = [];
//     let add_or_replace = new Set(['add', 'replace']);
//     for (let op of patch) {
//         let prev_op = (squashed.length ? squashed[squashed.length - 1] : { op: "", path: "" });
//         if (prev_op.path == op.path && prev_op.op == 'replace' && op.op == 'replace') {
//             squashed[squashed.length - 1] = { op: "replace", path: op.path, value: op.value };
//         } else if (prev_op.path == op.path && prev_op.op == 'add' && op.op == 'replace') {
//             squashed[squashed.length - 1] = { op: "add", path: op.path, value: op.value };
//         } else {
//             let name = isChild(prev_op.path, op.path);
//             if (name && add_or_replace.has(prev_op.op) && add_or_replace.has(op.op)) {
//                 let value = JSON.parse(JSON.stringify(prev_op.value));
//                 value[name] = op.value;
//                 squashed[squashed.length - 1] = { op: prev_op.op, path: prev_op.path, value: value };
//             } else {
//                 squashed.push(op);
//             }
//         }
//     }

//     return squashed;
// }

// For replace operations on non-array fields only keep the lattest operation.
// TODO: Consider using https://github.com/alshakero/json-squash
export function squash_formchen_patch(patch) {
    let scalar_fields = {};
    let array_fields = {};
    let squashed = [];
    for (let op of patch) {
        let m = op.path.match(/^(.*)\/\d/);
        if (!m) {
            console.assert(op.op == 'replace');
            scalar_fields[op.path] = op;
        } else {
            let prefix = m[1];
            if (!array_fields[prefix]) {
                array_fields[prefix] = [];
            }
            array_fields[prefix].push(op);
        }
    }

    for (const op of Object.values(scalar_fields)) {
        squashed.push(op);
    }

    for (const [key, item_patch] of Object.entries(array_fields)) {
        for (const op of Object.values(item_patch)) {
            squashed.push(op);
        }
    }

    return squashed;
}




