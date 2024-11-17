/** @import { JSONSchema } from "../formchen/types" */

import { createFormChen } from "../formchen/formchen.js"
import { bindDemoTabs } from "../demo/utils.js";

/** @type{JSONSchema} */
const schema = {
    "$defs": {
        "measurements": {
            type: 'array',
            format: 'grid',
            items: {
                type: 'array',  // tuple schema
                items: [
                    { title: 'TimeStamp', width: 200, type: 'string', format: 'datetime', period: 'minutes' },
                    { title: 'Age [d]', width: 100, type: 'integer' },
                    { title: 'Weight [g]', width: 100, type: 'number' }
                ]
            }
        }
    },
    title: 'BasicDemo',
    type: 'object',
    properties: {
        _id: {
            title: 'ID',
            description: 'The ID of the plant',
            type: 'string',
            readOnly: true
        },
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
            period: 'minutes'
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

const data = null;
bindDemoTabs(document.getElementById(schema.title), schema, value, patch);
const formchen = createFormChen(document.getElementById(schema.title), schema, data);

function value() {
    return formchen.value
}

function patch() {
    return formchen.patch
}

document.getElementById('MockPatch').onclick = async () => {
    let body = { _id: formchen.value._id, patch: formchen.patch}
    const response = await fetch('/foo', {method: 'PATCH', body: JSON.stringify(body)});
    console.log(response)
    const patch = await response.json();
    formchen.patchMerge(patch);
}

const response = await fetch('/foo.json');
let data1 = await response.json();
formchen.patchMerge([{op: 'replace', path:'', value: data1}]);




