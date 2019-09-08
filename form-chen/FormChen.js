import "../grid-chen/GridChen.js"
import {createView} from "../grid-chen/DataViews.js";
import {
    NumberConverter,
    DateTimeStringConverter,
    FullDateStringConverter,
    DatePartialTimeStringConverter,
    StringConverter
} from "../grid-chen/converter.js";

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

/**
ProxyNode decorates a nested JavaScript value to make the object graph navigatable from child to parent.

Invariant:
   node.parent.obj[node.key] = node.obj

Example:
   node3.parent.obj['bar'] = 'foobar'

                  node1                        node2                    node3
         ------------------------        ------------------        ---------------
 obj    | {foo: {bar: 'foobar'}} |      | {bar: 'foobar'}} |      | 'foobar'      |
 parent | null                   |  <-  | node1            |  <-  | node2         |
 key    | ''                     |      | 'foo'            |      | 'bar'         |
         ------------------------        ------------------        ---------------
 */

class ProxyNode {
    static root;
    /** @type {*} */
    obj;
    /** @type {ProxyNode} */
    parent;
    /** @type {string} */
    key;
    /** @type {{properties?: Array<>, items?: Array|object, title: String, readOnly: boolean}} */
    schema;
    /** @type {Array<string>} */
    pointer;
    /** @type {string} */
    title;

    constructor(key, schema) {
        this.key = key;
        this.schema = this.resolveSchema(schema);
        if (schema.title == null) {
            this.title = this.schema.title || key;
        } else {
            this.title = schema.title;
        }
    }

    getPath() {
        if (this.parent) {
            return this.parent.getPath() + '/' + this.key
        }
        return ''
    }

    resolveSchema(schema) {
        if ('$ref' in schema) {
            const refSchema = getValueByPointer(ProxyNode.root, schema['$ref']);
            if (!refSchema) {
                throw new Error('Undefined $ref at ' + this.getPath());
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
        let child = this;
        while (n && n.obj == null) {
            let empty = n.schema.items ? [] : {};
            jsonPath.unshift({op: 'add', path: n.getPath(), value: empty});
            empty = n.schema.items ? [] : {};
            n.obj = empty;
            if (child) {
                n.obj[child.key] = child.obj;
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
 * @param {string} id
 * @param onDataChanged
 */
export function createFormChen(topSchema, topObj, id, onDataChanged) {
    ProxyNode.root = topSchema;
    const containerByPath = {};

    for (const elem of document.body.querySelectorAll('[data-path]')) {
        const prefixedJsonPath = elem.dataset.path.trim();
        if (prefixedJsonPath === id || prefixedJsonPath.startsWith(id + '/')) {
            const jsonPath = prefixedJsonPath.substr(id.length);
            containerByPath[jsonPath] = elem;
            elem.textContent = '';
        }
    }

    const allPatches = [];

    function onDataChangedWrapper(patches) {
        console.log(patches);
        allPatches.push(...patches);
        if (onDataChanged) onDataChanged(patches);
    }

    const rootNode = new ProxyNode('', topSchema);
    rootNode.obj = topObj;

    bindNode(rootNode, undefined);


    /**
     * @param {ProxyNode} node
     * @param {Element} containerElement
     */
    function bindObject(node, containerElement) {
        const properties = node.schema.properties || [];
        for (let [key, childSchema] of Object.entries(properties)) {
            const childNode = new ProxyNode(key, childSchema);
            childNode.parent = node;
            childNode.obj = node.obj ? node.obj[key] : undefined;
            bindNode(childNode, containerElement);
        }
    }

    /**
     * @param {ProxyNode} node
     * @param {Element} containerElement
     */
    function bindGrid(node, containerElement) {
        const label = createElement('label');
        label.textContent = node.title;
        containerElement.appendChild(label);

        const grid = createElement('grid-chen');
        if (node.schema.height) {
            grid.style.height = node.schema.height + 'px';
        }
        label.appendChild(grid);
        const view = createView(node.schema, node.obj);
        grid.resetFromView(view);
        grid.setEventListener('dataChanged', function (patches) {
            node.obj = view.getModel();
            const pp = node.createParents();
            for (const patch of patches) {
                const p = Object.assign({}, patch);
                p.path = node.getPath() + (p.path === '/' ? '' : p.path);
                pp.push(p);
            }
            onDataChangedWrapper(pp);
        });
    }

    function bindArray(node, containerElement) {
        if (Array.isArray(node.schema.items)) {
            for (let [key, childSchema] of Object.entries(node.schema.items)) {
                const childNode = new ProxyNode(key, childSchema);
                childNode.parent = node;
                childNode.obj = node.obj ? node.obj[key] : undefined;
                bindNode(childNode, containerElement);
            }
        } else if (node.obj) {
            for (let key=0; key < node.obj.length; key++) {
                const childNode = new ProxyNode(key, node.schema.items);
                childNode.parent = node;
                childNode.obj = node.obj[key];
                bindNode(childNode, containerElement);
            }
        }
    }

    function bindNode(node, container) {
        const path = node.getPath();

        if (path in containerByPath) {
            // Note: No need to find the best match of path in containerByPath, the recursive call to bindNode() takes
            // care of that.
            container = containerByPath[path];
        }

        try {
            bindNodeFailSafe(node, container)
        } catch (e) {
            console.error(e);
            if (container) {
                const label = createElement('label');
                label.className += ' error';
                label.textContent = String(e);
                container.appendChild(label);
            }
        }
    }


    function bindNodeFailSafe(node, container) {
        const schema = node.schema;
        const value = node.obj;
        const path = node.getPath();

        console.log('bind: ' + path);

        if (schema.format === 'grid') {
            if (container) bindGrid(node, container);
            return
        }

        if (schema.type === 'object') {
            if (schema.items) {
                bindArray(node, container);
            } else {
                bindObject(node, container);
            }
            return
        }

        if (!container) return;

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
                if (schema.format === 'color') {
                    input.type = 'color';
                } else {
                    input.type = 'string';
                }
                // input.setAttribute('list', 'enum')
                input.value = schema.converter.toEditable(value);
            }  else {
                throw Error('Invalid schema at ' + path);
            }
        }

        if (schema.readOnly && !(value == null)) {
            //input.readOnly = true;
            input.disabled = true;
        }

        input.onchange = function () {
            const patches = node.createParents();

            let patch = {op: (node.parent.obj[node.key] === undefined) ? 'add' : 'replace', path: path};
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
            node.parent.obj[node.key] = patch.value;
            onDataChangedWrapper(patches);
        };

        label.textContent = node.title;

        if (schema.description) {
            label.title = schema.description;
        }

        if (schema.unit) {
            const unit = createElement('span');
            unit.className += ' unit';
            unit.textContent = schema.unit;
            label.appendChild(unit);
        }

        label.setAttribute('for', 'form-chen-' + (labelCount));
        input.id = 'form-chen-' + (labelCount++);
        container.appendChild(label);
        container.appendChild(input);
    }

    class FormChen {
        constructor() {

        }

        /**
         * Returns the current value of the bound object.
         * @returns {*}
         */
        getValue() {
            return rootNode.obj
        }

        /**
         * Returns a patch set according to JSON Patch https://tools.ietf.org/html/rfc6902
         * @returns {Array<{op:string, path:string, value:*}>}
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
