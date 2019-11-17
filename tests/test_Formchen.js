//@ts-check

import { test, assert } from './grid-chen/utils.js'
import { createFormChen } from '../form-chen/webcomponent.js'
import { schema, data } from '../demos/sample2.mjs'
import * as u from "../grid-chen/utils.js";

const container = document.createElement('div');
container.id = '/sample2';
document.body.appendChild(container);

test('atomic', () => {
    const fc = createFormChen({ type: 'string' }, 'foobar');
    assert.equal('foobar', fc.value)
})

test('FormChen', () => {
    const fc = createFormChen(schema, data);
    const tm = u.globalTransactionManager;

    //const selects = Array.from(document.getElementsByTagName('select'));

    // function *inputGenerator() {
    //     const inputs = Array.from(document.getElementsByTagName('input'));
    //     for (const input of inputs) yield input;
    // }
    // const inputs = inputGenerator();
    // const nextInput = () => inputs.next().value;

    /** @type{HTMLInputElement} */
    let input;

    input = /** @type{HTMLInputElement} */ (document.getElementById('/sample2/someString'));
    assert.equal('Rubus idaeus', input.value);
    input.value = 'foo';
    input.onchange(null);
    assert.equal({ op: "replace", path: "/sample2/someString", value: "foo", oldValue: 'Rubus idaeus' }, tm.patch.pop());
    input.value = 'bar';
    input.onchange(null);
    assert.equal({ op: "replace", path: "/sample2/someString", value: "bar", oldValue: 'foo' }, tm.patch.pop());

    input = /** @type{HTMLInputElement} */ (document.getElementById('/sample2/someURI'));
    input.value = 'ftp://bar';
    input.onchange(null);
    assert.equal({ op: "replace", path: "/sample2/someURI", value: "ftp://bar", oldValue: 'https://en.wikipedia.org/wiki/Rubus_idaeus' }, tm.patch.pop());

    /** @type{HTMLSelectElement} */
    let select = /** @type{HTMLSelectElement} */ (document.getElementById('/sample2/someEnum'));
    assert.equal(2, select.selectedIndex);
    select.selectedIndex = 1;
    select.onchange(null);
    assert.equal({ op: "replace", path: "/sample2/someEnum", value: "Tilda Swift", oldValue: 'Mona Lisa' }, tm.patch.pop());

    input = /** @type{HTMLInputElement} */ (document.getElementById('/sample2/someDate'));
    assert.equal('2019-01-01', input.value);
    input.value = '2020-01-01';
    input.onchange(null);
    assert.equal({ op: "replace", path: "/sample2/someDate", value: '2020-01-01', oldValue: '2019-01-01' }, tm.patch.pop());

    input = /** @type{HTMLInputElement} */ (document.getElementById('/sample2/someDateTime'));
    assert.equal('2019-01-01 00:00Z', input.value);
    input.value = '2020-01-01T00:00Z';
    input.onchange(null);
    assert.equal({ op: "replace", path: "/sample2/someDateTime", value: '2020-01-01T01:00+01:00', oldValue: '2019-01-01T00:00Z' }, tm.patch.pop());

    input = /** @type{HTMLInputElement} */ (document.getElementById('/sample2/someDatePartialTime'));
    assert.equal('2019-01-01 00:00', input.value);
    input.value = '2020-01-01T00:00';
    input.onchange(null);
    assert.equal({ op: "replace", path: "/sample2/someDatePartialTime", value: '2020-01-01T00:00', oldValue: '2019-01-01T00:00' }, tm.patch.pop());

    input = /** @type{HTMLInputElement} */ (document.getElementById('/sample2/someBoolean'));
    assert.equal(true, input.checked);
    input.checked = false;
    input.onchange(null);
    assert.equal({ op: "replace", path: "/sample2/someBoolean", value: false, oldValue: true }, tm.patch.pop());

    input = /** @type{HTMLInputElement} */ (document.getElementById('/sample2/someInteger'));
    assert.equal('7', input.value);
    input.value = '13';
    input.onchange(null);
    assert.equal({ op: "replace", path: "/sample2/someInteger", value: 13, oldValue: 7 }, tm.patch.pop());

    input = /** @type{HTMLInputElement} */ (document.getElementById('/sample2/someFloat'));
    assert.equal('3,14', input.value);
    input.value = '3,15';
    input.onchange(null);
    assert.equal({ op: "replace", path: "/sample2/someFloat", value: 3.15, oldValue: 3.14 }, tm.patch.pop());

    input = /** @type{HTMLInputElement} */ (document.getElementById('/sample2/somePercentValue'));
    assert.equal('50%', input.value);
    input.value = '60%';
    input.onchange(null);
    assert.equal({ op: "replace", path: "/sample2/somePercentValue", value: 0.6, oldValue: 0.5 }, tm.patch.pop());

    /** @type{GridChenNS.GridChen} */
    const gc = document.querySelector('grid-chen');
    gc._keyboard('keydown', { key: " " });
    gc._sendKeys('2020-01-01 00:00Z');
    gc._keyboard('keydown', { code: 'Enter' });
    assert.equal({ op: "replace", path: "/sample2/someMatrix/0/0", value: "2020-01-01T01:00+01:00", "oldValue": "2019-01-01 00:00Z" }, tm.patch.pop());

});

