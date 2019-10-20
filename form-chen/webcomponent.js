import "../grid-chen/webcomponent.js"
import {createView} from "../grid-chen/matrixview.js";
import {
    NumberConverter,
    DateTimeStringConverter,
    FullDateStringConverter,
    DatePartialTimeStringConverter,
    StringConverter
} from "../grid-chen/converter.js";
import {registerGlobalTransactionManager, applyJSONPatch} from "../grid-chen/utils.js";

class CompositeError extends Error {
    name = 'CompositeError';
    constructor(errors) {
        super();
        this.errors = errors;
    }
}

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
 ProxyNode decorates a nested JavaScript value to make the object graph navigable from child to parent.

 Invariant:
 node.parent.obj[node.key] = node.obj

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
    /** @type {GridChen.JSONSchema} */
    schema;
    /** @type {string} */
    title;
    /** @type {boolean} */
    readOnly = false;

    /**
     * @param {string} key
     * @param {GridChen.JSONSchema} schema
     * @param {ProxyNode} parent
     */
    constructor(key, schema, parent) {
        this.key = key;
        this.parent = parent;
        if (typeof schema.readOnly === 'boolean') {
            this.readOnly = schema.readOnly
        } else if (parent) {
            // Inherit read only.
            this.readOnly = parent.readOnly;
        }
        this.schema = this.resolveSchema(schema);
        if (schema.title == null) {
            this.title = this.schema.title || key;
        } else {
            this.title = schema.title;
        }
        this._path = (this.parent ? this.parent._path + '/' + this.key : '')
    }

    /**
     * @returns {string}
     */
    get path() {
        return this._path
    }

    getValue() {
        if (this.parent.obj) {
            return this.parent.obj[this.key]
        }
        return undefined;
    }

    resolveSchema(schema) {
        if ('$ref' in schema) {
            const refSchema = getValueByPointer(ProxyNode.root, schema['$ref']);
            if (!refSchema) {
                throw new Error('Undefined $ref at ' + this.path);
            }
            return refSchema
        }
        return schema
    }

    /**
     * @returns {GridChen.JSONPatch}
     */
    createParents() {
        /** @type {GridChen.JSONPatch} */
        const jsonPatch = [];
        let n = this.parent;
        let child = this;
        while (n && n.obj == null) {
            let empty = n.schema.items ? [] : {};
            jsonPatch.unshift({op: 'add', path: n.path, value: empty});
            empty = n.schema.items ? [] : {};
            n.obj = empty;
            if (child) {
                n.obj[child.key] = child.obj;
            }
            child = n;
            n = n.parent;
        }
        return jsonPatch
    }
}

/**
 * @param {GridChen.JSONSchema} topSchema
 * @param {object} topObj
 */
