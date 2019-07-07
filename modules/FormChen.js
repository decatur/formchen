import "/GridChen/modules/GridChen.js"
import {createView} from "/GridChen/modules/DataViews.js";

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
/**
 * @param {{}} schemas
 * @param {{properties: Array<>, title: String}} schema
 * @param {Object} obj
 * @param {Array<String>} pointer
 * @param {Element} containerElement
 * @param onDataChanged
 */
export function bind(schemas, schema, obj, pointer, containerElement, onDataChanged) {
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
            childSchema = schemas[childSchema['$ref']];
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
            bind(schemas, childSchema, value, childPointer, fieldset, onDataChanged);
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
                } else if (childSchema.unit === '%') {
                    input.value = 100 * value;
                } else if (childSchema.format === 'date-time') {
                    input.value = new Date(value).toLocaleString();
                } else {
                    input.value = value;
                }
            }

            input.disabled = childSchema.editable === undefined ? false : !childSchema.editable;
            input.style.width = '25ex';

            input.onchange = function () {
                let newValue = input.value.trim();
                if (childSchema.type === 'array') {
                    newValue = newValue.split(',').map(function (item) {
                        return item.trim()
                    });
                } else if (childSchema.type === 'boolean') {
                    newValue = input.checked;
                } else if (childSchema.type === 'number' || childSchema.type === 'integer') {
                    if (newValue === '') {
                        newValue = null;
                    } else {
                        newValue = Number(newValue.replace(',', '.'));
                        if (isNaN(newValue)) {
                            throw Error('Invalid number: ' + input.value);
                        }
                        if (childSchema.unit === '%') {
                            newValue /= 100;
                        }
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

/**
 * Disable all child buttons of the form
 * @param {HTMLFormElement} form
 */
export function disableButtons(form) {
    const buttons = form.querySelectorAll('button');
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].disabled = true;
    }
}

/**
 * Set the button to busy state.
 * @param {HTMLButtonElement} button
 */
export function busy(button) {
    // Remember idle text content.
    button.dataset['orgTextContent'] = button.textContent;
    button.textContent = '⌛';
}

/**
 * Enable all child buttons of the form
 * @param {HTMLFormElement} form
 */
export function enableButtons(form) {
    const buttons = form.querySelectorAll('button');
    for (let i = 0; i < buttons.length; i++) {
        /** @type {HTMLButtonElement} */
        const button = buttons.item(i);
        button.disabled = false;
        if ('orgTextContent' in button.dataset) {
            button.textContent = button.dataset['orgTextContent'];
        }
    }
}
