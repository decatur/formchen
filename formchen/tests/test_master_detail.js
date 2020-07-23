//@ts-check

import { test, assert } from '/gridchen/tests/gridchen/utils.js'
import { createFormChen } from '/formchen/webcomponent.js'
import * as u from "/gridchen/utils.js";

const container = document.createElement('div');
document.body.appendChild(container);

test('master-detail', () => {
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
            ["2019-01-01T00:00Z", 0, 0, { bar: 'Column 3' }, { bar: 'Column 4' }],
            ["2019-02-01T00:00Z", 1, 2],
            ["2019-03-01T00:00Z", 2, 4, { foo: 'Some Foo' }, { foo: 'Some Foo' }]
        ],
        isCompleted: true
    };

    const orgData = JSON.parse(JSON.stringify(data));

    container.id = schema.pathPrefix;
    const fc = createFormChen(schema, data);
    const tm = u.globalTransactionManager;

    /** @returns {HTMLInputElement} */
    function getInput(id) {
        return /** @type{HTMLInputElement} */ (document.getElementById(id))
    }

    let plantInput = getInput('/md/plant');
    assert.equal('Rubus idaeus', plantInput.value);
    plantInput.value = 'Oak';
    plantInput.onchange(null);
    assert.equal('Oak', plantInput.value);

    // We test that master-detail is initially displayed with the details from the first row.
    // Then we change that detail and check that patch and data conforms.
    // Then we select second row and check that the corresponding detail shows.
    // Then we undo and check that again first row is selected and the detail is rolled back.
    // We do all of this for both detail columns.

    for (const columnIndex of [3, 4]) {
        // Default is active cell (0, 0), so first row is selected.
        let barInput = getInput(`/md/measurements/*/${columnIndex}/bar`);
        assert.equal(`Column ${columnIndex}`, barInput.value);

        let fooInput = getInput(`/md/measurements/*/${columnIndex}/foo`);
        fooInput.value = 'new foo';
        fooInput.onchange(null);

        const patch = tm.patch;
        assert.equal({ op: "add", path: `/md/measurements/0/${columnIndex}/foo`, value: "new foo" }, patch.pop());
        assert.equal({ foo: 'new foo', bar: `Column ${columnIndex}` }, data.measurements[0][columnIndex]);

        // Now select second row.
        const gridChen = /** @type{GridChenNS.GridChen} */ (document.getElementById('/md/measurements'));
        gridChen._click(1, 0);
        assert.equal(1, gridChen.selectedRange.rowIndex);
        assert.equal('', fooInput.value);

        tm.undo();
        assert.equal(0, gridChen.selectedRange.rowIndex);
        assert.equal({ bar: `Column ${columnIndex}` }, data.measurements[0][columnIndex]);
    }

    // Now undo the initil transaction.
    tm.undo();
    assert.equal('Rubus idaeus', plantInput.value);
    assert.equal(0, tm.patch.length);
    assert.equal(orgData, data);
});

