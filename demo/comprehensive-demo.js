/** @import { JSONSchema } from "../formchen/types" */

import { createFormChen } from "../formchen/formchen.js"
import { bindTabs } from "./utils.js";

/** @type{JSONSchema} */
const schema = {
    "$defs": {
        "measurements": {
            title: 'Measurements',
            type: 'array',
            format: 'grid',
            items: {
                type: 'array',
                items: [  // tuple schema
                    { title: 'TimeStamp', width: 200, type: 'string', format: 'datetime' },
                    { title: 'Age [d]', width: 100, type: 'number' },
                    { title: 'Weight [g]', width: 100, type: 'number' }
                ]
            }
        }
    },
    title: 'ComprehensiveDemo',
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
            enum: ['Frida Krum', 'Tilda Swift']
        },
        someDate: {
            title: 'Some Date',
            type: 'string',
            format: 'date'
        },
        someDateTime: {
            title: 'Some DateTime',
            type: 'string',
            format: 'datetime'
        },
        someBoolean: {
            title: 'Some Boolean',
            type: 'boolean'
        },
        someInteger: {
            title: 'Some Integer',
            type: 'integer',
            unit: 'sec'
        },
        someFloat: {
            title: 'Some Float',
            type: 'number',
            unit: 'D.D°',
            fractionDigits: 2
        },
        someColor: {
            title: 'Some Color',
            type: 'string',
            format: 'color'
        },
        someMatrix: {
            title: 'Some Matrix',
            $ref: '#/$defs/measurements'
        },
        anObject: {
            title: 'An Object',
            type: 'object',
            properties: {
                someOtherString: {
                    title: 'someOtherString',
                    type: 'string'
                },
                anEmptyMatrix: {
                    title: 'An Undefined Matrix',
                    $ref: '#/$defs/measurements'
                }
            }
        },
        anEmptyMatrix: {
            title: 'An Undefined Matrix',
            $ref: '#/$defs/measurements'
        },
        tuple: {
            type: 'array',
            title: 'Three Wishes',
            prefixItems: [
                {
                    type: 'string',
                    width: 100
                },
                {
                    type: 'string',
                    width: 100
                },
                {
                    type: 'string',
                    width: 100
                }
            ]
        }
    }
};
const data = {
    someString: 'Rubus idaeus',
    someURI: 'https://en.wikipedia.org/wiki/Rubus_idaeus',
    someEnum: 'Frida Krum',
    someDate: '2019-01-01',
    someDateTime: '2019-01-01T00:00Z',
    someBoolean: true,
    someInteger: 7,
    someFloat: 3.14,
    someColor: '#ff0000',
    someMatrix: [
        ["2019-01-01T00:00Z", 0, 0],
        ["2019-01-02T00:00Z", 1, 2],
        ["2019-01-03T00:00Z", 2, 4]
    ],
    tuple: ['To be taken to Paris', 'Being in Hollywood', 'My friends were back'],
    arrayOfTimeSeries: [
        { country: 'Germany', prices: [['2019-01-01', '2019-02-01', 33]] },
        { country: 'France', prices: [['2019-02-01', '2019-03-01', 42]] }
    ]
};

const formElement = document.getElementById(schema.title);
bindTabs(formElement, schema, value, patch);
const formchen = createFormChen(formElement, schema, data);

function value() {
    return formchen.value
}

function patch() {
    return formchen.patch
}

