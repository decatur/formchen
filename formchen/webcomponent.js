/** @import { Patch, JSONPatchOperation, GridChen as IGridChen, JSONSchema, TransactionManager } from "../gridchen/gridchen" */
/** @import { Graph as IGraph, BaseNode, HolderNode } from "./formchen-internal" */
/** @import { IFormChen } from "./formchen" */

import "../gridchen/webcomponent.js"
import { createView } from "../gridchen/matrixview.js";
import {
    NumberConverter,
    DateTimeStringConverter,
    DatePartialTimeStringConverter,
    StringConverter
} from "../gridchen/converter.js";

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
 * @param {string} id
 * @returns {HTMLElement}
 */
function getElementById(id) {
    let element = document.getElementById(id);
    if (!element) throw Error(`No such element with id ${id}`);
    return element;
}

/**
 * @param {HTMLElement} parent
 * @param {string} selector
 * @returns {HTMLElement}
 */
function querySelector(parent, selector) {
    /**@type{HTMLElement | null}*/
    let element = parent.querySelector(selector);
    if (!element) throw Error(`No such element with selector ${selector}`);
    return element;
}

/**
 * @implements {IGraph}
 */
export class Graph {
    /**
     * @param {string} pathPrefix
     */
    constructor(pathPrefix) {
        this.pathPrefix = pathPrefix;
        this.nodesById = {};
    }

    /**
     * @param {BaseNode} node 
     */
    add(node) {
        this.nodesById[node.id] = node;
    }

    /**
     * @param {string} id 
     * @returns {BaseNode}
     */
    getNodeById(id) {
        return this.nodesById[id]
    }
}

/**
 * BaseNode decorates a (possibly nested) JavaScript value and its type (via JSON Schema).
 * It also makes the type graph navigable from child to parent and from parent to child.
 *
 *         ------------------------              ------------------            ---------------
 * obj    | {foo: {bar: 'foobar'}} |   parent   | {bar: 'foobar'}} |  parent  |               |
 * key    | ''                     |     <-     | 'foo'            |    <-    | 'bar'         |
 *         ------------------------              ------------------            ---------------
 */

/**
 * @implements{BaseNode}
 */
export class BaseNodeClass {

    /**
     * @param {Graph} graph
     * @param {string} relId
     * @param {string | number} key
     * @param {JSONSchema} schema
     * @param {HolderNode} parent
     */
    constructor(graph, relId, key, schema, parent) {
        if (!parent && relId === '') {
            this.id = schema.pathPrefix;
        } else {
            this.id = relId[0] === '/' ? relId : ((parent ? parent.id : '') + '/' + String(relId));
        }
        this.graph = graph;
        if (parent) {
            this.parent = parent;
            this.tm = parent.tm;
        }
        this.key = key;
        //if (this.key !== undefined) {
        //    this.path = (this.parent?this.parent.path + '/' + key:String(key));
        //}
        if (typeof schema.readOnly === 'boolean') {
            this.readOnly = schema.readOnly
        } else if (typeof schema.editable === 'boolean') {
            this.readOnly = !schema.editable;
        } else if (parent) {
            // Inherit read only.
            this.readOnly = parent.readOnly;
        }
        this.schema = schema;
        if (schema.title == null) {
            this.title = this.schema.title || String(relId);
        } else {
            this.title = schema.title;
        }
        if (schema.tooltip) {
            this.tooltip = schema.tooltip;
        }

        if (parent) {
            parent.children.push(this);
        }

        graph.add(this);
    }

    getValue() {
        if (this.parent && this.parent.obj) {
            return this.parent.obj[this.key]
        }
        return undefined;
    }

    /**
     * @param {?} obj
     * @returns {Patch}
     */
    setValue(obj) {
        let oldValue = this.getValue();
        const graph = this.graph;

        /** @implements {Patch} */
        class MyPatch {
            constructor() {
                this.operations = [];
                this.pathPrefix = graph.pathPrefix;
                this.detail = null;
            }
            apply() {
                for (let op of this.operations) {
                    let node = graph.getNodeById(op.nodeId);
                    node._setValue(op.value, false);
                }
            }
        }

        /** @type {Patch} */
        const patch = new MyPatch();

        if (obj === oldValue) {
            return patch
        }

        /** @type{JSONPatchOperation} */
        let op;
        if (obj == null) {
            op = { op: 'remove', path: this.path, oldValue };
        } else if (oldValue == null) {
            patch.operations.push(...this.createPathToRoot(obj));
            op = { op: 'add', path: this.path, value: obj };
        } else {
            op = { op: 'replace', path: this.path, value: obj, oldValue };
        }

        op['nodeId'] = this.id;
        patch.operations.push(op);

        this._setValue(obj, false);

        if (obj == null) {
            patch.operations.push(...this.clearPathToRoot());
        }

        return patch
    }

