/**
 * @param {string} msg 
 */
export function log(msg) {
    console.log(msg);
}

function error(a, b, msg) {
    const err = Error('assertEqual failed');
    // console.error(err);
    console.log(msg, 'Expected ' + a, 'Actual ' + b);
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
 * @callback F1Type
 * @param {string} test_name 
 * @returns {void}
 */

/**
 * 
 * @param {string} test_name 
 * @param {F1Type} func 
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
     * Return a JavaScript object from its representation.
     * @param {string} s
     * @returns {*}
     */
    parse(s) {
        s = s.trim();
        if (s === '') {
            throw new SyntaxError('Unexpected end of REPR input');
        }
        return eval('(' + s + ')')
    },
    /**
     * Return a string containing a printable representation of an object.
     * @param {*} v
     * @param {null} replacer
     * @param {number=} depth
     * @param {number=} level
     * @returns {string}
     */
    stringify(v, replacer, depth, level) {
        level = level || 0;
        depth = depth || 0;
        const nl0 = '\n' + Array.from({length: level * depth}, () => '  ').join('');
        const nl1 = nl0 + Array.from({length: depth}, () => '  ').join('');
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
            const nestedArray=Array.isArray(v[0]);
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

