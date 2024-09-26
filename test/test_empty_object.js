import { test, assert } from './utils.js'
import { createFormChen } from '../formchen/webcomponent.js'
import { TransactionManager } from "../formchen/utils.js";
import { GridChen } from "../formchen/gridchen/webcomponent.js";


test('Empty Object one Level', (test_name) => {
    const schema = {
        type: 'object',
        properties: {
            foo: {
                type: 'string'
            }
        }
    };

    const container = document.getElementById(test_name);
    const tm = new TransactionManager();
    const fc = createFormChen(container, schema, null, tm);

    let input = /** @type{HTMLInputElement} */ (container.querySelector(`[data-path="/foo"]`).querySelector('.data-value'));

    input.value = 'foo';
    input.onchange(null);
    let expected = [
        { op: 'add', path: "", value: {} },
        { op: 'add', path: "/foo", value: "foo" }
    ];

    assert.equal(expected, tm.patch);
    assert.equal({ foo: 'foo' }, fc.value);

    input.value = 'foobar';
    input.onchange(null);
    expected.push({ op: 'replace', path: "/foo", value: "foobar", oldValue: 'foo' });
    assert.equal(expected, tm.patch);
    assert.equal({ foo: 'foobar' }, fc.value);
});

test('Empty Object two Levels', (test_name) => {
    const schema = {
        type: 'object',
        properties: {
            foo: {
                type: 'string'
            },
            bar: {
                type: 'object',
                properties: {
                    foobar: {
                        type: 'string'
                    }
                }
            }
        }
    };

    const container = document.getElementById(test_name);
    const tm = new TransactionManager();
    const fc = createFormChen(container, schema, null, tm);

    let fooInput = /** @type{HTMLInputElement} */ (container.querySelector(`[data-path="/foo"]`).querySelector('.data-value'));
    let foobarInput = /** @type{HTMLInputElement} */ (container.querySelector(`[data-path="/bar/foobar"]`).querySelector('.data-value'));

    foobarInput.value = 'bar';
    foobarInput.onchange(null);
    let expected = [
        { op: 'add', path: "", value: {} },
        { op: 'add', path: "/bar", value: {} },
        { op: 'add', path: "/bar/foobar", value: "bar" }
    ];
    assert.equal(expected, tm.patch);
    assert.equal({ bar: { foobar: 'bar' } }, fc.value);

    foobarInput.value = 'foobar';
    foobarInput.onchange(null);
    expected.push({ op: 'replace', path: "/bar/foobar", value: "foobar", "oldValue": "bar" });
    assert.equal(expected, tm.patch);
    assert.equal({ bar: { foobar: 'foobar' } }, fc.value);

    fooInput.value = 'foo';
    fooInput.onchange(null);
    expected.push({ op: 'add', path: "/foo", value: "foo" });
    assert.equal(expected, tm.patch);
    assert.equal({ bar: { foobar: 'foobar' }, foo: 'foo' }, fc.value);
});

test('Delete', (test_name) => {
    const schema = {
        type: 'object',
        properties: {
            foo: {
                type: 'string'
            },
            bar: {
                type: 'object',
                properties: {
                    foobar: {
                        type: 'string'
                    }
                }
            }
        }
    };

    const container = document.getElementById(test_name);
    const tm = new TransactionManager();
    const fc = createFormChen(container, schema, { bar: { foobar: 'foobar' } }, tm);

    let foobarInput = /** @type{HTMLInputElement} */ (container.querySelector(`[data-path="/bar/foobar"]`).querySelector('.data-value'));
    foobarInput.value = '';
    foobarInput.onchange(null);
    let expected = [
        { op: 'remove', path: "/bar/foobar", oldValue: "foobar" },
        { op: 'remove', path: "/bar", oldValue: {} },
        { op: 'remove', path: "", oldValue: {} },
    ];
    assert.equal(expected, tm.patch);
    assert.equal(undefined, fc.value);
});

