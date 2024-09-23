
import { createFormChen } from "../formchen/webcomponent.js"
import * as utils from "../gridchen/utils.js";

const schema = {
    definitions: {
        "measurements": {
            title: 'Measurements',
            type: 'array',
            format: 'grid',
            items: {
                type: 'array',  // tuple schema
                items: [
                    { title: 'TimeStamp', width: 200, type: 'string', format: 'date-time', period: 'HOURS' },
                    { title: 'Age [d]', width: 100, type: 'number' },
                    { title: 'Weight [g]', width: 100, type: 'number' }
                ]
            }
        }
    },
    pathPrefix: '',
    title: 'FieldObservation',
    type: 'object',
    properties: {
        plant: {
            title: 'Plant',
            description: 'The name of the plant',
            type: 'string'
        },
        reference: {
            title: 'Reference',
            type: 'string',
            format: 'uri'
        },
        observer: {
            title: 'Observer',
            type: 'string',
            enum: ['Frida Krum', 'Tilda Swift']
        },
        start: {
            title: 'Started',
            type: 'string',
            format: 'date-time'
        },
        latitude: {
            title: 'Latitude',
            type: 'number',
            unit: '[DD]',
            fractionDigits: 5
        },
        longitude: {
            title: 'Longitude',
            type: 'number',
            unit: '[DD]',
            fractionDigits: 5
        },
        measurements: {
            title: 'Daylight Measurements',
            type: 'array',
            $ref: '#/definitions/measurements'
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
        ["2019-02-01T00:00Z", 1, 2],
        ["2019-03-01T00:00Z", 2, 4]
    ],
    isCompleted: true
};

const container = document.getElementById("BASIC");
const patchElement = /** @type{HTMLTextAreaElement} **/ (container.querySelector('.patch'));

const tm = utils.createTransactionManager();
utils.registerUndo(document.body, tm);
const _formchen = createFormChen(container, schema, data, tm);

tm.addEventListener('change', function () {
    patchElement.value = JSON.stringify(tm.patch, null, 2);
});

