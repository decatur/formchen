import "../gridchen/GridChen.js"
import {createColumnSchemas} from "../gridchen/DataViews.js";
import {
    NumberConverter,
    DateTimeStringConverter,
    FullDateStringConverter,
    DatePartialTimeStringConverter,
    StringConverter
} from "../gridchen/converter.js";

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

function createElement(tagName) {
    const element = document.createElement(tagName);
    //element.className = 'form-chen';
    return element;
}

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
    const containerByPath = {};

    for (const elem of topContainer.children) {
        if (elem.dataset.path) {
            containerByPath[elem.dataset.path] = elem;
            elem.textContent = '';
        }
    }

    const patchesByPath = {};

    function onDataChangedWrapper(pointer, newValue) {
        const path = '/' + pointer.join('/');
        patchesByPath[path] = newValue;
        if (onDataChanged) onDataChanged(pointer, newValue);
    }

    bindObject(topSchema, topObj, [], topContainer);

    /**
     * @param {{properties: Array<>, title: String}} schema
     * @param {Object} obj
     * @param {Array<String>} pointer
     * @param {Element} containerElement
     */
    function bindObject(schema, obj, pointer, containerElement) {
        const path = '/' + pointer.join('/');
        if (path in containerByPath) {
            containerElement = containerByPath[path];
            const fieldset = createElement('div');
            //fieldset.className += ' sub-form';
            fieldset.textContent = path + ' -> ' + schema.title;
            containerElement.appendChild(fieldset);
        }

        const columnSchemas = createColumnSchemas(schema);
        if (!(columnSchemas instanceof Error)) {
            columnSchemas.title = schema.title;
            obj = columnSchemas.validate(obj);
            const view = columnSchemas.viewCreator(columnSchemas, obj);
            const label = createElement('label');
            //label.className += ' grid-label';
            label.style.display = 'block';
            label.textContent = schema.title;
            containerElement.appendChild(label);

            const grid = createElement('grid-chen');
            grid.className += ' grid-chen';
            grid.style.height = '100px';
            label.appendChild(grid);

            grid.resetFromView(view);
            grid.setEventListener('dataChanged', function () {
                onDataChangedWrapper(pointer, obj);
            });
            return
        }

        if (!containerElement.className.includes('fields')) {
            containerElement.className += ' fields';
        }

        const properties = schema.properties || [];
        for (let key in properties) {
            bindProperty(properties[key], key, obj ? obj[key] : undefined, pointer.concat(key), containerElement);
        }
    }

    function bindProperty(schema, key, value, pointer, container) {
        function createError(title, text) {
            const label = createElement('label');
            label.textContent = title;
            container.appendChild(label);
            const span = createElement('span');
            span.className += ' error';
            span.textContent = text;
            container.appendChild(span);
        }

        console.log('bind: ' + key);
        let title = schema.title || key;

        if ('$ref' in schema) {
            // Resolve reference. Note that we do not use the title of the referenced schema.
            const refSchema = getValueByPointer(topSchema, schema['$ref']);
            if (!refSchema) {
                createError(title, 'Undefined $ref at ' + pointer);
                return
            }
            schema = refSchema;
        }

        // If view cannot be created, schema is not a valid grid schema.

        const isPercent = schema.unit === '[%]';

        if (schema.type === 'object') {
            schema = Object.assign({}, schema, {title: title});
            bindObject(schema, value, pointer, container);
            return
        }

        const label = createElement('label');
        let input;

        if (schema.type === 'boolean') {
            input = createElement('input');
            input.type = 'checkbox';
            input.checked = value === undefined ? false : value;
        } else if (schema.enum) {
            input = createElement('select');
            schema.enum.forEach(function (optionName) {
                const option = createElement('option');
                option.textContent = optionName;
                input.appendChild(option);
            });
        } else {
            input = createElement('input');
            input.style.textAlign = 'right';

            if (schema.type === 'integer') {
                if (!schema.converter) {
                    schema.converter = new NumberConverter(0);
                    schema.converter.isPercent = isPercent;
                }
                input.value = schema.converter.toEditable(value);
            } else if (schema.type === 'number') {
                if (!schema.converter) {
                    schema.converter = new NumberConverter(schema.fractionDigits || 2);
                    schema.converter.isPercent = isPercent;
                }
                input.value = schema.converter.toEditable(value);
            } else if (schema.format === 'date-time') {
                if (!schema.converter) {
                    schema.converter = new DateTimeStringConverter();
                }
                input.value = schema.converter.toEditable(value);
            } else if (schema.format === 'date-partial-time') {
                if (!schema.converter) {
                    schema.converter = new DatePartialTimeStringConverter();
                }
                input.value = schema.converter.toEditable(value);
            } else if (schema.format === 'full-date') {
                if (!schema.converter) {
                    schema.converter = new FullDateStringConverter();
                }
                input.value = schema.converter.toEditable(value);
            } else if (schema.type === 'string') {
                if (!schema.converter) {
                    schema.converter = new StringConverter();
                }
                input.style.textAlign = 'left';
                // input.setAttribute('list', 'enum')
                input.value = schema.converter.toEditable(value);
            } else {
                createError(title, 'Invalid schema at ' + pointer);
                return
            }
        }

        input.disabled = schema.editable === undefined ? false : !schema.editable;
        input.style.width = '25ex';

        input.onchange = function () {
            let newValue;
            if (schema.type === 'boolean') {
                newValue = input.checked;
            } else if (schema.enum) {
                newValue = input.value;
            } else {
                newValue = schema.converter.fromString(input.value.trim());
                if (newValue === '') {
                    newValue = null;
                }
            }
            onDataChangedWrapper(pointer, newValue);
        };

        label.textContent = title;

        if (schema.comment || schema.description) {
            label.title = schema.comment || schema.description;
        }

        if (schema.unit) {
            const unit = createElement('span');
            unit.className += ' unit';
            unit.textContent = schema.unit;
            label.appendChild(unit);
        }

        label.setAttribute('for', 'formchen-' + (labelCount));
        input.id = 'formchen-' + (labelCount++);
        container.appendChild(label);
        container.appendChild(input);
    }

    class FormChen {
        constructor() {

        }

        /**
         * Return a patch set according to JSON Patch spec RFC 6902
         * @return {Array<{op:string, path:string, value:*}>}
         */
        getPatches() {
            // TODO: We have to use 'add' if path does not exist.
            return Object.entries(patchesByPath).map(([path, value]) => ({op: 'replace', path: path, value: value}));
        }

        clearPatches() {
            Object.keys(patchesByPath).forEach(function (key) {
                delete patchesByPath[key]
            });
        }
    }

    return new FormChen();
}
