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
    return document.createElement(tagName)
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

/*class JSONPatch {
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
}*/

class ProxyNode {
    static root;
    /** @type {ProxyNode} */
    parent;
    /** @type {{properties?: Array<>, items?: Array|object, title: String, readOnly: boolean}} */
    schema;
    /** @type {Array<string>} */
    pointer;
    /** @type {*} */
    obj;
    /** @type {string} */
    title;

    constructor(pointer, schema) {
        this.pointer = pointer;
        this.schema = this.resolveSchema(schema);
    }

    resolveSchema(schema) {
        if ('$ref' in schema) {
            // Resolve reference. Note that we do not use the title of the referenced schema.
            const refSchema = getValueByPointer(ProxyNode.root, schema['$ref']);
            if (!refSchema) {
                throw new Error('Undefined $ref at ' + this.pointer);
            }
            return refSchema
        }
        return schema
    }

    /**
     * @returns {Array}
     */
    createParents() {
        const jsonPath = [];
        let n = this.parent;
        let child;
        while (n && n.obj == null) {
            let empty = n.schema.items ? [] : {};
            jsonPath.unshift({op: 'add', path: '/' + n.pointer.join('/'), value: empty});
            empty = n.schema.items ? [] : {};
            n.obj = empty;
            if (child) {
                n.obj[child.pointer.slice(-1)[0]] = child.obj;
            }
            child = n;
            n = n.parent;
        }
        return jsonPath
    }

}

/**
 * @param {{properties: Array<>, title: String}} topSchema
 * @param {object} topObj
 * @param {Element} topContainer
 * @param onDataChanged
 */
export function createFormChen(topSchema, topObj, topContainer, onDataChanged) {
    ProxyNode.root = topSchema;
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

    const rootNode = new ProxyNode([], topSchema);
    rootNode.obj = topObj;

    bindNode(rootNode, topContainer);


    /**
     * @param {ProxyNode} node
     * @param {Element} containerElement
     */
    function bindObject(node, containerElement) {
        const obj = node.obj;
        const pointer = node.pointer;

        if (!containerElement.className.includes('fields')) {
            containerElement.className += ' fields';
        }

        const properties = node.schema.properties || [];
        for (let key in properties) {
            const childNode = new ProxyNode(pointer.concat(key), properties[key]);
            childNode.parent = node;
            childNode.obj = obj ? obj[key] : undefined;
            childNode.title = childNode.schema.title || key;
            bindNode(childNode, containerElement);
        }
    }

    /**
     * @param {ProxyNode} node
     * @param {Element} containerElement
     */
    function bindGrid(node, containerElement) {
        const label = createElement('label');
        //label.className += ' grid-label';
        label.style.display = 'block';
        label.textContent = node.title;
        containerElement.appendChild(label);

        const grid = createElement('grid-chen');
        grid.className += ' grid-chen';
        grid.style.height = '100px';
        label.appendChild(grid);
        const view = createView(node.schema, node.obj);
        grid.resetFromView(view);
        grid.setEventListener('dataChanged', function (patches) {
            const pp = node.createParents();
            for (const patch of patches) {
                const p = Object.assign({}, patch);
                p.path = '/' + node.pointer.join('/') + (p.path === '/' ? '' : p.path);
                pp.push(p);
            }
            onDataChangedWrapper(pp);
        });
    }

    function bindArray(schema, obj, pointer, containerElement) {
        if (Array.isArray(schema.items)) {
            for (let [index, item] of Object.entries(schema.items)) {
                bindNode(item, 0, obj[index], pointer.concat(index), containerElement);
            }
        } else {
            obj = obj || [];
            for (let [index, item] of Object.entries(obj)) {
                bindNode(schema.items, index, item, pointer.concat(index), containerElement);
            }
        }
    }

    function bindNode(node, container) {
        function createError(title, text) {
            const label = createElement('label');
            label.textContent = title;
            container.appendChild(label);
            const span = createElement('span');
            span.className += ' error';
            span.textContent = text;
            container.appendChild(span);
        }

        const schema = node.schema;
        const value = node.obj;
        const pointer = node.pointer;
        const path = '/' + pointer.join('/');

        if (path in containerByPath) {
            container = containerByPath[path];
            const fieldset = createElement('div');
            fieldset.textContent = path + ' -> ' + schema.title;
            container.appendChild(fieldset);
        }

        console.log('bind: ' + pointer);

        if (schema.format === 'grid') {
            bindGrid(node, container);
            return
        }

        if (schema.type === 'object') {
            if (false && schema.items) {
                bindArray(schema, value, pointer, container);
            } else {
                bindObject(node, container);
            }
            return
        }

        const isPercent = schema.unit === '[%]';
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
                createError(node.title, 'Invalid schema at ' + pointer);
                return
            }
        }

        if (schema.readOnly && !(value == null)) {
            //input.readOnly = true;
            input.disabled = true;
        }

        input.style.width = '25ex';

        input.onchange = function () {
            const patches = node.createParents();

            let patch = {op: (node.parent.obj[node.pointer.slice(-1)[0]] === undefined) ? 'add' : 'replace', path: '/' + pointer.join('/')};
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

            patches.push(patch);
            node.parent.obj[node.pointer.slice(-1)[0]] = patch.value;
            onDataChangedWrapper(patches);
        };

        label.textContent = node.title;

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

        getValue() {
            return rootNode.obj
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
