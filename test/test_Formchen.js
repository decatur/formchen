/** @import { JSONSchema } from "../formchen/types" */

import { test, assert } from './utils.js'
import { createFormChen } from '../formchen/formchen.js'

import { GridChen } from "../formchen/gridchen/gridchen.js";

test('Atomic', (test_name) => {
    const container = document.getElementById(test_name);
    try {
        createFormChen(container, { type: 'string' }, 'foobar');
    } catch (e) {
        assert.equal(e.message, "Root schema must be an object");
    }

})

test('FormChen', (test_name) => {
    /** @type{JSONSchema} */
    let schema = {
        $defs: {
            "refSchema": {
                title: 'Measurements',
                type: 'array',
                format: 'grid',
                items: {
                    type: 'array',
                    items: [  // tuple schema
                        {title: 'TimeStamp', width: 200, type: 'string', format: 'datetime'},
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
                format: 'url'
            },
            someEnum: {
                title: 'Some Enum',
                type: 'string',
                enum: ['Frida Krum', 'Tilda Swift', 'Mona Lisa']
            },
            someDate: {
                title: 'Some Date',
                type: 'string',
                format: 'date'
            },
            someDateTime: {
                title: 'Some DateTime',
                type: 'string',
                format: 'datetime',
                period: 'MINUTES'

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
                unit: 'D.D°',
                fractionDigits: 2
            },
            someMatrix: {
                title: 'Some Matrix',
                $ref: '#/$defs/refSchema'
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
                $ref: '#/$defs/refSchema'
            }
        }
    };
    
    let data = {
        someString: 'Rubus idaeus',
        someURI: 'https://en.wikipedia.org/wiki/Rubus_idaeus',
        someEnum: 'Mona Lisa',
        someDate: '2019-01-01',
        someDateTime: '2019-01-01 01+01:00',
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
    const fc = createFormChen(container, schema, data);

    /** @type{HTMLInputElement} */
    let input = /** @type{HTMLInputElement} */ (container.querySelector(`[name="/someString"]`));

    assert.equal('Rubus idaeus', input.value);
    input.value = 'foo';
    input.onblur(null);
    assert.equal({ op: "replace", path: "/someString", value: "foo", oldValue: 'Rubus idaeus' }, fc.patch.pop());
    input.value = 'bar';
    input.onblur(null);
    assert.equal({ op: "replace", path: "/someString", value: "bar", oldValue: 'foo' }, fc.patch.pop());

    input = /** @type{HTMLInputElement} */ (container.querySelector(`[name="/someURI"]`));
    input.value = 'ftp://bar';
    input.onblur(null);
    assert.equal({ op: "replace", path: "/someURI", value: "ftp://bar", oldValue: 'https://en.wikipedia.org/wiki/Rubus_idaeus' }, fc.patch.pop());

    let select =  /** @type{HTMLSelectElement} */ (container.querySelector(`[name="/someEnum"]`));
    assert.equal(2, select.selectedIndex);
    select.selectedIndex = 1;
    select.onchange(null);
    assert.equal({ op: "replace", path: "/someEnum", value: "Tilda Swift", oldValue: 'Mona Lisa' }, fc.patch.pop());

    input = /** @type{HTMLInputElement} */ (container.querySelector(`[name="/someDate"]`));
    assert.equal('2019-01-01', input.value);
    input.value = '2020-01-01';
    input.onblur(null);
    assert.equal({ op: "replace", path: "/someDate", value: '2020-01-01', oldValue: '2019-01-01' }, fc.patch.pop());

    input = /** @type{HTMLInputElement} */ (container.querySelector(`[name="/someDateTime"]`));
    assert.equal('2019-01-01 01+01:00', input.value);
    input.value = '2020-01-01T00:00Z';
    input.onblur(null);
    assert.equal({ op: "replace", path: "/someDateTime", value: '2020-01-01T00:00Z', oldValue: '2019-01-01 01+01:00' }, fc.patch.pop());

    input = /** @type{HTMLInputElement} */ (container.querySelector(`[name="/someBoolean"]`));
    assert.equal(true, input.checked);
    input.checked = false;
    input.onchange(null);
    assert.equal({ op: "replace", path: "/someBoolean", value: false, oldValue: true }, fc.patch.pop());

    input = /** @type{HTMLInputElement} */ (container.querySelector(`[name="/someInteger"]`));
    assert.equal('7', input.value);
    input.value = '13';
    input.onblur(null);
    assert.equal({ op: "replace", path: "/someInteger", value: 13, oldValue: 7 }, fc.patch.pop());

    input = /** @type{HTMLInputElement} */ (container.querySelector(`[name="/someFloat"]`));
    assert.equal('3.14', input.value);
    input.value = '3.15';
    input.onblur(null);
    assert.equal({ op: "replace", path: "/someFloat", value: 3.15, oldValue: 3.14 }, fc.patch.pop());

    /** @type{GridChen} */
    const gc = (container.querySelector(`[name="/someMatrix"]`));
    gc._keyboard('keydown', { key: " " });
    gc._sendKeys('2020-01-01T00:00Z');
    gc._keyboard('keydown', { code: 'Enter' });
    assert.equal({ op: "replace", path: "/someMatrix/0/0", value: "2020-01-01T00:00Z", "oldValue": "2019-01-01 00:00Z" }, fc.patch.pop());

});

