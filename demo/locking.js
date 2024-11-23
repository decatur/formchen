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
bindDemoTabs(document.getElementById(schema.title), schema, () => formchen.value, () => formchen.patch);
const formchen = createFormChen(document.getElementById(schema.title), schema, data);

const validationElement = document.getElementById('Validation');

document.getElementById('Patch').onclick = async () => {
    validationElement.textContent = '';
    
    const patch = formchen.patch;
    if (patch.length == 0) {
        validationElement.textContent = 'No edits to save!';
        return
    } else if (patch.find((operation) => operation.validation) !== undefined) {
        validationElement.textContent = `Fix validation issues:\n${JSON.stringify(patch, null, 4)}`;
        return
    }
    
    let body = { _id: formchen.value._id, patch: patch}
    const response = await fetch('/plant.json', {method: 'PATCH', body: JSON.stringify(body)});
    console.log(response)
    if (response.status == 409) {
        validationElement.textContent = `${response.statusText}: Please reload page!`;
        return   
    }
    const data = await response.json();
    formchen.patchMerge(data.patch);
}

const response = await fetch('/plant.json');
let plant = await response.json();
formchen.value = plant;




