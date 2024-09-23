import { createFormChen } from "../formchen/webcomponent.js"
import * as utils from "../gridchen/utils.js";

const schema = {
    definitions: {
        "measurements": {
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
            enum: ['Frida Krum', 'Tilda Swift']
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
            type: 'integer',
            unit: '[sec]'
        },
        someFloat: {
            title: 'Some Float',
            type: 'number',
            unit: '[DD]',
            fractionDigits: 2
        },
        somePercentValue: {
            title: 'Some Percent Value',
            type: 'number',
            unit: '[%]',
            fractionDigits: 1
        },
        someColor: {
            title: 'Some Color',
            type: 'string',
            format: 'color'
        },
        someMatrix: {
            title: 'Some Matrix',
            type: 'array',
            $ref: '#/definitions/measurements'
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
            type: 'array',
            $ref: '#/definitions/measurements'
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
    somePercentValue: 0.5,
    someBoolean: true,
    someInteger: 7,
    someFloat: 3.14,
    someColor: '#ff0000',
    someMatrix: [
        ["2019-01-01T00:00Z", 0, 0],
        ["2019-01-02T00:00Z", 1, 2],
        ["2019-01-03T00:00Z", 2, 4]
    ],
    tuple: ['To be taken to Paris.', 'Being in Hollywood', 'My friends were back'],
    arrayOfTimeSeries: [
        { country: 'Germany', prices: [['2019-01-01', '2019-02-01', 33]]},
        { country: 'France', prices: [['2019-02-01', '2019-03-01', 42]]}
    ]
};

const container = document.getElementById("COMPREHENSIVE");
const patchElement = /** @type{HTMLTextAreaElement} **/ (container.querySelector('.patch'));

const tm = utils.createTransactionManager();
utils.registerUndo(document.body, tm);
const _formchen = createFormChen(container, schema, data, tm);

tm.addEventListener('change', function () {
    patchElement.value = JSON.stringify(tm.patch, null, 2);
});