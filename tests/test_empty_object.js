import {test, assert} from './utils.js'
import {createFormChen} from '/modules/FormChen/webcomponent.js'

test('Empty Object one Level', () => {
    const schema = {
        type: 'object',
        properties: {
            foo: {
                type: 'string'
            }
        }
    };
    const container = document.createElement('div');
    const fc = createFormChen(schema, undefined, container);

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
        {"op": "add", "path": "/", "value": {}},
        {"op": "add", "path": "/foo", "value": "foo"}
    ];
    assert.equal(expected, fc.getPatches());
    assert.equal({foo: 'foo'}, fc.value);

    input.value = 'foobar';
    input.onchange(null);
    expected.push({"op": "replace", "path": "/foo", "value": "foobar"})
    assert.equal(expected, fc.getPatches());
    assert.equal({foo: 'foobar'}, fc.value);
}).finally();

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

    const container = document.createElement('div');
    const fc = createFormChen(schema, undefined, container);

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
        {"op": "add", "path": "/", "value": {}},
        {"op": "add", "path": "/bar", "value": {}},
        {"op": "add", "path": "/bar/foobar", "value": "bar"}
    ];
    assert.equal(expected, fc.getPatches());
    assert.equal({bar: {foobar: 'bar'}}, fc.getValue());

    foobarInput.value = 'foobar';
    foobarInput.onchange(null);
    expected.push({"op": "replace", "path": "/bar/foobar", "value": "foobar"})
    assert.equal(expected, fc.getPatches());
    assert.equal({bar: {foobar: 'foobar'}}, fc.getValue());

    fooInput.value = 'foo';
    fooInput.onchange(null);
    expected.push({"op": "add", "path": "/foo", "value": "foo"});
    assert.equal(expected, fc.getPatches());
    assert.equal({bar: {foobar: 'foobar'}, foo: 'foo'}, fc.getValue());
}).finally();

