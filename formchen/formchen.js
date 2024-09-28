/**
 * Author: Wolfgang Kühn 2019-2024
 * Source located at https://github.com/decatur/formchen
 *
 * Module implementing two-way hierachical data binding.
 */

/** @import { IFormChen, JSONPatchOperation, GridChen as IGridChen, JSONSchema } from "./types" */

import "./gridchen/gridchen.js"
import { createView } from "./gridchen/matrixview.js";
import { NumberConverter, DateTimeStringConverter, FullDateConverter, StringConverter } from "./converter.js";
import { Patch, TransactionManager } from "./utils.js";
import { GridChen } from "./gridchen/gridchen.js";

console.log('Loading Formchen with locale ' + navigator.language);

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

class NodeTree {
    /**
     */
    constructor() {
        this.nodesById = {};
    }

    /**
     * @param {BaseNode} node 
     */
    add(node) {
        this.nodesById[node.path] = node;
    }

    /**
     * @param {string} path 
     * @returns {BaseNode}
     */
    getNodeById(path) {
        return this.nodesById[path]
    }
}

/**
 * BaseNode decorates a (possibly nested) JavaScript value and its type (via JSON Schema).
 * It also makes the type tree navigable from child to parent and from parent to child.
 *                                                                    
                                      
            ┌───────────────────────────────────────────┐           
            │ obj:  {foo: {bar: 'foobar'}, bar: 1}      │           
            │ key:  ''                                  │
            | path: ''                                  |
            └─────┬─────────────────────────────┬───────┘           
                  │                             │                   
                  │                             │                   
                  ▼                             ▼                   
     ┌────────────────────────┐      ┌───────────────────────┐   
     │ obj:  {bar: 'foobar'}} │      │                       │   
     │ key:  'foo'            │      │ key:  'bar'           │   
     │ path: '/foo'           |      | path: '/foo/bar'      |
     └────────────┬───────────┘      └───────────────────────┘   
                  │                                                 
                  │                                                 
                  ▼                                                 
          ┌──────────────────┐                                         
          │ key:  'bar'      │
          │ path: '/foo/bar' │
          └──────────────────┘                                         
 */

class BaseNode {

    /**
     * @param {NodeTree} tree
     * @param {string | number} key
     * @param {JSONSchema} schema
     * @param {HolderNode} parent
     */
    constructor(tree, key, schema, parent) {
        if (new.target === BaseNode) throw new Error('BaseNode cannot be instantiated')
        this.key = key;
        this.path = (parent ? parent.path + '/' + key : String(key));

        this.tree = tree;
        if (parent) {
            this.parent = parent;
        }

        if (typeof schema.readOnly === 'boolean') {
            this.readOnly = schema.readOnly
        } else if (parent) {
            // Inherit read only.
            this.readOnly = parent.readOnly;
        }
        this.schema = schema;
        if (schema.title == null) {
            this.title = this.schema.title || String(key);
        } else {
            this.title = schema.title;
        }
        if (schema.tooltip) {
            this.tooltip = schema.tooltip;
        }

        if (parent) {
            parent.children.push(this);
        }

        tree.add(this);
    }

    getValue() {
        throw Error()
    }

    patchValue(obj) {
        let oldValue = this.getValue();
        const node = this;
        class MyPatch extends Patch {
            apply() {
                for (let op of this.operations) {
                    let n = node.tree.getNodeById(op.path);
                    n.setValue(op.value, false);
                    if (n instanceof LeafNode) n.formElement.focus();
                }
            }
        }

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

        patch.operations.push(op);

        this.setValue(obj, false);

        if (obj == null) {
            patch.operations.push(...this.clearPathToRoot());
        }

        return patch
    }

    /**
     * @param {?} obj
     * @param {boolean} disabled
     */
    setValue(obj, disabled) {
        if (this.parent && this.parent.obj) {
            if (obj == null) {
                delete this.parent.obj[this.key];
            } else {
                this.parent.obj[this.key] = obj;
            }
        } else if (obj !== undefined && this.constructor === BaseNode) {
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
            operations.unshift({ op: 'add', path: n.path, value: empty[0] });
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
                operations.push({ op: 'remove', path: n.path, oldValue });
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
        throw Error()
    }
}

class LeafNode extends BaseNode {

    /**
     * @param {NodeTree} tree
     * @param {string | number} key
     * @param {JSONSchema} schema
     * @param {HolderNode} parent
     */
    constructor(tree, key, schema, parent) {
        super(tree, key, schema, parent);
        /** @type{HTMLElement} */
        this.formElement;
    }

