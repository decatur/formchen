import "./GridChen.js"
import {selectViewCreator} from "./DataViews.js";
import {NumberStringConverter, DateTimeStringConverter} from "./converter.js";

/**
 * @param {number} duration in seconds
 * @return {string}
 */

/*function formatDuration(duration) {
    const units = [['seconds', 60], ['minutes', 60], ['hours', 24], ['days', 100000000]];

    for (let i = 0; i < units.length; i++) {
        let unit = units[i];
        let nextUnit = units[i];

        if (duration / nextUnit[1] < 1) {
            return (duration).toFixed(2) + ' ' + unit[0]
        }

        duration /= nextUnit[1]
    }
}*/

// Global unique label id.
let labelCount = 0;

/**
 * Example:
 *      getValueByPointer({definitions:{foobar: 1}}, '#/definitions/foobar')
 *      -> 1
 * @param {object} obj
 * @param {string} pointer
 * @returns {object}
 */
function getValueByPointer(obj, pointer) {
    return pointer.substr(2).split('/').reduce((res, prop) => res[prop], obj);
}

/**
     * @param {{properties: Array<>, title: String}} topSchema
     * @param {object} topObj
     * @param {Element} topContainer
     * @param onDataChanged
     */
export function createFormChen(topSchema, topObj, topContainer, onDataChanged) {

    bindObject(topSchema, topObj, [], topContainer);

    /**
     * @param {{properties: Array<>, title: String}} schema
     * @param {Object} obj
     * @param {Array<String>} pointer
     * @param {Element} containerElement
     */
    function bindObject(schema, obj, pointer, containerElement) {
        if (pointer.length === 0) topSchema = schema;

        const properties = schema.properties || [];
        const fieldset = document.createElement('fieldset');
        const legend = document.createElement('legend');
        legend.textContent = schema.title;
        fieldset.appendChild(legend);
        const fieldContainer = document.createElement('div');
        fieldContainer.className = 'fieldContainer';
        fieldset.appendChild(fieldContainer);

        for (let key in properties) {
            bindProperty(properties[key], key, obj ? obj[key] : undefined, pointer.concat(key), fieldContainer);
        }
        containerElement.appendChild(fieldset);
    }

    function bindProperty(schema, key, value, pointer, container) {
            console.log('bind: ' + key);
            if ('$ref' in schema) {
                // Resolve reference. TODO: Report unresolved reference.
                schema = getValueByPointer(topSchema, schema['$ref']);
                if (!schema) {
                    const label = document.createElement('label');
                    label.textContent = key;
                    container.appendChild(label);
                    const span = document.createElement('span');
                    span.textContent = 'Undefined $ref at ' + pointer;
                    container.appendChild(span);
                    return
                }
            }

            schema.title = schema.title || key;

            // If view cannot be created, schema is not a valid grid schema.
            const viewCreator = selectViewCreator(schema);

            if (!(viewCreator instanceof Error)) {
                const view = viewCreator(value);
                const label = document.createElement('label');
                label.className = 'gridLabel';
                //const title = document.createElement('span');
                label.textContent = schema.title;
                const grid = document.createElement('grid-chen');
                grid.style.height = '100px';
                grid.resetFromView(view);
                container.appendChild(label);
                container.appendChild(grid);
                grid.setEventListener('dataChanged', function () {
                    onDataChanged(pointer, value);
                });
            } else if (schema.type === 'object') {
                bindObject(schema, value, pointer, container);
            } else {
                const label = document.createElement('label');
                let input;

                if (schema.type === 'boolean') {
                    input = document.createElement('input');
                    input.type = 'checkbox';
                    input.checked = value === undefined ? false : value;
                } else if (schema.enum) {
                    input = document.createElement('select');
                    schema.enum.forEach(function (optionName) {
                        const option = document.createElement('option');
                        option.textContent = optionName;
                        input.appendChild(option);
                    });
                } else {
                    input = document.createElement('input');

                    if (schema.type === 'number' || schema.type === 'integer') {
                        input.style.textAlign = 'right'
                    }

                    if (value === undefined) {
                        input.value = '';
                    } else if (schema.type === 'integer') {
                        if (!schema.converter) {
                            schema.converter = new NumberStringConverter(0);
                        }
                        input.value = schema.converter.toEditable(Number(value));
                    } else if (schema.type === 'number') {
                        if (!schema.converter) {
                            schema.converter = new NumberStringConverter(schema.fractionDigits || 2);
                        }
                        let n = Number(value);
                        if (schema.unit === '%') {
                            n *= 100;
                        }
                        input.value = schema.converter.toEditable(n);
                    } else if (schema.format === 'datetime') {
                        if (!schema.converter) {
                            schema.converter = new DateTimeStringConverter();
                        }
                        input.value = schema.converter.toEditable(value);
                    } else {
                        // TODO: date, datetimelocal, uri, frequency
                        input.value = String(value);
                    }
                }

                input.disabled = schema.editable === undefined ? false : !schema.editable;
                input.style.width = '25ex';

                input.onchange = function () {
                    let newValue;
                    if (schema.type === 'boolean') {
                        newValue = input.checked;
                    } else {
                        newValue = input.value.trim();
                        if (newValue === '') {
                            newValue = null;
                        } else if (schema.type === 'number' && schema.unit === '%') {
                            newValue /= 100;
                        }
                    }
                    onDataChanged(pointer, newValue);
                };

                label.textContent = schema.title;

                if (schema.comment || schema.description) {
                    label.title = schema.comment || schema.description;
                }

                if (schema.unit) {
                    const unit = document.createElement('span');
                    unit.className = 'unit';
                    unit.textContent = schema.unit;
                    label.appendChild(unit);
                }

                label.setAttribute('for', 'formchen-' + (labelCount));
                input.id = 'formchen-' + (labelCount++);
                container.appendChild(label);
                container.appendChild(input);
            }

    }
};