    /**
     * TODO: What is this doing?
     * @param {?} obj
     * @param {boolean} disabled
     */
    _setValue(obj, disabled) {
        this.path = (this.parent ? this.parent.path + '/' + this.key : String(this.key));

        if (this.parent && this.parent.obj) {
            if (obj == null) {
                delete this.parent.obj[this.key];
            } else {
                this.parent.obj[this.key] = obj;
            }
        } else if (obj !== undefined && this.constructor === BaseNodeClass) {
            throw Error('Value lost')
        }

        this.refreshUI(disabled);
    }

    /**
     * @param{number | string | boolean} value
     * @returns {JSONPatchOperation[]}
     */
    createPathToRoot(value) {
        /** @type{JSONPatchOperation[]} */
        let operations = [];
        /** @type{HolderNode} */
        let n = this.parent;
        let v = value;
        /** @type{string | number} */
        let key = this.key;
        while (n && n.obj == null) {
            let empty = n.schema.type === 'array' ? [[], []] : [{}, {}];
            operations.unshift({ op: 'add', path: n.path, value: empty[0], nodeId: n.id });
            n.obj = empty[1];
            n.obj[key] = v;
            key = n.key;
            v = n.obj;
            n = n.parent;
        }
        return operations
    }

    /**
     * Removes the value for this node.
     * If the parent holder object thus will become empty, it is also removed.
     * This will continue to the root.
     * @returns {JSONPatchOperation[]}
     */
    clearPathToRoot() {
        let operations = [];
        /** @type{HolderNode} */
        let n = this.parent;
        while (true) {

            if (!n) break;
            if (n.obj == null) break;

            let len;
            if (n.schema.type === 'object') {
                len = Object.values((/** @type{object} */ n.obj)).length
            } else {
                len = n.obj.length
            }
            if (len === 0) {
                let oldValue = n.obj;
                delete n.obj;
                if (n.parent) {
                    oldValue = n.parent.obj[n.key];
                    delete n.parent.obj[n.key];
                }
                operations.push({ op: 'remove', path: n.path, oldValue, nodeId: n.id });
            } else {
                break;
            }
            n = n.parent;
        }

        return operations
    }

    /**
     * @param {boolean} disabled 
     */
    refreshUI(disabled) {
    }
}

/** 
 * @implements{HolderNode} 
 */
export class HolderNodeClass extends BaseNodeClass {
    /**
     * @param {Graph} graph
     * @param {string} relId
     * @param {string | number} key
     * @param {JSONSchema} schema
     * @param {HolderNode} parent
     */
    constructor(graph, relId, key, schema, parent) {
        if (!['object', 'array'].includes(schema.type)) {
            throw Error('Invalid schema type: ' + schema.type);
        }
        super(graph, relId, key, schema, parent);
        /** @type{BaseNode[]} */
        this.children = [];
    }

    getValue() {
        return this.obj;
    }

    /**
     * 
     * @param {*} obj 
     * @param {BaseNode} child
     * @param {boolean} disabled
     */
    visitChild(obj, child, disabled) {
        child._setValue((obj == null ? undefined : obj[child.key]), disabled);
    }

    /**
     * TODO: What is this doing?
     * @param {?} obj
     * @param {boolean} disabled
     */
    _setValue(obj, disabled) {
        if (obj == null) {
            delete this.obj;
        } else {
            this.obj = obj;
        }

        super._setValue(obj, disabled);

        for (let child of this.children) {
            this.visitChild(obj, child, disabled);
        }
    }

}

/**
 * @param {HTMLElement} rootElement
 * @param {JSONSchema} topSchema
 * @param {object} topObj
 * @param {TransactionManager=} transactionManager
 * @returns {FormChen}
 */
