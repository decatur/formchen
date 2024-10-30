import { test, assert, log } from './utils.js'
import { dispense, merge, Path } from "../formchen/json_patch_squash.js";
import { testCases } from "../json-patch-tests/spec_tests.js"
import { testCases as testCasesB } from "../json-patch-tests/tests.js"

log('\x1B[41;93;4m####### Loading test/test_json_patch_merge.js')

test('Path', () => {
    let path = new Path('/a/b');
    assert.false(path.isArray());
    assert.true(path.equals(new Path('/a/b')));
    assert.false(path.equals(new Path('/a/b/c')));
    assert.false(path.equals(new Path('/a')));

    path = new Path('/a/1');
    assert.true(path.isArray());
    assert.equal(path.index(), 1);

    assert.true(path.sameArray(path));
    assert.true(path.sameArray(new Path('/a/0')));
    assert.true(path.sameArray(new Path('/a/2/b')));
    assert.true(path.sameArray(new Path('/a/2/b/3')));
    assert.false(path.sameArray(new Path('/b/2')));

    assert.equal(path.indices(new Path('/a/2/b/3')), [1, 2]);

    assert.true(new Path('/a/1/b/3').startsWith(path));
    assert.false(new Path('/a/2/b/3').startsWith(path));

    path = new Path('/a/2/b/3');
    path.increment(2);
    assert.true(path.equals(new Path('/a/3/b/3')));
    path.decrement(4);
    assert.true(path.equals(new Path('/a/3/b/2')));

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

test('replace A + replace B -> replace B', () => {
    const patch = [
        { "op": "replace", "path": "/a/b", "value": "A" },
        { "op": "replace", "path": "/a/b", "value": "B" }
    ];
    const mergedPatch = dispense({ a: { b: 2 } }, patch);
    assert.equal([{ "op": "replace", "path": "/a/b", "value": "B" }], mergedPatch);
});

test('replace A + remove -> remove', () => {
    const patch = [
        { "op": "replace", "path": "/a/b", "value": "A" },
        { "op": "remove", "path": "/a/b" }
    ];
    const mergedPatch = dispense({ a: { b: 2 } }, patch);
    assert.equal([{ "op": "remove", "path": "/a/b" }], mergedPatch);
});

test('replace A + replace B + remove', () => {
    const patch = [
        { "op": "replace", "path": "/a/b", "value": "A" },
        { "op": "replace", "path": "/a/c", "value": "B" },
        { "op": "remove", "path": "/a" }
    ];
    const mergedPatch = dispense({ a: { b: 'C', c: 'D' } }, patch);
    assert.equal([{ "op": "remove", "path": "/a" }], mergedPatch);
});

test('add A + replace B -> add B', () => {
    let patch = [
        { "op": "add", "path": "/a/b", "value": "A" },
        { "op": "replace", "path": "/a/b", "value": "B" }
    ];
    let mergedPatch = dispense({ a: {} }, patch);
    assert.equal([{ "op": "add", "path": "/a/b", "value": "B" }], mergedPatch);

    patch = [
        { "op": "add", "path": "/a/b", "value": "A" },
        { "op": "add", "path": "/a/c", "value": "A" },
        { "op": "replace", "path": "/a", "value": "B" }
    ];
    mergedPatch = dispense({ a: {} }, patch);
    assert.equal([{ "op": "replace", "path": "/a", "value": "B" }], mergedPatch);
});

test('add A + remove -> NoOp', () => {
    const patch = [
        { "op": "add", "path": "/a/b", "value": "A" },
        { "op": "remove", "path": "/a/b" }
    ];
    const mergedPatch = dispense({ a: {} }, patch);
    assert.equal([], mergedPatch);
});

test('add A + remove -> NoOp', () => {
    const patch = [
        { "op": "add", "path": "/a/2", "value": "A" },
        { "op": "add", "path": "/a/1", "value": "B" },
        { "op": "remove", "path": "/a/1" }
    ];
    const mergedPatch = dispense({ a: ['X', 'Y'] }, patch);
    assert.equal(mergedPatch, [{ "op": "add", "path": "/a/2", "value": "A" }]);
});

test('(indexed) replace A + replace B -> replace B', () => {
    const patch = [
        { "op": "replace", "path": "/a/1", "value": "A" },
        { "op": "replace", "path": "/a/1", "value": "B" }
    ];
    const mergedPatch = dispense({ a: ['X', 'Y'] }, patch);
    assert.equal([{ "op": "replace", "path": "/a/1", "value": "B" }], mergedPatch);
});

test('(indexed) replace A + remove -> remove', () => {
    let patch = [
        { "op": "replace", "path": "/a/1", "value": "A" },
        { "op": "remove", "path": "/a/1" }
    ];
    let mergedPatch = dispense({ a: ['X', 'Y'] }, patch);
    assert.equal([{ "op": "remove", "path": "/a/1" }], mergedPatch);

    patch = [
        { "op": "replace", "path": "/a/1", "value": "A" },
        { "op": "add", "path": "/a/2", "value": "B" },
        { "op": "remove", "path": "/a/1" }
    ];
    mergedPatch = dispense({ a: ['X', 'Y'] }, patch);
    assert.equal([
        { "op": "add", "path": "/a/2", "value": 'B' },
        { "op": "remove", "path": "/a/1" }], mergedPatch);
});

test('(indexed) add A + replace B -> add B', () => {
    const patch = [
        { "op": "add", "path": "/a/1", "value": "A" },
        { "op": "replace", "path": "/a/1", "value": "B" }
    ];
    const mergedPatch = dispense({ a: ['X', 'Y'] }, patch);
    assert.equal([
        { "op": "add", "path": "/a/1", "value": 'B' }
    ], mergedPatch);
});

test('(indexed) add A + remove -> NoOp', () => {
    const patch = [
        { "op": "add", "path": "/a/1", "value": "A" },
        { "op": "remove", "path": "/a/1" }
    ];
    const mergedPatch = dispense({ a: ['X', 'Y'] }, patch);
    assert.equal([], mergedPatch);
});

test('(indexed) add A + remove -> NoOp', () => {
    const patch = [
        { "op": "add", "path": "/a/1", "value": 1 },
        { "op": "add", "path": "/a/1", "value": 2 },
        { "op": "remove", "path": "/a/2" }
    ];
    const mergedPatch = dispense({ a: ['X'] }, patch);
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
    const mergedPatch = dispense({ a: ['X'] }, patch);
    assert.equal([{ "op": "remove", "path": "/a" }], mergedPatch);
});

test('add + add', () => {
    const patch = [
        { "op": "add", "path": "/a", "value": [] },
        { "op": "add", "path": "/a/0", "value": 13 }
    ];
    const mergedPatch = dispense({}, patch);
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
    const mergedPatch = dispense({}, patch);
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
    const mergedPatch = dispense({ a: [{ b: 13 }] }, patch);
    assert.equal(mergedPatch, [{ "op": "replace", "path": "/a/0/b", "value": 14 }]);
});

test('add + replace', () => {
    const patch = [
        { "op": "add", "path": "/a/0", "value": { b: 13 } },
        { "op": "replace", "path": "/a/0/b", "value": 14 }
    ];
    const mergedPatch = dispense({ a: [] }, patch);
    assert.equal(mergedPatch, [
        { "op": "add", "path": "/a/0", "value": { b: 13 } },
        { "op": "replace", "path": "/a/0/b", "value": 14 }
    ]);
});

test('misc', () => {
    const doc = { storage: { dischargeMax: [0, 1, 2] } };
    const patch = [
        {
            "op": "remove",  // dispensable
            "path": "/storage/dischargeMax/1"
        },
        {
            "op": "remove",  // dispensable
            "path": "/storage/dischargeMax/0"
        },
        {
            "op": "remove",  // dispensable
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
    const mergedPatch = dispense(doc, patch);
    assert.equal(mergedPatch, expected);

});

test("4.1. add with missing object", () => {
    const tc = {
        "comment": "4.1. add with missing object",
        "doc": { "q": { "bar": 2 } },
        "patch": [{ "op": "add", "path": "/a/b", "value": 1 }],
        "error":
            "path /a does not exist -- missing objects are not created recursively"
    };

    try {
        dispense(tc.doc, tc.patch);
    } catch (e) {
        assert.equal(e.message, tc.error.split('--')[0].trim());
    }
});

test("A.1.  Adding an Object Member", () => {
    const tc = {
        "comment": "A.1.  Adding an Object Member",
        "doc": {
            "foo": "bar"
        },
        "patch": [
            { "op": "add", "path": "/baz", "value": "qux" }
        ],
        "expected": {
            "baz": "qux",
            "foo": "bar"
        }
    };

    const [mergedDoc, _] = merge(tc.doc, tc.patch);
    assert.equal(mergedDoc, tc.expected);

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
        log(e.message);
        assert.equal(e.message, tc.error.split('--')[0].trim());
        return
    }
    throw Error(`Expected error: ${tc.error}`)
}

function bar(testCases) {
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
            throw Error();
        }
    }
}

bar(testCases);
bar(testCasesB);
