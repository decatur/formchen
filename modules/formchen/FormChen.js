import "../gridchen/GridChen.js"
import {createView} from "/modules/gridchen/DataViews.js";
import {
    NumberConverter,
    DateTimeStringConverter,
    FullDateStringConverter,
    DatePartialTimeStringConverter,
    StringConverter
} from "/modules/gridchen/converter.js";

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

class JSONPatch {
    constructor(obj) {
        this.obj = obj;
        this.patch = [];
    }
    push(op) {
        // Make sure that all parent objects and arrays exists for this path.
        const pointer = op.path.split('/');
        let o = {'': this.obj};
        for (let index=0; index < pointer.length-1; index++) {
            const key = pointer[index];
            if (o[key] == null) {
                const isArray = Number.isInteger(Number(pointer[index+1]));
                o[key] = isArray?[]:{};
                this.patch.push({op:'add', path: pointer.slice(0, index+1).join('/'), value: isArray?[]:{}});
            }
            o = o[key];
        }

        if (o[pointer[-1]] === undefined) {
            op.op = 'add';
        }

        this.patch.push(op);
    }
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

    const allPatches = [];

    function onDataChangedWrapper(patches) {
        console.log(patches);
        allPatches.push(...patches);
        if (onDataChanged) onDataChanged(patches);
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

        if (schema.format === 'grid') {
            const label = createElement('label');
            //label.className += ' grid-label';
            label.style.display = 'block';
            label.textContent = schema.title;
            containerElement.appendChild(label);

            const grid = createElement('grid-chen');
            grid.className += ' grid-chen';
            grid.style.height = '100px';
            label.appendChild(grid);

            obj = obj || [];
            grid.resetFromView(createView(schema, obj));
            grid.setEventListener('dataChanged', function (patches) {
                const pp = [];
                for (const patch of patches) {
                    const p = Object.assign({}, patch);
                    p.path = '/' + pointer.join('/') + p.path;
                    pp.push(p);
                }
                onDataChangedWrapper(pp);
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

    function bindArray(schema, obj, pointer, containerElement) {
        if (Array.isArray(schema.items)) {
            for (let [index, item] of Object.entries(schema.items)) {
                bindProperty(item, 0, obj[index], pointer.concat(index), containerElement);
            }
        } else {
            obj = obj || [];
            for (let [index, item] of Object.entries(obj)) {
                bindProperty(schema.items, index, item, pointer.concat(index), containerElement);
            }
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
            if (false && schema.items) {
                bindArray(schema, value, pointer, container);
            } else {
                bindObject(schema, value, pointer, container);
            }
            return
        }

        const label = createElement('label');
        let input;

        if (schema.type === 'boolean') {
            input = createElement('input');
            input.type = 'checkbox';
            input.checked = value == null ? false : value;
        } else if (schema.enum) {
            input = createElement('select');
            schema.enum.forEach(function (optionName) {
                const option = createElement('option');
                option.textContent = optionName;
                input.appendChild(option);
            });
            input.value = value;
        } else {
            input = createElement('input');
            input.style.textAlign = 'right';
            if (schema.readOnly) input.readOnly = true;

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
            const jp = new JSONPatch(topObj);
            let patch = {op: (value === undefined)?'add':'replace', path: '/' + pointer.join('/')};
            if (schema.type === 'boolean') {
                patch.value = input.checked;
            } else if (schema.enum) {
                patch.value = input.value;
            } else {
                const newValue = schema.converter.fromString(input.value.trim());
                if (newValue === '') {
                    patch.op = 'remove';
                } else {
                    patch.value = newValue;
                }
            }

            jp.push(patch);
            onDataChangedWrapper(jp.patch);
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
            return allPatches;
        }

        clearPatches() {
            allPatches.length = 0;
        }
    }

    return new FormChen();
}
