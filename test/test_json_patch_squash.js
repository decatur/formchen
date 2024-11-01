import { test, assert, log } from './utils.js'
import { removeNoOps, merge, Path } from "../formchen/json_patch_squash.js";
import { testCases as testCasesA } from "../json-patch-tests/spec_tests.js"
import { testCases as testCasesB } from "../json-patch-tests/tests.js"

log('\x1B[41;93;4m####### Loading test/test_json_patch_merge.js')

test('Path', () => {
    let path = new Path('/a/1');
    assert.equal(path.index(), 1);
});

test('merge', () => {
    const patch = [
        { "op": "add", "path": "", "value": {} },
        { "op": "add", "path": "/a", "value": { b: 1 } }
    ];
    const [obj, p] = merge(null, patch);
    assert.equal({ a: { b: 1 } }, obj);
});

test('merge', () => {
    const patch = [
        { "op": "replace", "path": "", "value": [0, 2] },
        { "op": "add", "path": "/1", "value": 1 }
    ];
    const [obj, p] = merge({}, patch);
    assert.equal([0, 1, 2], obj);
});

test('merge', () => {
    const patch = [
        { "op": "replace", "path": "", "value": [0, 1, 2] },
        { "op": "remove", "path": "/1" }
    ];
    const [obj, p] = merge(1, patch);
    assert.equal([0, 2], obj);
});

test('merge', () => {
    const patch = [
        { "op": "remove", "path": "/a" }
    ];
    const [obj, p] = merge({ a: { b: 1 } }, patch);
    assert.equal({}, obj);
});

test('merge', () => {
    const patch = [
        { "op": "remove", "path": "/a/b" }
    ];
    const [obj, p] = merge({ a: { b: 1 } }, patch);
    assert.equal({ a: {} }, obj);
});

test('remove root', () => {
    const patch = [
        { "op": "remove", "path": ""}
    ];
    const mergedPatch = removeNoOps({ a: { b: 2 } }, patch);
    assert.equal(patch, mergedPatch);
});

test('remove sub-path obj not set', () => {
    const patch = [
        { "op": "remove", "path": "/a"}
    ];
    try {
        removeNoOps({}, patch);
    } catch (e) {
        assert.equal(e.message, 'path /a does not exist');
        return
    }
    throw Error();
    
});

test('remove root obj not set', () => {
    const patch = [
        { "op": "remove", "path": ""}
    ];
    try {
        removeNoOps(undefined, patch);
    } catch (e) {
        assert.equal(e.message, 'path "" does not exist');
        return
    }
    throw Error();
});

test('replace root', () => {
    const patch = [
        { "op": "replace", "path": "", value: "Hello"}
    ];
    const mergedPatch = removeNoOps({ a: { b: 2 } }, patch);
    assert.equal(patch, mergedPatch);
});

test('remove sub-path obj not set', () => {
    const patch = [
        { "op": "replace", "path": "/a", value: "Hello"}
    ];
    try {
        removeNoOps({}, patch);
    } catch (e) {
        assert.equal(e.message, 'path /a does not exist');
        return
    }
    throw Error();
    
});

test('remove root obj not set', () => {
    const patch = [
        { "op": "replace", "path": "", value: "Hello"}
    ];
    try {
        removeNoOps(undefined, patch);
    } catch (e) {
        assert.equal(e.message, 'path "" does not exist');
        return
    }
    throw Error();
});

test('replace A + replace B -> replace B', () => {
    const patch = [
        { "op": "replace", "path": "/a/b", "value": "A" },
        { "op": "replace", "path": "/a/b", "value": "B" }
    ];
    const mergedPatch = removeNoOps({ a: { b: 2 } }, patch);
    assert.equal([{ "op": "replace", "path": "/a/b", "value": "B" }], mergedPatch);
});

test('replace A + remove -> remove', () => {
    const patch = [
        { "op": "replace", "path": "/a/b", "value": "A" },
        { "op": "remove", "path": "/a/b" }
    ];
    const mergedPatch = removeNoOps({ a: { b: 2 } }, patch);
    assert.equal([{ "op": "remove", "path": "/a/b" }], mergedPatch);
});

