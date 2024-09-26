/**
 * Author: Wolfgang Kühn 2019-2021
 * Source located at https://github.com/decatur/gridchen
 *
 * Module implementing, well, utilities.
 */

/** @import { LocalDateParser, JSONPatchOperation, Transaction, TransactionManager } from "./gridchen" */


// const DEBUG = (location.hostname === 'localhost');
const DEBUG = false;

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
 * @param {HTMLElement} element
 * @param {(Event) => any} func
 * @returns {(Event) => any}
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
    return s + '+' + pad(String(dh)) + ':00';
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
 * Pure creator function for TransactionManager instances.
 * @returns {TransactionManager}
 */
export function createTransactionManager() {
    const listenersByType = { change: [] };
    const resolves = [];

    function fireChange(transaction) {
        const type = 'change';
        for (let listener of listenersByType[type]) {
            listener({ type, transaction });
        }

        while (resolves.length) {
            resolves.pop()();
        }
    }

    /**
     * @implements {TransactionManager}
     */
    class TransactionManager {
        constructor() {
            this.clear();
        }

        addEventListener(type, listener) {
            listenersByType[type].push(listener);
        }

        removeEventListener(type, listener) {
            for (let l of listenersByType[type]) {
                if (l === listener) {
                    delete listenersByType[type][l];
                }
            }
        }

        async requestTransaction(func) {
            return new Promise(function (resolve) {
                resolves.push(resolve);
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
                    fireChange(this);
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
                target() { return target }
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
                reversedPatch.apply(reversedPatch);
            }

            fireChange(reversedTransaction);
        }

        redo() {
            const trans = this.redoTransactions.pop();
            if (!trans) return;
            this.transactions.push(trans);
            for (let patch of trans.patches) {
                patch.apply();
            }
            fireChange(trans);
        }

        clear() {
            /** @type {Transaction[]} */
            this.transactions = [];
            /** @type {Transaction[]} */
            this.redoTransactions = [];
        }

        /**
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

    return new TransactionManager();
}

let logCounter = 0;
export const logger = {
    log: (DEBUG ? (a, b) => window.console.log(logCounter++ + ': ' + a, b) : () => undefined),
    error: function (a, b) {
        window.console.error(logCounter++ + ': ' + a, b);
    }
};

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




