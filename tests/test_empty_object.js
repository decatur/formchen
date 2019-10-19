import {test, assert} from './grid-chen/utils.js'
import {createFormChen} from '../form-chen/webcomponent.js'

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
    const tm = fc.transactionManager;

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
        {"op": "add", "path": "", "value": {}},
        {"op": "add", "path": "/foo", "value": "foo"}
    ];

    assert.equal(expected, tm.patch);
    assert.equal({foo: 'foo'}, fc.value);

    input.value = 'foobar';
    input.onchange(null);
    expected.push({"op": "replace", "path": "/foo", "value": "foobar", oldValue: 'foo'})
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
    const tm = fc.transactionManager;

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
        {"op": "add", "path": "", "value": {}},
        {"op": "add", "path": "/bar", "value": {}},
        {"op": "add", "path": "/bar/foobar", "value": "bar"}
    ];
    assert.equal(expected, tm.patch);
    assert.equal({bar: {foobar: 'bar'}}, fc.value);

    foobarInput.value = 'foobar';
    foobarInput.onchange(null);
    expected.push({"op": "replace", "path": "/bar/foobar", "value": "foobar", "oldValue":"bar"})
    assert.equal(expected, tm.patch);
    assert.equal({bar: {foobar: 'foobar'}}, fc.value);

    fooInput.value = 'foo';
    fooInput.onchange(null);
    expected.push({"op": "add", "path": "/foo", "value": "foo"});
    assert.equal(expected, tm.patch);
    assert.equal({bar: {foobar: 'foobar'}, foo: 'foo'}, fc.value);
});