export function createFormChen(rootElement, topSchema, topObj, transactionManager) {

    const pathPrefix = topSchema.pathPrefix || '';
    /** @type{Graph} */
    const graph = new Graph(pathPrefix);

    let holder = null;

    /**
      * @param {JSONSchema} schema
      * @param {string} path
      * @returns {JSONSchema}
      */
    function resolveSchema(schema, path) {
        if ('$ref' in schema) {
            const ref = /**@type{string}*/ (schema['$ref']);
            const refSchema = getValueByPointer(topSchema, ref);
            if (!refSchema) {
                throw Error('Undefined $ref at ' + path);
            }
            return /**@type{JSONSchema}*/ (refSchema)
        }
        return schema
    }

    /**
    * @param {string} relId 
    * @param {string | number} key 
    * @param {JSONSchema} schema 
    * @param {HolderNode} parent 
    * @returns {BaseNode}
    */
    function createNode(relId, key, schema, parent) {
        schema = resolveSchema(schema, String(key));
        let constructor;
        if (schema.format === 'grid' || schema.type === 'object' || schema.type === 'array') {
            constructor = HolderNodeClass
        } else {
            constructor = BaseNodeClass;
        }
        return new constructor(graph, relId, key, schema, parent);
    }

    // registerGlobalTransactionManager();
    const rootNode = createNode('', '', topSchema, holder);
    rootNode.tm = transactionManager;
    bindNode(rootNode, rootElement);

    rootNode.setValue(topObj);

    /**
     * @param {HolderNode} node
     * @param {HTMLElement} container
     */
    function bindObject(node, container) {
        const properties = node.schema.properties || [];
        for (let [key, childSchema] of Object.entries(properties)) {
            const childNode = createNode(key, key, childSchema, node);
            bindNode(childNode, container);
        }
    }

    /**
     * @param {HolderNode} node
     * @param {HTMLElement} containerElement
     */
    function bindGrid(node, containerElement) {
        const grid = /** @type{IGridChen} */ (containerElement.querySelector('.data-value'));
        grid.id = node.id;
        node.schema.readOnly = node.readOnly;  // schema is mutated anyway by createView.
        node.schema.pathPrefix = node.id;
        const gridSchema = Object.assign({}, node.schema);

        const view = createView(gridSchema, null);
        let tm = node.tm;

        grid.resetFromView(view, tm);

        view.updateHolder = function () {
            return node.setValue(view.getModel())
        };

        if (view.schema.detailSchemas && view.schema.detailSchemas.length) {
            node.tm = Object.create(tm);

            node.tm.openTransaction = function () {
                const transaction = tm.openTransaction();  // Invoke super method.
                // TODO: This must be the default impl
                transaction.context = function () {
                };
                return transaction
            };

        }

        node.refreshUI = function () {
            view.applyJSONPatch([{ op: 'replace', path: '', value: node.obj }]);
            grid.refresh(node.id);
        }
    }

    /**
     * @param {HolderNode} node
     * @param {HTMLElement} container
     */
    function bindTuple(node, container) {
        if (Array.isArray(node.schema.items)) {
            // Fixed length tuple.
            const tupleSchemas = /**@type{JSONSchema[]}*/ (node.schema.items);
            for (let [key, childSchema] of Object.entries(tupleSchemas)) {
                const childNode = createNode(key, key, childSchema, node);
                bindNode(childNode, container);
            }
        }
    }

    /**
     * 
     * @param {BaseNode} node 
     * @param {HTMLElement} container
     */
    function bindNode(node, container) {
        const schema = node.schema;

        /** @type{?HTMLElement} */
        let control = container.querySelector(`[data-path="${node.id}"]`);

        if (control) {
            let element = control.querySelector('.data-title');
            
            if (element) {
                if (!(element instanceof HTMLElement)) throw Error(element.tagName);
                let title = /**@type{HTMLElement}*/ (control.querySelector('.data-title'));
                title.textContent = node.title;
                //if (node.parent && node.parent.parent !== undefined) {
                //    title.textContent = node.parent.title + ' ' + node.title;
                // }
                if (node.tooltip) {
                    title.title = node.tooltip;
                }

            }
        }

        if (schema.type === 'object' || schema.type === 'array') {
            //console.log('bind: ' + path);

            if (schema.format === 'grid') {
                if (control) bindGrid(/**@type{HolderNode}*/(node), control);
            } else if (schema.type === 'object') {
                bindObject(/**@type{HolderNode}*/(node), container);
            } else if (schema.type === 'array') {
                bindTuple(/**@type{HolderNode}*/(node), container);
            }

            return
        }

        //console.log('bind: ' + path);
        if (!control) {
            console.error(`Cannot find control for ${node.id}`);
            return
            //throw new Error(`Cannot find control for ${node.id}`)
        }

        if (!container) {
            return
        }

        const element = /** @type{HTMLElement} */ (querySelector(control, '.data-value'));

        if (schema.type === 'boolean') {
            if (element.tagName != 'INPUT') throw Error(element.tagName);
            const input = /**@type{HTMLInputElement} */ (element);
            input.type = 'checkbox';
            node.refreshUI = function (disabled) {
                const value = this.getValue();
                input.checked = (value == null ? false : value);
                input.disabled = node.readOnly || disabled;
            };

            input.onchange = function() {
                let value = input.checked;
                foo(value);
            }
            
        } else if (schema.enum) {
            if (element.tagName != 'SELECT') throw Error(element.tagName);
            const input = /**@type{HTMLSelectElement} */ (element);
            schema.enum.forEach(function (optionName) {
                const option = document.createElement('option');
                option.textContent = String(optionName);
                input.appendChild(option);
            });
            node.refreshUI = function (disabled) {
                input.value = this.getValue();
                input.disabled = node.readOnly || disabled;
            };

            input.onchange = function() {
                let value = input.value;
                foo(value);
            }
        } else {
            if (element.tagName != 'INPUT') throw Error(element.tagName);
            const input = /**@type{HTMLInputElement} */ (element);
            let converter;

            node.refreshUI = function (disabled) {
                const value = this.getValue();
                if (value == null) {
                    input.defaultValue = input.value = '';
                } else {
                    input.defaultValue = input.value = converter.toEditable(value);
                }
                input.disabled = node.readOnly || disabled;
            };

            if (schema.type === 'integer' || schema.type === 'number') {
                input.type = 'number';
                input.style.textAlign = "right";
                if (typeof schema.multipleOf === 'number') {
                    input.step = String(schema.multipleOf);
                } else if (schema.type === 'number') {
                    input.step = String(0.1);
                }
                if (typeof schema.minimum === 'number') input.min = String(schema.minimum);
                if (typeof schema.maximum === 'number') input.max = String(schema.maximum);

                if (schema.type === 'integer') {
                    converter = new NumberConverter(0, undefined);
                } else {
                    converter = new NumberConverter(schema.fractionDigits || 2, undefined);
                    converter.isPercent = (schema.format === '%');
                }
                
            } else if (schema.format === 'date-time') {
                converter = new DateTimeStringConverter(schema.period || 'HOURS');
            } else if (schema.format === 'date-partial-time') {
                converter = new DatePartialTimeStringConverter(schema.period || 'HOURS');
                
            } else if (schema.format === 'full-date') {
                converter = new DatePartialTimeStringConverter(schema.period || 'HOURS');
                
            } else if (schema.type === 'string') {
                converter = new StringConverter();
                
                if (schema.format === 'color') {
                    input.type = 'color';
                } else {
                    input.type = 'string';
                }
            } else {
                throw Error('Invalid schema at ' + node.id);
            }

            input.onchange = function() {
                const newValue = converter.fromEditable(input.value.trim());
                let value = (newValue === '')?undefined:newValue;
                foo(value);
            }
        }

        function foo(value) {
            const patch = node.setValue(value);
            const trans = node.tm.openTransaction();
            trans.patches.push(patch);
            trans.commit();
        };

        let unit = control.querySelector('.data-unit');
        if (unit && schema.unit) {
            unit.textContent = `[${schema.unit}]`;
        }

    }

    /**
     * @implements {IFormChen}
     */
    class FormChen {
        /**
         * Returns the current value of the bound object.
         * @returns {*}
         */
        get value() {
            return rootNode.getValue()
        }

        /**
         * @param {string} id
         * @returns {BaseNode}
         */
        getNodeById(id) {
            return graph.getNodeById(id);
        }
    }

    return new FormChen();
}


// For replace operations on non-array fields only keep the lattest operation.
// TODO: Consider using https://github.com/alshakero/json-squash
export function squash_formchen_patch(patch) {
    let scalar_fields = {};
    let array_fields = {};
    let squashed = [];
    for (let op of patch) {
        let m = op.path.match(/^(.*)\/\d/);
        if (!m) {
            console.assert(op.op == 'replace');
            scalar_fields[op.path] = op;
        } else {
            let prefix = m[1];
            if (!array_fields[prefix]) {
                array_fields[prefix] = [];
            }
            array_fields[prefix].push(op);
        }
    }

    for (const op of Object.values(scalar_fields)) {
        squashed.push(op);
    }

    for (const [key, item_patch] of Object.entries(array_fields)) {
        for (const op of Object.values(item_patch)) {
            squashed.push(op);
        }
    }

    return squashed;
}