    getValue() {
        if (this.parent && this.parent.obj) {
            return this.parent.obj[this.key]
        }
        return undefined;
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
            operations.unshift({ op: 'add', path: n.path, value: empty[0] });
            n.obj = empty[1];
            n.obj[key] = v;
            key = n.key;
            v = n.obj;
            n = n.parent;
        }
        return operations
    }

    /**
     * @param {boolean} disabled
     */
    refreshUI(disabled) {
        return undefined
    }
}

class HolderNode extends BaseNode {
    /**
     * @param {NodeTree} tree
     * @param {string | number} key
     * @param {JSONSchema} schema
     * @param {HolderNode} parent
     */
    constructor(tree, key, schema, parent) {
        if (!['object', 'array'].includes(schema.type)) {
            throw Error('Invalid schema type: ' + schema.type);
        }
        super(tree, key, schema, parent);
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
        child.setValue((obj == null ? undefined : obj[child.key]), disabled);
    }

    /**
     * @param {?} obj
     * @param {boolean} disabled
     * @returns {?HTMLInputElement}
     */
    setValue(obj, disabled) {
        if (obj == null) {
            delete this.obj;
        } else {
            this.obj = obj;
        }

        super.setValue(obj, disabled);

        for (let child of this.children) {
            this.visitChild(obj, child, disabled);
        }

        return undefined
    }

