import { test, assert } from './utils.js'
import { createFormChen } from '../docs/formchen/webcomponent.js'
import * as utils from '../docs/gridchen/utils.js';
import { GridChen } from "../docs/gridchen/webcomponent.js";

test('Atomic', (test_name) => {
    const container = document.getElementById(test_name);
    try {
        const fc = createFormChen(container, { type: 'string' }, 'foobar');
    } catch (e) {
        assert.equal(e.message, "Root schema must be an object");
    }

})

test('FormChen', (test_name) => {
    let schema = {
        definitions: {
            "refSchema": {
                title: 'Measurements',
                type: 'array',
                format: 'grid',
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
        title: 'FieldObservation',
        type: 'object',
        properties: {
            someString: {
                title: 'Some String',
                type: 'string'
            },
            someURI: {
                title: 'Some URI',
                type: 'string',
                format: 'uri'
            },
            someEnum: {
                title: 'Some Enum',
                type: 'string',
                enum: ['Frida Krum', 'Tilda Swift', 'Mona Lisa']
            },
            someDate: {
                title: 'Some Date',
                type: 'string',
                format: 'full-date'
            },
            someDateTime: {
                title: 'Some DateTime',
                type: 'string',
                format: 'date-time'
            },
            someBoolean: {
                title: 'Some Boolean',
                type: 'boolean'
            },
            someInteger: {
                title: 'Some Integer',
                type: 'integer'
            },
            someFloat: {
                title: 'Some Float',
                type: 'number',
                unit: '[DD]',
                fractionDigits: 2
            },
            someMatrix: {
                title: 'Some Matrix',
                $ref: '#/definitions/refSchema'
            },
            anObject: {
                title: 'An Object',
                type: 'object',
                properties: {
                    someOtherString: {
                        type: 'string'
                    }
                }
            },
            anEmptyMatrix: {
                title: 'An Undefined Matrix',
                $ref: '#/definitions/refSchema'
            }
        }
    };
    
    let data = {
        someString: 'Rubus idaeus',
        someURI: 'https://en.wikipedia.org/wiki/Rubus_idaeus',
        someEnum: 'Mona Lisa',
        someDate: '2019-01-01',
        someDateTime: '2019-01-01T00:00Z',
        someBoolean: true,
        someInteger: 7,
        someFloat: 3.14,
        someMatrix: [
            ['2019-01-01 00:00Z', 1, 2],
            ['2019-01-01 00:00Z', 3, 4],
            ['2019-01-01 00:00Z', 4, 5]
        ]
    };

    
    const container = document.getElementById(test_name);
    const tm = utils.createTransactionManager();
    utils.registerUndo(document.body, tm);
    const fc = createFormChen(container, schema, data, tm);

    /** @type{HTMLInputElement} */
    let input = /** @type{HTMLInputElement} */ (container.querySelector(`[data-path="/someString"]`).querySelector('.data-value'));

    assert.equal('Rubus idaeus', input.value);
    input.value = 'foo';
    input.onchange(null);
    assert.equal({ op: "replace", path: "/someString", value: "foo", oldValue: 'Rubus idaeus' }, tm.patch.pop());
    input.value = 'bar';
    input.onchange(null);
    assert.equal({ op: "replace", path: "/someString", value: "bar", oldValue: 'foo' }, tm.patch.pop());

    input = /** @type{HTMLInputElement} */ (document.getElementById('/someURI'));
    input.value = 'ftp://bar';
    input.onchange(null);
    assert.equal({ op: "replace", path: "/someURI", value: "ftp://bar", oldValue: 'https://en.wikipedia.org/wiki/Rubus_idaeus' }, tm.patch.pop());

    /** @type{HTMLSelectElement} */
    let select = /** @type{HTMLSelectElement} */ (document.getElementById('/someEnum'));
    assert.equal(2, select.selectedIndex);
    select.selectedIndex = 1;
    select.onchange(null);
    assert.equal({ op: "replace", path: "/someEnum", value: "Tilda Swift", oldValue: 'Mona Lisa' }, tm.patch.pop());

    input = /** @type{HTMLInputElement} */ (document.getElementById('/someDate'));
    assert.equal('2019-01-01 00', input.value);
    input.value = '2020-01-01';
    input.onchange(null);
    assert.equal({ op: "replace", path: "/someDate", value: '2020-01-01T00', oldValue: '2019-01-01' }, tm.patch.pop());

    input = /** @type{HTMLInputElement} */ (document.getElementById('/someDateTime'));
    assert.equal('2019-01-01 01+01:00', input.value);
    input.value = '2020-01-01T00:00Z';
    input.onchange(null);
    assert.equal({ op: "replace", path: "/someDateTime", value: '2020-01-01T01+01:00', oldValue: '2019-01-01T00:00Z' }, tm.patch.pop());

    input = /** @type{HTMLInputElement} */ (document.getElementById('/someDatePartialTime'));
    assert.equal('2019-01-01 00', input.value);
    input.value = '2020-01-01T00:00';
    input.onchange(null);
    assert.equal({ op: "replace", path: "/someDatePartialTime", value: '2020-01-01T00', oldValue: '2019-01-01T00:00' }, tm.patch.pop());

    input = /** @type{HTMLInputElement} */ (document.getElementById('/someBoolean'));
    assert.equal(true, input.checked);
    input.checked = false;
    input.onchange(null);
    assert.equal({ op: "replace", path: "/someBoolean", value: false, oldValue: true }, tm.patch.pop());

    input = /** @type{HTMLInputElement} */ (document.getElementById('/someInteger'));
    assert.equal('7', input.value);
    input.value = '13';
    input.onchange(null);
    assert.equal({ op: "replace", path: "/someInteger", value: 13, oldValue: 7 }, tm.patch.pop());

    input = /** @type{HTMLInputElement} */ (document.getElementById('/someFloat'));
    assert.equal('3,14', input.value);
    input.value = '3,15';
    input.onchange(null);
    assert.equal({ op: "replace", path: "/someFloat", value: 3.15, oldValue: 3.14 }, tm.patch.pop());

    /** @type{GridChen} */
    const gc = document.querySelector('grid-chen');
    gc._keyboard('keydown', { key: " " });
    gc._sendKeys('2020-01-01 00:00Z');
    gc._keyboard('keydown', { code: 'Enter' });
    assert.equal({ op: "replace", path: "/someMatrix/0/0", value: "2020-01-01T01:00+01:00", "oldValue": "2019-01-01 00:00Z" }, tm.patch.pop());

});