test('replace A + replace B + remove', () => {
    const patch = [
        { "op": "replace", "path": "/a/b", "value": "A" },
        { "op": "replace", "path": "/a/c", "value": "B" },
        { "op": "remove", "path": "/a" }
    ];
    const mergedPatch = removeNoOps({ a: { b: 'C', c: 'D' } }, patch);
    assert.equal([{ "op": "remove", "path": "/a" }], mergedPatch);
});

test('add A + replace B -> add B', () => {
    let patch = [
        { "op": "add", "path": "/a/b", "value": "A" },
        { "op": "replace", "path": "/a/b", "value": "B" }
    ];
    let mergedPatch = removeNoOps({ a: {} }, patch);
    assert.equal([{ "op": "add", "path": "/a/b", "value": "B" }], mergedPatch);

    patch = [
        { "op": "add", "path": "/a/b", "value": "A" },
        { "op": "add", "path": "/a/c", "value": "A" },
        { "op": "replace", "path": "/a", "value": "B" }
    ];
    mergedPatch = removeNoOps({ a: {} }, patch);
    assert.equal([{ "op": "replace", "path": "/a", "value": "B" }], mergedPatch);
});

test('add A + remove -> NoOp', () => {
    const patch = [
        { "op": "add", "path": "/a/b", "value": "A" },
        { "op": "remove", "path": "/a/b" }
    ];
    const mergedPatch = removeNoOps({ a: {} }, patch);
    assert.equal([], mergedPatch);
});

test('add A + remove -> NoOp', () => {
    const patch = [
        { "op": "add", "path": "/a/2", "value": "A" },
        { "op": "add", "path": "/a/1", "value": "B" },
        { "op": "remove", "path": "/a/1" }
    ];
    const mergedPatch = removeNoOps({ a: ['X', 'Y'] }, patch);
    assert.equal(mergedPatch, [{ "op": "add", "path": "/a/2", "value": "A" }]);
});

test('(indexed) replace A + replace B -> replace B', () => {
    const patch = [
        { "op": "replace", "path": "/a/1", "value": "A" },
        { "op": "replace", "path": "/a/1", "value": "B" }
    ];
    const mergedPatch = removeNoOps({ a: ['X', 'Y'] }, patch);
    assert.equal([{ "op": "replace", "path": "/a/1", "value": "B" }], mergedPatch);
});

test('(indexed) replace A + remove -> remove', () => {
    let patch = [
        { "op": "replace", "path": "/a/1", "value": "A" },
        { "op": "remove", "path": "/a/1" }
    ];
    let mergedPatch = removeNoOps({ a: ['X', 'Y'] }, patch);
    assert.equal([{ "op": "remove", "path": "/a/1" }], mergedPatch);

    patch = [
        { "op": "replace", "path": "/a/1", "value": "A" },
        { "op": "add", "path": "/a/2", "value": "B" },
        { "op": "remove", "path": "/a/1" }
    ];
    mergedPatch = removeNoOps({ a: ['X', 'Y'] }, patch);
    assert.equal([
        { "op": "add", "path": "/a/2", "value": 'B' },
        { "op": "remove", "path": "/a/1" }], mergedPatch);
});

test('(indexed) add A + replace B -> add B', () => {
    const patch = [
        { "op": "add", "path": "/a/1", "value": "A" },
        { "op": "replace", "path": "/a/1", "value": "B" }
    ];
    const mergedPatch = removeNoOps({ a: ['X', 'Y'] }, patch);
    assert.equal([
        { "op": "add", "path": "/a/1", "value": 'B' }
    ], mergedPatch);
});

test('(indexed) add A + remove -> NoOp', () => {
    const patch = [
        { "op": "add", "path": "/a/1", "value": "A" },
        { "op": "remove", "path": "/a/1" }
    ];
    const mergedPatch = removeNoOps({ a: ['X', 'Y'] }, patch);
    assert.equal([], mergedPatch);
});

test('(indexed) add A + remove -> NoOp', () => {
    const patch = [
        { "op": "add", "path": "/a/1", "value": 1 },
        { "op": "add", "path": "/a/1", "value": 2 },
        { "op": "remove", "path": "/a/2" }
    ];
    const mergedPatch = removeNoOps({ a: ['X'] }, patch);
    const expected = [
        { "op": "add", "path": "/a/1", "value": 2 }
    ];
    assert.equal(expected, mergedPatch);
});