test('Delete subtree', (test_name) => {
    const schema = {
        type: 'object',
        properties: {
            foo: {
                type: 'string'
            },
            bar: {
                type: 'object',
                properties: {
                    foobar: {
                        type: 'string'
                    }
                }
            }
        }
    };

    const container = document.getElementById(test_name);
    const tm = new TransactionManager();
    const fc = createFormChen(container, schema, { bar: { foobar: 'foobar' } }, tm);

    let fooInput = /** @type{HTMLInputElement} */ (container.querySelector(`[data-path="/foo"]`).querySelector('.data-value'));
    let foobarInput = /** @type{HTMLInputElement} */ (container.querySelector(`[data-path="/bar/foobar"]`).querySelector('.data-value'));

    fc.getNodeById('/bar').setValue(undefined);
    assert.equal('', foobarInput.value);

    fc.getNodeById('/foo').setValue(undefined);
    assert.equal('', fooInput.value);
    assert.equal(undefined, fc.value);
});

test('Empty object with grid', (test_name) => {
    const schema = {
        definitions: {
            "measurements": {
                title: 'Measurements',
                type: 'array',
                format: 'grid',
                items: {
                    type: 'array',
                    items: [  // tuple schema
                        { title: 'TimeStamp', width: 200, type: 'string', format: 'date-time' },
                        { title: 'Age [d]', width: 100, type: 'number' },
                        { title: 'Weight [g]', width: 100, type: 'number' }
                    ]
                }
            }
        },
        type: 'object',
        properties: {
            foo: {
                type: 'array',
                $ref: '#/definitions/measurements'
            }
        }
    };

    const container = document.getElementById(test_name);
    const tm = new TransactionManager();
    const fc = createFormChen(container, schema, null, tm);

    const gc = /** @type{GridChen} */ (container.querySelector(`[data-path="/foo"]`).querySelector('.data-value'));

    gc._click(0, 0);  // NoOp because cell 0,0 is selected by default.
    gc._sendKeys('2020-01-01 00:00Z');
    gc._keyboard('keydown', { code: 'Enter' });
    gc._sendKeys('2020-01-02 00:00Z');
    gc._keyboard('keydown', { code: 'Enter' });

    let value = fc.value;
    assert.equal({ foo: [['2020-01-01T01:00+01:00'], ['2020-01-02T01:00+01:00']] }, value);

    let patch = tm.patch;
    // We do not have a contract of how the patch is laid out, unfortunately.
    let expected = [
        {
            "op": "add", "path": "",
            "value": {}
        },
        {
            "op": "add",
            "path": "/foo",
            "value": [
                [
                    "2020-01-01T01:00+01:00"
                ],
                [
                    "2020-01-02T01:00+01:00"
                ]
            ]
        },
        {
            "op": "add",
            "path": "/foo/1",
            "value": null
        },
        {
            "op": "replace",
            "path": "/foo/1",
            "value": [
                null
            ],
            "oldValue": null
        },
        {
            "op": "replace",
            "path": "/foo/1/0",
            "value": "2020-01-02T01:00+01:00",
            "oldValue": null
        }
    ];

    assert.equal(patch, expected);

    gc._click(1, 0);
    gc._keyboard('keydown', { code: 'Delete' });
    patch = tm.patch;

    assert.equal(patch[5], {
        "op": "replace",
        "path": "/foo/1/0",
        "value": null,
        "oldValue": "2020-01-02T01:00+01:00"
    });

    assert.equal(patch[6], {
        "op": "remove",
        "path": "/foo/1",
        "oldValue": [
            null
        ]
    });

    value = fc.value;
    assert.equal(value, { "foo": [["2020-01-01T01:00+01:00"]] });

    tm.undo();
    value = fc.value;
    assert.equal(value, { "foo": [["2020-01-01T01:00+01:00"], ["2020-01-02T01:00+01:00"]] });

    tm.redo();
    value = fc.value;
    assert.equal(value, { "foo": [["2020-01-01T01:00+01:00"]] });

    tm.undo();
    value = fc.value;
    assert.equal(value, { "foo": [["2020-01-01T01:00+01:00"], ["2020-01-02T01:00+01:00"]] });

    tm.undo();
    value = fc.value;
    assert.equal(value, { "foo": [["2020-01-01T01:00+01:00"]] });

    gc._click(0, 0);
    gc._keyboard('keydown', { code: 'Delete' });
    value = fc.value;
    assert.equal(value, undefined);
});

