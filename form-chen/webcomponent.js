//@ts-check

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

/**
 * Example:
 *      getValueByPointer({definitions:{foobar: 1}}, '#/definitions/foobar')
 *      -> 1
 * @param {object} obj
 * @param {string} pointer
 * @returns {object}
 */
function getValueByPointer(obj, pointer) {
    return pointer.substr(2).split('/').reduce(((res, prop) => res[prop]), obj);
}

/**
 TypedValue decorates a (possibly nested) JavaScript value and its type (via schema).
 It also makes the type graph navigable from child to parent and from parent to child.

 ------------------------              ------------------            ---------------
 obj    | {foo: {bar: 'foobar'}} |   parent   | {bar: 'foobar'}} |  parent  | 'undefined     |
 key    | ''                     |     <-     | 'foo'            |    <-    | 'bar'         |
 ------------------------              ------------------            ---------------
 */

export class TypedValue {

    /** @type {ProxyNode} */
    parent;

    /**
     * The key in the parent object for this obj, i.e. node.parent.obj[node.key] = node.obj.
     * @type {string|number}
     */
    key;

    /** @type {GridChenNS.JSONSchema} */
    schema;

    /** @type {string} */
    title;

    /** @type {boolean} */
    readOnly = false;

    /**
     * @param {string} key
     * @param {GridChenNS.JSONSchema} schema
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
        this._path = (this.parent ? this.parent._path + '/' + this.key : '');
        if (parent) {
            parent.children.push(this);
        }
    }
}

export class ProxyNode extends TypedValue {
    /**
     * Value in the object graph node or undefined if a leave node.
     * @type {*}
     */
    obj;

    /**
     * @type {TypedValue[]}
     */
    children;

