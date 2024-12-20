

/**
 * @param {string} msg 
 */
export function log(msg) {
    console.log(msg);
}

function error(a, b, msg) {
    const err = Error('assertEqual failed');
    console.error(`left: ${a}`);
    console.error(`right: ${b}`);
    if (msg) console.error(msg);
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

/**
 * @param {boolean} b 
 */
function assertFalse(b) {
    if (b !== false) {
        throw Error()
    }
}

export const assert = {
    equal: assertEqual,
    true: assertTrue,
    false: assertFalse
};

/**
 * @callback F2Type
 * @param {string} test_name 
 * @returns {void}
 */

/**
 * @param {string | string[]} path 
 * @param {F2Type} func 
 */
export function test(path, func) {
    if (Array.isArray(path)) {
        path = path.join('/')
    }

    let hash = encodeURIComponent(path);
    if (window.location.hash === '' || window.location.hash == '#' + hash) {
        let url = window.location.origin + window.location.pathname + '#' + hash;
        log(`Running: ${path} ${url}`);
        func(path);
    }
}

/**
 * @param {string | string[]} path 
 * @param {F2Type} func 
 */
export async function async_test(path, func) {
    if (Array.isArray(path)) {
        path = path.join('/')
    }

    let hash = encodeURIComponent(path);
    if (window.location.hash === '' || window.location.hash == '#' + hash) {
        let url = window.location.origin + window.location.pathname + '#' + hash;
        log(`Running: ${path} ${url}`);
        await func(path);
    }
}

