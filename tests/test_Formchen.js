import {test, assert} from './utils.js'
import {createFormChen} from '../modules/FormChen/FormChen.js'
import {schema, data} from '../demos/sample2.mjs'

test('FormChen', () => {
    const fc = createFormChen(schema, data, document.body);

    const expected = [];


    const selects = Array.from(document.getElementsByTagName('select'));

    function *inputGenerator() {
        const inputs = Array.from(document.getElementsByTagName('input'));
        for (const input of inputs) yield input;
    }
    const inputs = inputGenerator();
    const nextInput = () => inputs.next().value;

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
    expected.push({"op": "replace", "path": "/someDatePartialTime", "value": new Date('2020-01-01')});

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

    function dispatchKey(gc, eventInitDict) {
        // Note that the active element will change from the grid to the input and back.
        gc.shadowRoot.activeElement.dispatchEvent(new KeyboardEvent('keydown', eventInitDict));
    }

    const gc = document.querySelector('grid-chen');
    (/**@type{HTMLElement}*/ gc.shadowRoot.firstElementChild).focus();
    //dispatchMouseDown(gc);
    dispatchKey(gc, {key:" "});
    gc.shadowRoot.activeElement.value = '1900';
    dispatchKey(gc, {code: 'Enter'});
    expected.push({"op":"replace","path":"/someMatrix","value":
            [["1900-01-01T00:00:00.000Z",0,0],["2019-03-01T23:00:00.000Z",1,2],["2019-03-02T23:00:00.000Z",2,4]]
    });

    assert.equal(expected, fc.getPatches());
}).finally();

