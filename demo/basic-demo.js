/** @import { JSONSchema } from "../formchen/types" */

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
                    { title: 'TimeStamp', width: 200, type: 'string', format: 'datetime', period: 'MINUTES' },
                    { title: 'Age [d]', width: 100, type: 'integer' },
                    { title: 'Weight [g]', width: 100, type: 'number' }
                ]
            }
        }
    },
    title: 'BasicDemo',
    type: 'object',
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
            format: 'datetime',
            period: 'MINUTES'
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
            fractionDigits: 3
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
    reference: 'https://en.wikipedia.org/wiki/Rubus_idaeus',
    observer: 'Frida Krum',
    start: '2019-01-01T00:00Z',
    latitude: 41.40338,
    longitude: 2.17403,
    measurements: [
        ["2019-01-01T00:00Z", 0, 0],
        ["2019-02-01T00:00Z", 1, 2.3],
        ["2019-03-01T00:00Z", 2, 4]
    ],
    isCompleted: true
};

bindDemoTabs(document.getElementById(schema.title), schema, value, patch);
const formchen = createFormChen(document.getElementById(schema.title), schema, data);

function value() {
    return formchen.value
}

function patch() {
    return formchen.patch
}



