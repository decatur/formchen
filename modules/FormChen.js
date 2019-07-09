import "./GridChen.js"
import {createView} from "./DataViews.js";
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

let labelCount = 0;
let topSchema;

function getVal(obj, myPath){
    return myPath.split('/').reduce ( (res, prop) => res[prop], obj );
}

/**
 * @param {{properties: Array<>, title: String}} schema
 * @param {Object} obj
 * @param {Array<String>} pointer
 * @param {Element} containerElement
 * @param onDataChanged
 */
export function bind(schema, obj, pointer, containerElement, onDataChanged) {
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
        console.log('bind: ' + key);
        const childPointer = pointer.concat(key);
        let childSchema = properties[key];
        if ('$ref' in childSchema) {
            // Resolve reference. TODO: Report unresolved reference.
            childSchema = getVal(topSchema, childSchema['$ref'].substr(2));
        }
        const value = obj ? obj[key] : undefined;
        // If view cannot be created, schema is not a valid grid schema.
        const view = createView(childSchema, value);

        if (!(view instanceof Error)) {
            const label = document.createElement('label');
            label.className = 'gridLabel';
            //const title = document.createElement('span');
            label.textContent = childSchema.title;
            const grid = document.createElement('grid-chen');
            grid.style.height = '100px';
            grid.resetFromView(createView(childSchema, value));
            fieldContainer.appendChild(label);
            fieldContainer.appendChild(grid);
            grid.setEventListener('datachanged', function () {
                onDataChanged(childPointer, value);
            });
        } else if (childSchema.type === 'object') {
            bind(childSchema, value, childPointer, fieldset, onDataChanged);
        } else {
            const label = document.createElement('label');
            let input;

            if (childSchema.type === 'boolean') {
                input = document.createElement('input');
                input.type = 'checkbox';
                input.checked = value === undefined ? false : value;
            } else if (childSchema.enum) {
                input = document.createElement('select');
                childSchema.enum.forEach(function (optionName) {
                    const option = document.createElement('option');
                    option.textContent = optionName;
                    input.appendChild(option);
                });
            } else {
                input = document.createElement('input');

                if (childSchema.type === 'number' || childSchema.type === 'integer') {
                    input.style.textAlign = 'right'
                }

                if (value === undefined) {
                    input.value = '';
                } else if (childSchema.type === 'integer') {
                    if (!childSchema.converter) {
                        childSchema.converter = new NumberStringConverter(0);
                    }
                    input.value = childSchema.converter.toEditable(Number(value));
                } else if (childSchema.type === 'number') {
                    if (!childSchema.converter) {
                        childSchema.converter = new NumberStringConverter(childSchema.fractionDigits || 2);
                    }
                    let n = Number(value);
                    if (childSchema.unit === '%') {
                        n *= 100;
                    }
                    input.value = childSchema.converter.toEditable(n);
                } else if (childSchema.format === 'datetime') {
                    if (!childSchema.converter) {
                        childSchema.converter = new DateTimeStringConverter();
                    }
                    input.value = childSchema.converter.toEditable(value);
                } else {
                    // TODO: date, datetimelocal, uri, frequency
                    input.value = String(value);
                }
            }

            input.disabled = childSchema.editable === undefined ? false : !childSchema.editable;
            input.style.width = '25ex';

            input.onchange = function () {
                let newValue;
                if (childSchema.type === 'boolean') {
                    newValue = input.checked;
                } else {
                    newValue = input.value.trim();
                    if (newValue === '') {
                        newValue = null;
                    } else if (childSchema.type === 'number' && childSchema.unit === '%') {
                        newValue /= 100;
                    }
                }
                onDataChanged(childPointer, newValue);
            };

            label.textContent = childSchema.title || key;

            if (childSchema.comment || childSchema.description) {
                label.title = childSchema.comment || childSchema.description;
            }

            if (childSchema.unit) {
                const unit = document.createElement('span');
                unit.className = 'unit';
                unit.textContent = childSchema.unit;
                label.appendChild(unit);
            }

            label.setAttribute('for', 'formchen-' + (labelCount));
            input.id = 'formchen-' + (labelCount++);
            fieldContainer.appendChild(label);
            fieldContainer.appendChild(input);
        }
        containerElement.appendChild(fieldset);
    }
}