    /**
     * @param {string} key
     * @param {GridChenNS.JSONSchema} schema
     * @param {ProxyNode} parent
     */
    constructor(key, schema, parent) {
        super(key, schema, parent)

        this.children = [];

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

    /**
     * @returns {ProxyNode}
     */
    get root() {
        let n = this;
        while (n.parent) {
            n = n.parent;
        }
        return n;
    }

    resolveSchema(schema) {
        if ('$ref' in schema) {
            const refSchema = getValueByPointer(this.root.schema, schema['$ref']);
            if (!refSchema) {
                throw new Error('Undefined $ref at ' + this.path);
            }
            return refSchema
        }
        return schema
    }

    refreshUI() {
    }

    /**
     * @param {object} obj
     * @returns {GridChenNS.Patch | undefined}
     */
    setValue(obj) {
        let oldValue;
        if (['object', 'array'].includes(this.schema.type)) {
            oldValue = this.obj;
        } else if (this.parent.obj == null) {
            oldValue = undefined;
        } else {
            oldValue = this.parent.obj[this.key];
        }

        if (obj == oldValue) {
            return undefined
        }

        const root = this.root;
        const patch = /** @type {GridChenNS.Patch} */ {
            apply(patch) {
                for (let op of patch.operations) {
                    const node = root.nodesByPath[op.path];
                    node._setValue(op.value);
                }
            },
            operations: [],
            //node: this.root,
            pathPrefix: this.root.schema.pathPrefix || ''
        };

        if (obj == null) {
            patch.operations.push({op: 'remove', path: this.path, oldValue});
        } else if (oldValue == null) {
            patch.operations.push(...this.createPathToRoot());
            patch.operations.push({op: 'add', path: this.path, value: obj});
        } else {
            patch.operations.push({op: 'replace', path: this.path, value: obj, oldValue});
        }

        this._setValue(obj);

        if (obj == null) {
            patch.operations.push(...this.clearPathToRoot());
        }

        return patch
    }

    _setValue(obj) {
        if (['object', 'array'].includes(this.schema.type)) {
            if (obj == null) {
                delete this.obj;
            } else {
                this.obj = obj;
            }
        }

        if (this.parent) {
            if (obj == null) {
                if (!(this.parent.obj == null)) {
                    delete this.parent.obj[this.key];
                }
            } else {
                this.parent.obj[this.key] = obj;
            }
        }

        for (let child of this.children) {
            child._setValue((obj==null?undefined:obj[child.key]));
        }

        this.refreshUI();
    }

    /**
     * @returns {GridChenNS.JSONPatchOperation[]}
     */
    createPathToRoot() {
        let operations = [];
        let n = this.parent;
        let child = this;
        while (n && n.obj == null) {
            let empty = n.schema.items ? [] : {};
            operations.unshift({op: 'add', path: n.path, value: empty});
            empty = n.schema.items ? [] : {};
            n.obj = empty;
            if (child) {
                n.obj[child.key] = child.obj;
            }
            child = n;
            n = n.parent;
        }
        return operations
    }

    /**
     * Removes the value for this node.
     * If the parent holder object thus will become empty, it is also removed.
     * This will continue to the root.
     * @returns {GridChenNS.JSONPatchOperation[]}
     */
    clearPathToRoot() {
        let operations = [];
        let n = this;
        while (true) {
            n = n.parent;
            if (!n) break
            if (n.obj == null) break;
            if ((n.schema.type === 'object' ? Object.values(n.obj) : n.obj).length === 0) {
                let oldValue = n.obj;
                delete n.obj;
                if (n.parent) {
                    oldValue = n.parent.obj[n.key];
                    delete n.parent.obj[n.key];
                }
                operations.push({op: 'remove', path: n.path, oldValue});
            } else {
                break;
            }
        }

        return operations
    }
}


/**
 * @param {GridChenNS.JSONSchema} topSchema
 * @param {object} topObj
 */
export function createFormChen(topSchema, topObj) {
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
            elem.onkeydown = function (evt) {
                if (evt.code === 'KeyA' && evt.ctrlKey) {
                    alert(evt.target.id)
                }
            }
        }
    }

    /**
     * @param {string} key
     * @param {GridChenNS.JSONSchema} schema
     * @param {ProxyNode} parent
     */
    function createProxyNode(key, schema, parent) {
        const node = new ProxyNode(key, schema, parent);
        nodesByPath[node.path] = node;
        return node;
    }

    const rootNode = createProxyNode('', topSchema, null);
    rootNode.nodesByPath = nodesByPath;
    const transactionManager = registerGlobalTransactionManager();

    /**
     * @param {GridChenNS.Patch} patch
     */
    function apply(patch) {
        rootNode.obj = applyJSONPatch(rootNode.obj, patch.operations);
        for (let op of patch.operations) {
            const node = nodesByPath[op.path];
            node.refreshUI();
        }
    }

    bindNode(rootNode, undefined);

    if (errors.length) {
        throw new CompositeError(errors);
    }

    rootNode.setValue(topObj);

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
        const label = document.createElement('label');
        label.className = 'grid-label';
        label.textContent = node.title;
        containerElement.appendChild(label);

        const grid = /** @type{GridChenNS.GridChen} */ (document.createElement('grid-chen'));
        if (node.schema.height) {
            grid.style.height = node.schema.height + 'px';
        }
        label.appendChild(grid);
        node.schema.readOnly = node.readOnly;  // schema is mutated anyway by createView.
        node.schema.pathPrefix = node.path;

        const view = createView(node.schema, node.obj);
        grid.resetFromView(view, transactionManager);
        view.updateHolder = function() {
            return node.setValue(view.getModel())
        };

        node.refreshUI = function() {
            view.applyJSONPatch([{op:'replace', path:'', value:node.obj}]);
            grid._refresh();
        }
    }

    /**
     * @param {ProxyNode} node
     * @param {HTMLElement} containerElement
     */
    function bindArray(node, containerElement) {
        if (Array.isArray(node.schema.items)) {
            // Fixed length tuple.
            const tupleSchemas = /**@type{GridChenNS.JSONSchema[]}*/ node.schema.items;
            for (let [key, childSchema] of Object.entries(tupleSchemas)) {
                const childNode = createProxyNode(key, childSchema, node);
                childNode.obj = node.obj ? node.obj[key] : undefined;
                bindNode(childNode, containerElement);
            }
        } else if (node.obj) {
            const itemSchema = /**@type{GridChenNS.JSONSchema}*/ (node.schema.items);
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

        const label = document.createElement('label');
        let input;

        if (schema.type === 'boolean') {
            input = document.createElement('input');
            input.type = 'checkbox';
            node.refreshUI = function () {
                const value = this.getValue();
                input.checked = (value == null ? false : value);
            };
        } else if (schema.enum) {
            input = document.createElement('select');
            schema.enum.forEach(function (optionName) {
                const option = document.createElement('option');
                option.textContent = optionName;
                input.appendChild(option);
            });
            node.refreshUI = function () {
                input.value = this.getValue();
            };
        } else {
            input = document.createElement('input');
            node.refreshUI = function () {
                const value = this.getValue();
                if (value == null) {
                    input.defaultValue = input.value = '';
                } else {
                    input.defaultValue = input.value = this.schema.converter.toEditable(value);
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
            let value;

            if (schema.type === 'boolean') {
                value = input.checked;
            } else if (schema.enum) {
                value = input.value;
            } else {
                const newValue = schema.converter.fromEditable(input.value.trim());
                if (newValue === '') {
                    value = undefined;
                } else {
                    value = newValue;
                }
            }

            const patch = node.setValue(value);
            const trans = transactionManager.openTransaction();
            trans.patches.push(patch);
            trans.commit();
        };

        label.textContent = node.title;

        if (schema.description) {
            label.title = schema.description;
        }

        if (schema.unit) {
            const unit = document.createElement('span');
            unit.className += ' unit';
            unit.textContent = schema.unit;
            label.appendChild(unit);
        }


        label.setAttribute('for', node.path);
        input.id = node.path;
        container.appendChild(label);
        container.appendChild(input);
    }

    /**
     * @implements {FormChenNS.FormChen}
     */
    class FormChen {
        /**
         * Returns the current value of the bound object.
         * @returns {*}
         */
        get value() {
            return rootNode.obj
        }

        /**
         * @param {string} path
         * @returns {ProxyNode}
         */
        getNode(path) {
            return nodesByPath[path];
        }
    }

    return new FormChen();
}
