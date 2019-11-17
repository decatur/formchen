//@ts-check

import { test, assert } from './grid-chen/utils.js'
import { createFormChen } from '../form-chen/webcomponent.js'
import * as u from "../grid-chen/utils.js";

const container = document.createElement('div');
container.dataset.path = '/md';
document.body.appendChild(container);

test('FormChen', () => {
    const schema = {
        definitions: {
            "measurements": {
                title: 'Measurements',
                type: 'array',
                format: 'grid',
                items: {
                    type: 'array',
                    items: [  // tuple schema
                        { title: 'TimeStamp', width: 200, type: 'string', format: 'date-time' },
                        { title: 'Age [d]', width: 100, type: 'number' },
                        { title: 'Weight [g]', width: 100, type: 'number' },
                        {
                            title: 'DetailA', type: 'object', properties: {
                                foo: { type: 'string' },
                                bar: { type: 'string' }
                            },
                        },
                        {
                            title: 'DetailB', type: 'object', properties: {
                                foo: { type: 'string' },
                                bar: { type: 'string' }
                            },
                        }
                    ]
                }
            }
        },
        pathPrefix: '/md',
        title: 'FieldObservation',
        type: 'object',
        properties: {
            plant: {
                title: 'Plant',
                description: 'The name of the plant',
                type: 'string'
            }, 
            measurements: {
                title: 'Daylight Measurements',
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
        measurements: [
            ["2019-01-01T00:00Z", 0, 0, { bar: 'Some Bar' }],
            ["2019-02-01T00:00Z", 1, 2],
            ["2019-03-01T00:00Z", 2, 4, { foo: 'Some Foo' }]
        ],
        isCompleted: true
    };


    const fc = createFormChen(schema, data);
    const tm = u.globalTransactionManager;

    /** @type{HTMLInputElement} */
    let input;

    input = /** @type{HTMLInputElement} */ (document.getElementById('/md/plant'));
    assert.equal('Rubus idaeus', input.value);

    input = /** @type{HTMLInputElement} */ (document.getElementById('/md/measurements/*/3/bar'));
    assert.equal('Some Bar', input.value);

    input = /** @type{HTMLInputElement} */ (document.getElementById('/md/measurements/*/3/foo'));
    input.value = 'foo';
    input.onchange(null);

    const patch = tm.patch;
    assert.equal({op: "add", path: "/md/measurements/0/3/foo", value: "foo"}, patch.pop());
    
});

