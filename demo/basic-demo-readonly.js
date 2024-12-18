/** @import { JSONSchema } from "../formchen/types.js" */

import { createFormChen } from "../formchen/formchen.js"
import { bindDemoTabs } from "./utils.js";

/** @type{JSONSchema} */
const schema = {
    "$defs": {
        "measurements": {
            type: 'array',
            format: 'grid',
            items: {
                type: 'array',  // tuple schema
                items: [
                    { title: 'Id', width: 50, type: 'string', total: 'count' },
                    { title: 'TimeStamp', width: 200, type: 'string', format: 'datetime', period: 'minutes' },
                    { title: 'Age [d]', width: 100, type: 'integer', total: 'avg' },
                    { title: 'Weight [g]', width: 100, type: 'number', total: 'sum' }
                ]
            }
        }
    },
    title: 'BasicDemoReadOnly',
    type: 'object',
    readOnly: true,
    properties: {
        plant: {
            title: 'Plant',
            description: 'The name of the plant',
            type: 'string'
        },
        observer: {
            title: 'Observer',
            type: 'string',
            enum: ['Frida Krum', 'Tilda Swift']
        },
        start: {
            title: 'Started',
            type: 'string',
            format: 'datetime'
        },
        latitude: {
            title: 'Latitude',
            type: 'number',
            unit: 'D.D°',
            fractionDigits: 5
        },
        longitude: {
            title: 'Longitude',
            type: 'number',
            unit: 'D.D°',
            fractionDigits: 5
        },
        measurements: {
            title: 'Daylight Measurements',
            $ref: '#/$defs/measurements'
        },
        isCompleted: {
            title: 'Is Completed',
            type: 'boolean'
        }
    }
};
const data = {
    plant: 'Rubus idaeus',
    observer: 'Frida Krum',
    start: '2019-01-01T00:00Z',
    latitude: 41.40338,
    longitude: 2.17403,
    measurements: [
        ['S1', "2019-01-01T00:00Z", 0, 0],
        ['S2', "2019-02-01T00:00Z", 1, 2],
        ['S3', "2019-03-01T00:00Z", 2, 4]
    ],
    isCompleted: true
};

const formElement = document.getElementById(schema.title);
bindDemoTabs(formElement, schema, () => formchen.value, () => formchen.patch);
const formchen = createFormChen(formElement, schema, data);



