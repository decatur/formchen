import {test, assert} from './utils.js'
import {createFormChen} from '../modules/FormChen.js'
import {schema, data} from '../demos/sample2.mjs'

const patchesByPath = {};

function changeHandler(pointer, newValue) {
    const path = '/' + pointer.join('/');
    patchesByPath[path] = newValue;
}


test('FormChen', () => {
    createFormChen(schema, data, document.body, changeHandler);

    const expected = [];

    const inputs = Array.from(document.getElementsByTagName('input'));
    const selects = Array.from(document.getElementsByTagName('select'));
    let inputCount = 0;
    function nextInput() {
        return inputs[inputCount++]
    }

    let input;
    input = nextInput();
    input.value = 'foo';
    input.onchange(null);
    input.value = 'bar';
    input.onchange(null);
    expected.push({"op": "replace", "path": "/someString", "value": "bar"});

    input = nextInput();
    input.value = 'ftp://bar';
    input.onchange(null);
    expected.push({"op": "replace", "path": "/someURI", "value": "ftp://bar"});

    /** @type{HTMLSelectElement} */
    let select = selects[0];
    select.selectedIndex = 1; //inputs[2].value = 'Tilda Swift';
    select.onchange(null);
    expected.push({"op": "replace", "path": "/someEnum", "value": "Tilda Swift"});

    input = nextInput();
    input.value = '2020-01-01';
    input.onchange(null);
    expected.push({"op": "replace", "path": "/someDate", "value": new Date(Date.UTC(2020, 0, 1))});

    input = nextInput();
    input.value = '2020-01-01T00:00Z';
    input.onchange(null);
    expected.push({"op": "replace", "path": "/someDateTime", "value": new Date('2020-01-01T00:00Z')});

    input = nextInput();
    input.value = '2020-01-01T00:00';
    input.onchange(null);
    expected.push({"op": "replace", "path": "/someDateTimeLocal", "value": new Date('2020-01-01')});

    input = nextInput();
    input.checked = false;
    input.onchange(null);
    expected.push({"op": "replace", "path": "/someBoolean", "value": false});

    input = nextInput();
    input.value = '13';
    input.onchange(null);
    expected.push({"op": "replace", "path": "/someInteger", "value": 13});

    input = nextInput();
    input.value = '3,15';
    input.onchange(null);
    expected.push({"op": "replace", "path": "/someFloat", "value": 3.15});

    input = nextInput();
    input.value = '60';
    input.onchange(null);
    expected.push({"op": "replace", "path": "/somePercentValue", "value": 0.6});

    const actual = Object.entries(patchesByPath).map(([path, value]) => ({op: 'replace', path: path, value: value}));
    assert.equal(expected, actual);
}).finally();

