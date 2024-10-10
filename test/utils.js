

/**
 * @param {string} msg 
 */
export function log(msg) {
    console.log(msg);
}

function error(a, b, msg) {
    const err = Error('assertEqual failed');
    // console.error(err);
    console.error(msg, 'Expected ' + a, 'Actual ' + b);
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
 * @callback F2Type
 * @param {string} test_name 
 * @returns {void}
 */

/**
 * 
 * @param {string} test_name 
 * @param {F2Type} func 
 */
export function test(test_name, func) {
    if (window.location.hash === '' || decodeURIComponent(window.location.hash) == '#' + test_name) {
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