test('prefix', () => {
    const patch = [
        { "op": "add", "path": "/a/1", "value": 1 },
        { "op": "remove", "path": "/a" }
    ];
    const mergedPatch = removeNoOps({ a: ['X'] }, patch);
    assert.equal([{ "op": "remove", "path": "/a" }], mergedPatch);
});

test('add + add', () => {
    const patch = [
        { "op": "add", "path": "/a", "value": [] },
        { "op": "add", "path": "/a/0", "value": 13 }
    ];
    const mergedPatch = removeNoOps({}, patch);
    const expected = [
        { "op": "add", "path": "/a", "value": [] },
        { "op": "add", "path": "/a/0", "value": 13 }
    ];
    assert.equal(expected, mergedPatch);
});

test('add + add + add', () => {
    const patch = [
        { "op": "add", "path": "/a", "value": [] },
        { "op": "add", "path": "/a/0", "value": 13 },
        { "op": "add", "path": "/a/0/b", "value": 14 }
    ];
    const mergedPatch = removeNoOps({}, patch);
    const expected = [
        { "op": "add", "path": "/a", "value": [] },
        { "op": "add", "path": "/a/0", "value": 13 },
        { "op": "add", "path": "/a/0/b", "value": 14 }
    ];
    assert.equal(expected, mergedPatch);
});

test('replace', () => {
    const patch = [
        { "op": "replace", "path": "/a/0/b", "value": 14 }
    ];
    const mergedPatch = removeNoOps({ a: [{ b: 13 }] }, patch);
    assert.equal(mergedPatch, [{ "op": "replace", "path": "/a/0/b", "value": 14 }]);
});

test('add + replace', () => {
    const patch = [
        { "op": "add", "path": "/a/0", "value": { b: 13 } },
        { "op": "replace", "path": "/a/0/b", "value": 14 }
    ];
    const mergedPatch = removeNoOps({ a: [] }, patch);
    assert.equal(mergedPatch, [
        { "op": "add", "path": "/a/0", "value": { b: 13 } },
        { "op": "replace", "path": "/a/0/b", "value": 14 }
    ]);
});

test('misc', () => {
    const doc = { storage: { dischargeMax: [0, 1, 2] } };
    const patch = [
        {
            "op": "remove",
            "path": "/storage/dischargeMax/1"
        },
        {
            "op": "remove",
            "path": "/storage/dischargeMax/0"
        },
        {
            "op": "remove",
            "path": "/storage/dischargeMax"
        },
        {
            "op": "add",
            "path": "/storage/dischargeMax",
            "value": [
                null
            ]
        },
        {
            "op": "replace",
            "path": "/storage/dischargeMax/0",
            "value": {}
        },
        {
            "op": "add",
            "path": "/storage/dischargeMax/0/start",
            "value": "2020-12-03T00:00:00+01:00"
        },
        {
            "op": "add",
            "path": "/storage/dischargeMax/0/end",
            "value": "2044-01-01T01:00:00+01:00"
        },
        {
            "op": "add",
            "path": "/storage/dischargeMax/0/value",
            "value": 1
        }
    ];

    const expected = patch;
    const mergedPatch = removeNoOps(doc, patch);
    assert.equal(mergedPatch, expected);

});

function success(tc) {
    const [mergedDoc, _] = merge(tc.doc, tc.patch);
    assert.equal(mergedDoc, tc.expected);
}

function failure(tc) {
    try {
        merge(tc.doc, tc.patch);
    } catch (e) {
        // console.error(e);
        assert.equal(e.message, tc.error.split('--')[0].trim());
        return
    }
    throw Error(`Expected error: ${tc.error}`)
}

function runJsonPatchTests(testCases) {
    foo: for (const tc of testCases) {
        for (const op of tc.patch) {
            if (['add', 'replace', 'remove'].indexOf(op.op) == -1) {
                log(`Skipping ${tc.comment}`)
                continue foo;
            } else if (op.path && op.path.endsWith('-')) {
                log(`Skipping ${tc.comment}`)
                continue foo;
            }
        }

        if ('expected' in tc) {
            test(tc.comment, () => { success(tc) })
        } else if ('error' in tc) {
            test(tc.comment, () => { failure(tc) })
        } else {
            throw Error('test case must contain "expected" or "error" property');
        }
    }
}

runJsonPatchTests(testCasesA);
runJsonPatchTests(testCasesB);
