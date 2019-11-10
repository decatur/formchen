import {test, assert} from './grid-chen/utils.js'
import {createFormChen} from '../form-chen/webcomponent.js'
import * as u from "../grid-chen/utils.js";

const container = document.createElement('div');
container.dataset.path = '';
document.body.appendChild(container);

test('Empty Object one Level', () => {
    const schema = {
        type: 'object',
        properties: {
            foo: {
                type: 'string'
            }
        }
    };

    container.textContent = '';
    const fc = createFormChen(schema, undefined);
    const tm = u.globalTransactionManager;

    function* inputGenerator() {
        const inputs = Array.from(container.getElementsByTagName('input'));
        for (const input of inputs) yield input;
    }

    const inputs = inputGenerator();
    const nextInput = () => inputs.next().value;

    let input;
    input = nextInput();

    input.value = 'foo';
    input.onchange(null);
    let expected = [
        {op: 'add', path: "", value: {}},
        {op: 'add', path: "/foo", value: "foo"}
    ];

    assert.equal(expected, tm.patch);
    assert.equal({foo: 'foo'}, fc.value);

    input.value = 'foobar';
    input.onchange(null);
    expected.push({op: 'replace', path: "/foo", value: "foobar", oldValue: 'foo'});
    assert.equal(expected, tm.patch);
    assert.equal({foo: 'foobar'}, fc.value);
});

test('Empty Object two Levels', () => {
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

    container.textContent = '';
    const fc = createFormChen(schema, undefined);
    const tm = u.globalTransactionManager;

    function* inputGenerator() {
        const inputs = Array.from(container.getElementsByTagName('input'));
        for (const input of inputs) yield input;
    }

    const inputs = inputGenerator();
    const nextInput = () => inputs.next().value;

    let fooInput = nextInput();
    let foobarInput = nextInput();

    foobarInput.value = 'bar';
    foobarInput.onchange(null);
    let expected = [
        {op: 'add', path: "", value: {}},
        {op: 'add', path: "/bar", value: {}},
        {op: 'add', path: "/bar/foobar", value: "bar"}
    ];
    assert.equal(expected, tm.patch);
    assert.equal({bar: {foobar: 'bar'}}, fc.value);

    foobarInput.value = 'foobar';
    foobarInput.onchange(null);
    expected.push({op: 'replace', path: "/bar/foobar", value: "foobar", "oldValue":"bar"});
    assert.equal(expected, tm.patch);
    assert.equal({bar: {foobar: 'foobar'}}, fc.value);

    fooInput.value = 'foo';
    fooInput.onchange(null);
    expected.push({op: 'add', path: "/foo", value: "foo"});
    assert.equal(expected, tm.patch);
    assert.equal({bar: {foobar: 'foobar'}, foo: 'foo'}, fc.value);
});

test('delete', () => {
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

    container.textContent = '';
    const fc = createFormChen(schema, {bar:{foobar:'foobar'}});
    const tm = u.globalTransactionManager;

    function* inputGenerator() {
        const inputs = Array.from(container.getElementsByTagName('input'));
        for (const input of inputs) yield input;
    }

    const inputs = inputGenerator();
    const nextInput = () => inputs.next().value;

    let fooInput = nextInput();
    let foobarInput = nextInput();

    foobarInput.value = '';
    foobarInput.onchange(null);
    let expected = [
        {op: 'remove', path: "/bar/foobar", oldValue: "foobar"},
        {op: 'remove', path: "/bar", oldValue: {}},
        {op: 'remove', path: "", oldValue: {}},
    ];
    assert.equal(expected, tm.patch);
    assert.equal(undefined, fc.value);
});

test('delete subtree', () => {
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

    container.textContent = '';
    const fc = createFormChen(schema, {bar:{foobar:'foobar'}});
    const tm = u.globalTransactionManager;

    function* inputGenerator() {
        const inputs = Array.from(container.getElementsByTagName('input'));
        for (const input of inputs) yield input;
    }

    const inputs = inputGenerator();
    const nextInput = () => inputs.next().value;

    let fooInput = nextInput();
    let foobarInput = nextInput();

    fc.getNode('/bar').setValue(undefined);
    assert.equal('', foobarInput.value);

    fc.getNode('/foo').setValue(undefined);
    assert.equal('', fooInput.value);
    assert.equal(undefined, fc.value);
});

test('Empty object with grid', () => {
    const schema = {
        definitions: {
            "measurements": {
                title: 'Measurements',
                type: 'array',
                items: {
                    type: 'array',
                    items: [  // tuple schema
                        {title: 'TimeStamp', width: 200, type: 'string', format: 'date-time'},
                        {title: 'Age [d]', width: 100, type: 'number'},
                        {title: 'Weight [g]', width: 100, type: 'number'}
                    ]
                }
            }
        },
        type: 'object',
        properties: {
            foo: {
                type: 'string',
                $ref: '#/definitions/measurements'
            }
        }
    };

    container.textContent = '';
    const fc = createFormChen(schema, undefined);
    const tm = u.globalTransactionManager;

    const gc = document.querySelector('grid-chen');
    gc._click(0, 0);  // NoOp because cell 0,0 is selected by default.
    gc._sendKeys('2020-01-01 00:00Z');
    gc._keyboard('keydown', {code: 'Enter'});

    let value = fc.value;
    assert.equal({foo:[['2020-01-01T01:00+01:00']]}, value);

    let patch = tm.patch;
    assert.equal({op: 'add', path: "", value: {}}, patch[0]);
    assert.equal({op: 'add', path: "/foo", value:[['2020-01-01T01:00+01:00']]}, patch[1]);
    assert.equal(2, patch.length);
    //assert.equal({op: 'replace', path: "/foo/0", value: Array(1), oldValue: null}, patch[2]);
    //assert.equal({op: 'replace', path: "/foo/0/0", value: "2020-01-01T01:00+01:00", oldValue: null}, patch[3]);

    gc._click(0, 0);
    gc._keyboard('keydown', {code: 'Delete'});
    patch = tm.patch;
    assert.equal({op: 'replace', path: "/foo/0/0", value: null, oldValue: "2020-01-01T01:00+01:00"}, patch[2]);
    assert.equal({op: 'remove', path: "/foo/0", oldValue: Array(1)}, patch[3]);
    assert.equal({op: 'remove', path: "/foo", oldValue: Array(0)}, patch[4]);
    assert.equal({op: 'remove', path: "", "oldValue":{}}, patch[5]);

    value = fc.value;
    assert.equal(undefined, value);

    tm.undo();
    value = fc.value;
    assert.equal({foo:[['2020-01-01T01:00+01:00']]}, value);

    tm.redo();
    value = fc.value;
    assert.equal(undefined, value);

    tm.undo();
    value = fc.value;
    assert.equal({foo:[['2020-01-01T01:00+01:00']]}, value);

    tm.undo();
    value = fc.value;
    assert.equal(undefined, value);
});