export function createFormChen(topSchema, topObj) {
    ProxyNode.root = topSchema;
    const containerByPath = {};
    const nodesByPath = {};
    const errors = [];
    const pathPrefix = topSchema.pathPrefix || '';

    for (const elem of document.body.querySelectorAll('[data-path]')) {
        const prefixedJsonPath = elem.dataset.path.trim();
        if (prefixedJsonPath === pathPrefix || prefixedJsonPath.startsWith(pathPrefix + '/')) {
            const jsonPath = prefixedJsonPath.substr(pathPrefix.length);
            containerByPath[jsonPath] = elem;
            elem.textContent = '';
        }
    }

    /**
     * @param {string} key
     * @param {GridChen.JSONSchema} schema
     * @param {ProxyNode} parent
     */
    function createProxyNode(key, schema, parent) {
        const node = new ProxyNode(key, schema, parent);
        nodesByPath[node.path] = node;
        return node;
    }

    const rootNode = createProxyNode('', topSchema, null);
    rootNode.obj = topObj;

    const tm = registerGlobalTransactionManager();

    function applyTransaction(trans) {
        rootNode.obj = applyJSONPatch(rootNode.obj, trans.patch);
        for (let op of trans.patch) {
            const node = nodesByPath[op.path];
            if (node.refreshUI) {
                node.refreshUI();
            }
        }
    }

    bindNode(rootNode, undefined);

    if (errors.length) {
        throw new CompositeError(errors);
    }

    for (let path of Object.keys(nodesByPath)) {
        const node = nodesByPath[path];
        if (node.refreshUI) {
            node.refreshUI();
        }
    }

    /**
     * @param {ProxyNode} node
     * @param {Element} containerElement
     */
    function bindObject(node, containerElement) {
        const properties = node.schema.properties || [];
        for (let [key, childSchema] of Object.entries(properties)) {
            const childNode = createProxyNode(key, childSchema, node);
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
        label.className = 'grid-label';
        label.textContent = node.title;
        containerElement.appendChild(label);

        const grid = createElement('grid-chen');
        if (node.schema.height) {
            grid.style.height = node.schema.height + 'px';
        }
        label.appendChild(grid);
        node.schema.readOnly = node.readOnly;  // schema is mutated anyway by createView.
        node.schema.pathPrefix = node.path;
        const view = createView(node.schema, node.obj);
        grid.resetFromView(view, tm);
    }

    /**
     * @param {ProxyNode} node
     * @param {HTMLElement} containerElement
     */
    function bindArray(node, containerElement) {
        if (Array.isArray(node.schema.items)) {
            // Fixed length tuple.
            const tupleSchemas = /**@type{GridChen.JSONSchema[]}*/ node.schema.items;
            for (let [key, childSchema] of Object.entries(tupleSchemas)) {
                const childNode = createProxyNode(key, childSchema, node);
                childNode.obj = node.obj ? node.obj[key] : undefined;
                bindNode(childNode, containerElement);
            }
        } else if (node.obj) {
            const itemSchema = /**@type{GridChen.JSONSchema}*/ node.schema.items;
            for (let key = 0; key < node.obj.length; key++) {
                const childNode = createProxyNode(String(key), itemSchema, node);
                childNode.obj = node.obj[key];
                bindNode(childNode, containerElement);
            }
        }
    }

    function bindNode(node, container) {
        const path = node.path;

        if (path in containerByPath) {
            // Note: No need to find the best match of path in containerByPath, the recursive call to bindNode() takes
            // care of that.
            container = containerByPath[path];
        }

        try {
            bindNodeFailSafe(node, container)
        } catch (e) {
            console.error(e);
            errors.push(e);
        }
    }

    function bindNodeFailSafe(node, container) {
        const schema = node.schema;
        const value = node.obj;
        const path = node.path;

        console.log('bind: ' + path);

        if (schema.format === 'grid') {
            if (container) bindGrid(node, container);
            return
        }

        if (schema.type === 'object') {
            bindObject(node, container);
            return
        }

        if (schema.type === 'array') {
            bindArray(node, container);
            return
        }

        if (!container) return;

        const label = createElement('label');
        let input;

        if (schema.type === 'boolean') {
            input = createElement('input');
            input.type = 'checkbox';
            node.refreshUI = function () {
                const value = this.getValue();
                input.checked = (value == null ? false : value);
            };
        } else if (schema.enum) {
            input = createElement('select');
            schema.enum.forEach(function (optionName) {
                const option = createElement('option');
                option.textContent = optionName;
                input.appendChild(option);
            });
            node.refreshUI = function () {
                input.value = this.getValue();
            };
        } else {
            input = createElement('input');
            node.refreshUI = function () {
                const value = this.getValue();
                if (value == null) {
                    input.value = '';
                } else {
                    input.value = this.schema.converter.toEditable(value);
                }
            };

            if (schema.type === 'integer') {
                if (!schema.converter) {
                    schema.converter = new NumberConverter(0);
                }
            } else if (schema.type === 'number') {
                if (!schema.converter) {
                    schema.converter = new NumberConverter(schema.fractionDigits || 2);
                }
            } else if (schema.format === 'date-time') {
                if (!schema.converter) {
                    schema.converter = new DateTimeStringConverter();
                }
            } else if (schema.format === 'date-partial-time') {
                if (!schema.converter) {
                    schema.converter = new DatePartialTimeStringConverter();
                }
            } else if (schema.format === 'full-date') {
                if (!schema.converter) {
                    schema.converter = new FullDateStringConverter();
                }
            } else if (schema.type === 'string') {
                if (!schema.converter) {
                    schema.converter = new StringConverter();
                }
                if (schema.format === 'color') {
                    input.type = 'color';
                } else {
                    input.type = 'string';
                }
            } else {
                throw Error('Invalid schema at ' + path);
            }
        }

        if (node.readOnly && !(value == null)) {
            input.disabled = true;
        }

        input.onchange = function () {
            const patch = node.createParents();

            let op = {op: (node.parent.obj[node.key] === undefined) ? 'add' : 'replace', path: path};
            if (schema.type === 'boolean') {
                op.value = input.checked;
            } else if (schema.enum) {
                op.value = input.value;
            } else {
                const newValue = schema.converter.fromEditable(input.value.trim());
                if (newValue === '') {
                    op.op = 'remove';
                } else {
                    op.value = newValue;
                }
            }

            op.oldValue = node.parent.obj[node.key];
            patch.push(op);
            node.parent.obj[node.key] = op.value;
            const trans = tm.openTransaction(applyTransaction);
            trans.patch = patch;
            trans.commit();
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

    /**
     * @implements {FormChen.FormChen}
     */
    class FormChen {
        /**
         * Returns the current value of the bound object.
         * @returns {*}
         */
        get value() {
            return rootNode.obj
        }
    }

    return new FormChen();
}