    /**
     * @param {boolean} disabled
     */
    refreshUI(disabled) {
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

    if (topSchema.type != 'object') {
        throw Error("Root schema must be an object")
    }

    /** @type{NodeTree} */
    const rootTree = new NodeTree();

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
    * @param {string | number} key 
    * @param {JSONSchema} schema 
    * @param {HolderNode} parent 
    * @returns {BaseNode}
    */
    function createNode(key, schema, parent) {
        schema = resolveSchema(schema, String(key));
        let constructor;
        if (schema.format === 'grid' || schema.type === 'object' || schema.type === 'array') {
            constructor = HolderNode
        } else {
            constructor = LeafNode;
        }
        return new constructor(rootTree, key, schema, parent);
    }

    // registerGlobalTransactionManager();
    const rootNode = createNode('', topSchema, holder);
    bindNode(rootNode, rootElement);

    rootNode.patchValue(topObj);

    /**
     * @param {HolderNode} node
     * @param {HTMLElement} container
     */
    function bindObject(node, container) {
        const properties = node.schema.properties || [];
        for (let [key, childSchema] of Object.entries(properties)) {
            const childNode = createNode(key, childSchema, node);
            bindNode(childNode, container);
        }
    }

    /**
     * @param {HolderNode} node
     * @param {IGridChen} grid
     */
    function bindGrid(node, grid) {
        grid.id = node.path;
        node.schema.readOnly = node.readOnly;  // schema is mutated anyway by createView.
        node.schema.pathPrefix = node.path;
        const gridSchema = Object.assign({}, node.schema);

        const view = createView(gridSchema, null);
        grid.resetFromView(view, transactionManager);

        view.updateHolder = function () {
            return node.patchValue(view.getModel())
        };

        node.refreshUI = function () {
            view.applyJSONPatch([{ op: 'replace', path: '', value: node.obj }]);
            grid.refresh(node.path);
        }
    }

    /**
     * @param {HolderNode} node
     * @param {HTMLElement} container
     */
    function bindTuple(node, container) {
        if (!Array.isArray(node.schema.prefixItems)) {
            throw Error(`Node ${node.path} must have a prefixItems property`);
        }

        // Fixed length tuple.
        const tupleSchemas = /**@type{JSONSchema[]}*/ (node.schema.prefixItems);
        tupleSchemas.forEach((itemSchema, i) => {
            const childNode = createNode(String(i), itemSchema, node);
            bindNode(childNode, container);
        });
    }

    /**
     * 
     * @param {BaseNode} node 
     * @param {HTMLElement} container
     */
    function bindNode(node, container) {
        const schema = node.schema;
        const path = node.path;

        /** @type{?HTMLElement} */
        let control;
        /** @type{?HTMLElement} */
        let element = container.querySelector(`[name="${path}"]`);
        if (element) {
            // Case <label><span class="data-title"></span><input name="/plant"></label>
            control = element.closest('label')
        } else {
            element = document.getElementById(path);
            if (element) {
                // Case <label for="/reference"><span class="data-title"></span></label><input id="/reference">
                control = container.querySelector(`[for="${path}"]`);
            } else {
                control = container.querySelector(`[data-path="${path}"]`);
                if (control) {
                    // Case <label data-path="/latitude" class="label"><span class="data-title"></span><input class="data-value"></label>
                    element = control.querySelector('.data-value');
                }
            }
        }

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
            if (schema.format === 'grid') {
                if (!control) {
                    console.error(`Cannot find control for ${node.path}`);
                    return
                }

                if (!(element instanceof GridChen)) throw Error(`Form element at path ${path} must be an input, but found a ${element.tagName}`);
                bindGrid(/**@type{HolderNode}*/(node), element);
            } else if (schema.type === 'object') {
                bindObject(/**@type{HolderNode}*/(node), container);
            } else if (schema.type === 'array') {
                bindTuple(/**@type{HolderNode}*/(node), container);
            }

            return
        }

        if (!(node instanceof LeafNode)) throw Error();

        //console.log('bind: ' + path);
        if (!control) {
            console.error(`Cannot find control for ${node.path}`);
            return
        }

        node.formElement = element;

        if (schema.type === 'boolean') {
            if (!(element instanceof HTMLInputElement)) throw Error(`Form element at path ${path} must be an input, but found a ${element.tagName}`);
            if (element.tagName != 'INPUT') throw Error(element.tagName);
            const input = element;
            input.type = 'checkbox';
            node.refreshUI = function (disabled) {
                const value = node.getValue();
                input.checked = (value == null ? false : value);
                input.disabled = node.readOnly || disabled;
            };

            input.onchange = function (event) {
                let value = input.checked;
                commit(value, input);
            }

        } else if (schema.enum) {
            if (!(element instanceof HTMLSelectElement)) throw Error(`Form element at path ${path} must be an input, but found a ${element.tagName}`);
            const input = element;
            schema.enum.forEach(function (optionName) {
                const option = document.createElement('option');
                option.textContent = String(optionName);
                input.appendChild(option);
            });
            node.refreshUI = function (disabled) {
                input.value = node.getValue();
                input.disabled = node.readOnly || disabled;
            };

            input.onchange = function (event) {
                let value = input.value;
                commit(value, input);
            }
        } else if (schema.type === 'string') {
            if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) throw Error(`Form element at path ${path} must be an input, but found a ${element.tagName}`);
            const input = element;
            const converter = new StringConverter();
            node.refreshUI = function (disabled) {
                const value = node.getValue();
                if (value == null) {
                    input.defaultValue = input.value = '';
                } else {
                    input.defaultValue = input.value = converter.toEditable(value);
                }
                input.disabled = node.readOnly || disabled;
            };

            if (input instanceof HTMLInputElement) {
                if (schema.format === 'color') {
                    input.type = 'color';
                } else {
                    input.type = 'string';
                }
            }

            input.onchange = function (event) {
                const newValue = converter.fromEditable(input.value.trim());
                let value = (newValue === '') ? undefined : newValue;
                commit(value, input);
            }

        } else {
            if (!(element instanceof HTMLInputElement)) throw Error(`Form element at path ${path} must be an input, but found a ${element.tagName}`);
            const input = element;
            let converter;

            node.refreshUI = function (disabled) {
                const value = node.getValue();
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
                    converter = new NumberConverter(0);
                } else {
                    converter = new NumberConverter(schema.fractionDigits || 2);
                }

            } else if (schema.format === 'date-time') {
                converter = new DateTimeStringConverter(schema.period || 'HOURS');
                // } else if (schema.format === 'date-partial-time') {
                //     converter = new DatePartialTimeStringConverter(schema.period || 'HOURS');
            } else if (schema.format === 'full-date') {
                converter = new FullDateConverter();
            } else {
                throw Error('Invalid schema at ' + node.path);
            }

            input.onchange = function (event) {
                const newValue = converter.fromEditable(input.value.trim());
                let value = (newValue === '') ? undefined : newValue;
                commit(value, input);
            }
        }

        /**
         * @param {string | number | boolean} value
         * @param {HTMLElement} target
         */
        function commit(value, target) {
            const patch = node.patchValue(value);
            const trans = transactionManager.openTransaction(target);
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
            return rootTree.getNodeById(id);
        }
    }

    return new FormChen();
}


// For replace operations on non-array fields only keep the lattest operation.
// TODO: Consider using https://github.com/alshakero/json-squash
/**
 * @param {any} patch
 */
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