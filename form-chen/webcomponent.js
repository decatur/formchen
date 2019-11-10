//@ts-check

import "../grid-chen/webcomponent.js"
import {createView} from "../grid-chen/matrixview.js";
import {Range} from "../grid-chen/selection.js";
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

 class Graph {
     /**
      * @param {GridChenNS.JSONSchema} rootSchema
      */
     constructor(rootSchema) {
        this.rootSchema = rootSchema;
        /** @type{{[key: string]: TypedValue}} */
        //this.nodesByPath = {};
        /** @type{TypedValue[]} */
        this.nodes = [];
     }

     /**
      * @param {TypedValue} node 
      */
     add(node) {
         this.nodes.push(node);
     }

     /**
      * @param {string} path 
      * @returns {TypedValue}
      */
     getNode(path) {
        for (const node of this.nodes) {
            if (node.path === path) {
                return node
            }
        }
        return null;
     }

    /**
      * TODO: Move this to createFormChen()
      * @param {GridChenNS.JSONSchema} schema
      * @param {string} path
      * @returns {GridChenNS.JSONSchema}
      */
    resolveSchema(schema, path) {
        if ('$ref' in schema) {
            const refSchema = getValueByPointer(this.rootSchema, schema['$ref']);
            if (!refSchema) {
                throw new Error('Undefined $ref at ' + path);
            }
            return refSchema
        }
        return schema
    }
 }

export class TypedValue {

    /**  @type {Graph} graph */
    graph;

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

    /** @type{GridChenNS.GridChen} */
    grid;

    /**
     * @param {Graph} graph
     * @param {string | number} key
     * @param {GridChenNS.JSONSchema} schema
     * @param {ProxyNode} parent
     */
    constructor(graph, key, schema, parent) {
        this.graph = graph;
        this.parent = parent;
        this.key = key;
        if (typeof schema.readOnly === 'boolean') {
            this.readOnly = schema.readOnly
        } else if (parent) {
            // Inherit read only.
            this.readOnly = parent.readOnly;
        }
        this.schema = graph.resolveSchema(schema, this.path);
        if (schema.title == null) {
            this.title = this.schema.title || String(key);
        } else {
            this.title = schema.title;
        }
        
        if (parent) {
            parent.children.push(this);
        }
    }

    /**
     * @returns {string}
     */
    get path() {
        /** @type{TypedValue} */
        let n = this;
        let parts = [];
        while (n) {
            parts.unshift(String(n.key));
            n = n.parent;
        }
        return parts.join('/');
    }

    // /**
    //  * @returns {TypedValue}
    //  */
    // get root() {
    //     /** @type{TypedValue} */
    //     let n = this;
    //     while (n.parent) {
    //         n = n.parent;
    //     }
    //     return n;
    // }

    getValue() {
        if (this.parent.obj) {
            return this.parent.obj[this.key]
        }
        return undefined;
    }

    

    /**
     * @param {object} obj
     * @returns {GridChenNS.Patch}
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

        const patch = /** @type {GridChenNS.Patch} */ {
            apply: (patch) => {
                for (let op of patch.operations) {
                    let node = this.graph.getNode(op.path);
                    if (node == null) {
                        const gridNode = this.graph.getNode('/measurements');
                        let index = gridNode.grid.selectedRange.rowIndex;
                        const detailNode = this.graph.getNode('/measurements/' + index + '/3');
                        // TODO: Refactor...
                        index = patch.details.selectedRange.rowIndex;
                        detailNode.obj = gridNode.obj[index]?gridNode.obj[index][3]:null;
                        detailNode.key = gridNode.path + '/' + index + '/3';
                        node = this.graph.getNode('/measurements/' + index + '/3/foo');
                        gridNode.grid.select(patch.details.selectedRange);
                    }
                    node._setValue(op.value);
                }
            },
            operations: [],
            pathPrefix: this.graph.rootSchema.pathPrefix || ''
        };

        let n = this;
        while(n) {
            if (n.grid) {
                // TODO: This does not handle multi-master-detail cases!
                patch.details = { selectedRange: n.grid.selectedRange };
                break;
            }
            n = n.parent;
        }

        if (obj == oldValue) {
            return patch
        }
        
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

        this.refreshUI();
    }

    /**
     * @returns {GridChenNS.JSONPatchOperation[]}
     */
    createPathToRoot() {
        let operations = [];
        let n = this.parent;
        /** @type{TypedValue} */
        let child = this;
        while (n && n.obj == null) {
            let empty = n.schema.items ? [] : {};
            operations.unshift({op: 'add', path: n.path, value: empty});
            empty = n.schema.items ? [] : {};
            n.obj = empty;
            if (n.foo) n.foo();
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
        /** @type{TypedValue} */
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

    refreshUI() {
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
     * @param {Graph} graph
     * @param {string | number} key
     * @param {GridChenNS.JSONSchema} schema
     * @param {ProxyNode} parent
     */
    constructor(graph, key, schema, parent) {
        super(graph, key, schema, parent)
        this.children = [];
    }

    

    _setValue(obj) {
        super._setValue(obj);

        for (let child of this.children) {
            child._setValue((obj==null?undefined:obj[child.key]));
        }
    }

    
}


/**
 * @param {GridChenNS.JSONSchema} topSchema
 * @param {object} topObj
 */
export function createFormChen(topSchema, topObj) {
    const containerByPath = {};
    const errors = [];
    const pathPrefix = topSchema.pathPrefix || '';
    const graph = new Graph(topSchema);

    for (const _elem of document.body.querySelectorAll('[data-path]')) {
        const elem = /**@type{HTMLElement}*/ (_elem);
        const prefixedJsonPath = elem.dataset.path.trim();
        if (prefixedJsonPath === pathPrefix || prefixedJsonPath.startsWith(pathPrefix + '/')) {
            const jsonPath = prefixedJsonPath.substr(pathPrefix.length);
            containerByPath[jsonPath] = elem;
            elem.textContent = '';
            // /** @param {KeyboardEvent} evt */
            // elem.onkeydown = function (evt) {
            //     if (evt.code === 'KeyA' && evt.ctrlKey) {
            //         alert(evt.target.id)
            //     }
            // }
        }
    }

    /**
     * @param {string | number} key
     * @param {GridChenNS.JSONSchema} schema
     * @param {ProxyNode} parent
     */
    function createProxyNode(key, schema, parent) {
        const node = new ProxyNode(graph, key, schema, parent);
        graph.add(node);
        return node;
    }

    const rootNode = createProxyNode('', topSchema, null);
    const transactionManager = registerGlobalTransactionManager();

    /**
     * @param {GridChenNS.Patch} patch
     */
    function apply(patch) {
        rootNode.obj = applyJSONPatch(rootNode.obj, patch.operations);
        for (let op of patch.operations) {
            const node = graph.getNode(op.path);
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
     * @param {TypedValue} node
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
        node.grid = grid;
        const gridSchema = Object.assign({}, node.schema);

        const view = createView(gridSchema, node.obj);
        grid.resetFromView(view, transactionManager);
        view.updateHolder = function() {
            return node.setValue(view.getModel())
        };

        if (view.schema.detailSchemas.length) {
            const detailSchema = view.schema.detailSchemas[0];
            const detailNode = createProxyNode(undefined, detailSchema, null);
            detailNode.grid = grid;
            bindNode(detailNode, containerElement);

            grid.addEventListener('selectionChanged', function() {
                const selection = grid.selectedRange;
                const index = selection.rowIndex;
                const {path, value} = view.getDetail(index, 0);
                detailNode.obj = value;
                detailNode.key = node.path + path;
                detailNode.foo = function() {
                    if (!value) view.setDetail(index, 0, detailNode.obj);
                }
                for (const n of detailNode.children)
                    n.refreshUI();
            });
        }

        node.refreshUI = function() {
            view.applyJSONPatch([{op:'replace', path:'', value:node.obj}]);
            grid._refresh();
        }
    }

    /**
     * @param {ProxyNode} node
     * @param {HTMLElement} containerElement
     */
    function bindTuple(node, containerElement) {
        if (Array.isArray(node.schema.items)) {
            // Fixed length tuple.
            const tupleSchemas = /**@type{GridChenNS.JSONSchema[]}*/ (node.schema.items);
            for (let [key, childSchema] of Object.entries(tupleSchemas)) {
                const childNode = createProxyNode(key, childSchema, node);
                //childNode.obj = node.obj ? node.obj[key] : undefined;
                bindNode(childNode, containerElement);
            }
        } 
        // else if (node.obj) {
        //     const itemSchema = /**@type{GridChenNS.JSONSchema}*/ (node.schema.items);
        //     for (let key = 0; key < node.obj.length; key++) {
        //         const childNode = createProxyNode(key, itemSchema, node);
        //         childNode.obj = node.obj[key];
        //         bindNode(childNode, containerElement);
        //     }
        // }
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

    /**
     * 
     * @param {TypedValue} node 
     * @param {HTMLElement} container 
     */
    function bindNodeFailSafe(node, container) {
        const schema = node.schema;
        const value = node.obj;
        const path = node.path;

        console.log('bind: ' + path);

        

        if (schema.type === 'object') {
            bindObject(/**@type{ProxyNode}*/(node), container);
            return
        }

        if (schema.type === 'array') {
            if (schema.format === 'grid') {
                if (container) bindGrid(node, container);
            } else {
                bindTuple(/**@type{ProxyNode}*/(node), container);
            }
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
                option.textContent = String(optionName);
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
         * @returns {TypedValue}
         */
        getNode(path) {
            return graph.getNode(path);
        }
    }

    return new FormChen();
}
