/**
 * Author: Wolfgang Kühn 2019-2024
 * Source located at https://github.com/decatur/formchen
 *
 * Module implementing two-way hierachical data binding.
 */

/** @import { JSONPatchOperation, JSONSchemaOrRef, JSONSchema } from "./types" */
/** @import { FormChen, GridChenElement } from "./types" */

import "./gridchen/gridchen.js"
import { createView } from "./gridchen/matrixview.js";

import { NumberConverter, DateTimeStringConverter, FullDateConverter, StringConverter, UrlConverter, ColorConverter, IntegerConverter } from "./converter.js";
import { Patch, TransactionManager, clone, logger, registerUndo } from "./utils.js";
import { GridChen } from "./gridchen/gridchen.js";
import { removeNoOps } from "./json_patch_squash.js";

logger.info('Loading Formchen with locale ' + navigator.language);

/**
 * Example:
 *      getValueByPointer({$defs:{foobar: 1}}, '#/$defs/foobar')
 *      -> 1
 * @param {object} obj
 * @param {string} pointer
 * @returns {object}
 */
function getValueByPointer(obj, pointer) {
    if (!pointer.startsWith('#/')) throw Error('Expect document relative pointer starts with #/');
    return pointer.substring(2).split('/').reduce(((res, prop) => res[prop]), obj);
}

/** 
  * longest_prefix([["abc", "de", "fgh"],["abc", "de"], ["abc", "de", "f"]])
  * -> ['abc', 'de']
  * @param {string[][]} arrays
  * @returns {string[]}
  */
function longest_prefix(arrays) {
    if (arrays.length == 1) return arrays[0];

    let i = 0;
    // while all arrays have the same string at position i, increment i
    while (i < arrays[0].length && arrays.every(arr => arr[i] === arrays[0][i]))
        i++;

    // prefix is the substring from the beginning to the last successfully checked i
    return arrays[0].slice(0, i);
}

/**
 * 
 * @param {HTMLElement} container
 * @returns {Map<string, Element>}
 */
function queryTitleElementsByPath(container) {

    const titles = container.querySelectorAll('.data-info');
    const titleElementsByPath = new Map();

    for (let titleElement of titles) {
        let parent = titleElement;

        while (true) {
            parent = parent.parentElement;
            let namedElements = parent.querySelectorAll('[name], [id]');
            if (namedElements.length > 0) {
                let paths = [];
                for (let namedElement of namedElements) {

                    let path = (namedElement.getAttribute('name') || namedElement.getAttribute('id')).split('/');
                    paths.push(path);
                }
                const prefix = longest_prefix(paths);
                titleElementsByPath.set(prefix.join('/'), titleElement);
                break;
            }
            if (parent === container) break;
        };

    }

    return titleElementsByPath
}

class NodeTree {
    /**
     */
    constructor() {
        this.nodesByPath = {};
    }

    /**
     * @param {BaseNode} node 
     */
    add(node) {
        this.nodesByPath[node.path] = node;
    }

    /**
     * @param {string} path 
     * @returns {BaseNode}
     */
    getNode(path) {
        return this.nodesByPath[path]
    }
}

/**
 * HolderNode and LeafNode decorate a (possibly nested) JavaScript value and its type (via JSON Schema).
 * It also makes the type tree navigable from child to parent and from parent to child.
 *                                                                    
                                      
            ┌───────────────────────────────────────────┐ 
            │               HolderNode                  │         
            │ obj:  {foo: {bar: 'foobar'}, bar: 1}      │           
            │ key:  ''                                  │
            | path: ''                                  |
            └─────┬─────────────────────────────┬───────┘           
                  │                             │                   
                  │                             │                   
                  ▼                             ▼        
     ┌────────────────────────┐                        
     │       LeafNode         │      ┌──────────────────┐   
     │ obj:  {bar: 'foobar'}} │      │    LeafNode      │   
     │ key:  'foo'            │      │ key:  'bar'      │   
     │ path: '/foo'           |      | path: '/foo/bar' |
     └────────────┬───────────┘      └──────────────────┘   
                  │                                                 
                  │                                                 
                  ▼                                                 
          ┌──────────────────┐                                         
          │    LeafNode      │   
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
        if (schema.description) {
            this.description = schema.description;
        }

        if (parent) {
            parent.children.push(this);
        }

        tree.add(this);
    }

    getValue() {
        throw Error()
    }

    /**
     * @param {any} obj 
     * @returns {Patch}
     */
    patchValue(obj, error) {
        let oldValue = this.getValue();
        const node = this;
        class MyPatch extends Patch {
            apply() {
                for (let op of this.operations) {
                    let n = node.tree.getNode(op.path);
                    n.setValue(op.value);
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

        if (error) op.error = error;

        patch.operations.push(op);

        this.setValue(obj);

        if (obj == null) {
            patch.operations.push(...this.clearPathToRoot());
        }

        return patch
    }

    /**
     * @param {?} obj
     */
    setValue(obj) {
        if (this.parent && this.parent.obj) {
            if (obj == null) {
                delete this.parent.obj[this.key];
            } else {
                this.parent.obj[this.key] = obj;
            }
        } else if (obj !== undefined && this.constructor === BaseNode) {
            throw Error('Value lost')
        }

        this.refreshUI();

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
     */
    refreshUI() {
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
     */
    refreshUI() {
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
     */
    visitChild(obj, child) {
        child.setValue((obj == null ? undefined : obj[child.key]));
    }

    /**
     * @param {?} obj
     * @returns {?HTMLInputElement}
     */
    setValue(obj) {
        if (obj == null) {
            delete this.obj;
        } else {
            this.obj = obj;
        }

        super.setValue(obj);

        for (let child of this.children) {
            this.visitChild(obj, child);
        }

        return undefined
    }

    /**
     */
    refreshUI() {
    }

}

/**
 * @param {HTMLElement} rootElement
 * @param {JSONSchema} topSchema
 * @param {object} topObj
 * @returns {FormChen}
 */
export function createFormChen(rootElement, topSchema, topObj) {
    const orgObj = clone(topObj);
    const titleElementsByPath = queryTitleElementsByPath(rootElement);

    const transactionManager = new TransactionManager();

    if (topSchema.type != 'object') {
        throw Error("Root schema must be an object")
    }

    registerUndo(document.body, transactionManager);

    /** @type{NodeTree} */
    const rootTree = new NodeTree();

    let holder = null;

    /**
      * @param {JSONSchemaOrRef} schema
      * @param {string} path
      * @returns {JSONSchema}
      */
    function resolveSchema(schema, path) {
        if ('$ref' in schema) {
            const ref = /**@type{string}*/ (schema['$ref']);
            let refSchema = getValueByPointer(topSchema, ref);
            if (!refSchema) {
                throw Error('Undefined $ref at ' + path);
            }
            return /**@type{JSONSchema}*/ ({ ...refSchema, title: schema.title })
        }
        return schema
    }

    /**
    * @param {string | number} key 
    * @param {JSONSchemaOrRef} schema 
    * @param {HolderNode} parent 
    * @returns {BaseNode}
    */
    function createNode(key, schema, parent) {
        schema = resolveSchema(schema, String(key));
        let node;
        if (schema.format === 'grid' || schema.type === 'object' || schema.type === 'array') {
            node = new HolderNode(rootTree, key, schema, parent);
            bindHolderNode(node);
        } else {
            node = new LeafNode(rootTree, key, schema, parent);
            bindLeafNode(node);
        }

        const titleElement = titleElementsByPath.get(node.path);
        if (titleElement instanceof HTMLElement && !titleElement.firstChild) {
            let span = document.createElement('span');
            span.className = 'data-title';
            span.textContent = node.title + (schema.unit ? ` [${schema.unit}]` : '');
            titleElement.appendChild(span);
            if (node.description) {
                titleElement.appendChild(document.createTextNode(node.description));
            }
        }

        return node;
    }

    // registerGlobalTransactionManager();
    const rootNode = createNode('', topSchema, holder);
    rootNode.patchValue(topObj);

    /**
     * @param {HolderNode} node
     */
    function bindObject(node) {
        const properties = node.schema.properties || [];
        for (let [key, childSchema] of Object.entries(properties)) {
            createNode(key, childSchema, node);
        }
    }

    /**
     * @param {HolderNode} node
     * @param {GridChenElement} grid
     */
    function bindGrid(node, grid) {
        grid.id = node.path;
        node.schema.readOnly = node.readOnly;  // schema is mutated anyway by createView.
        const gridSchema = Object.assign({}, node.schema);

        const view = createView(gridSchema, null);
        // @ts-ignore
        grid.resetFromView(view, transactionManager, node.path);

        view.updateHolder = function () {
            return node.patchValue(view.getModel())
        };

        node.refreshUI = function () {
            view.applyJSONPatch([{ op: 'replace', path: '', value: node.obj }]);
            // @ts-ignore
            grid.refresh(node.path);
        }
    }

    /**
     * @param {HolderNode} node
     */
    function bindTuple(node) {
        if (!Array.isArray(node.schema.prefixItems)) {
            throw Error(`Node ${node.path} must have a prefixItems property`);
        }

        // Fixed length tuple.
        const tupleSchemas = /**@type{JSONSchemaOrRef[]}*/ (node.schema.prefixItems);
        tupleSchemas.forEach((itemSchema, i) => {
            createNode(String(i), itemSchema, node);
        });
    }

    /**
     * 
     * @param {LeafNode} node 
     */
    function bindLeafNode(node) {
        const container = rootElement;
        const schema = node.schema;
        const path = node.path;

        let control = new Control(container, path, node);
        if (!control.element) {
            console.error(`Cannot find control for ${node.path}`);
            return
        }

        const element = control.element;
        node.formElement = element;

        if (schema.type === 'boolean') {
            if (!(element instanceof HTMLInputElement)) throw Error(`Form element at path ${path} must be an input, but found a ${element.tagName}`);
            if (element.tagName != 'INPUT') throw Error(element.tagName);
            const input = element;
            input.readOnly = node.readOnly;
            input.type = 'checkbox';

            node.refreshUI = function () {
                const value = node.getValue();
                input.checked = (value == null ? false : value);
            };

            input.onchange = function (_event) {
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
            node.refreshUI = function () {
                input.value = node.getValue();
                input.disabled = node.readOnly;
            };

            input.onchange = function (_event) {
                let value = input.value;
                commit(value, input);
            }
        } else { //if (schema.type === 'string') {

            let converter;

            if (schema.type === 'integer') {
                if (!(element instanceof HTMLInputElement)) throw Error(`Form element at path ${path} must be an input, but found a ${element.tagName}`);
                converter = new IntegerConverter();
                converter.conditionInput(element, node.readOnly);
            } else if (schema.type === 'number') {
                if (!(element instanceof HTMLInputElement)) throw Error(`Form element at path ${path} must be an input, but found a ${element.tagName}`);
                converter = new NumberConverter(schema.fractionDigits || 2);
                converter.conditionInput(element, node.readOnly);
            } else if (schema.type === 'string' && schema.format) {
                if (!(element instanceof HTMLInputElement)) throw Error(`Form element at path ${path} must be an input, but found a ${element.tagName}`);

                if (schema.format === 'date') {
                    converter = new FullDateConverter();
                } else if (schema.format === 'datetime') {
                    converter = new DateTimeStringConverter(schema.period || 'HOURS');
                } else if (schema.format === 'url') {
                    converter = new UrlConverter();
                } else if (schema.format === 'color') {
                    converter = new ColorConverter();
                }

                converter.conditionInput(element, node.readOnly);
            } else if (schema.type === 'string') {
                if (!((element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement))) throw Error(`Form element at path ${path} must be an input, but found a ${element.tagName}`);
                converter = new StringConverter();
                converter.conditionInput(element, node.readOnly);
            } else {
                throw Error('Invalid schema at ' + node.path);
            }

            const input = element;

            node.refreshUI = function () {
                const value = node.getValue();
                if (value == null) {
                    input.value = '';
                } else {
                    converter.toInput(value, input);
                }
            };

            input.oninput = () => {
                console.log("oninput")
                input.setCustomValidity('');
            }

            let invalidCount = 0;

            input.onblur = () => {
                console.log("onblur " + input.value)
                let [value, error] = converter.fromInput(input);
                console.log("onblur1 " + value)
                if (error && ++invalidCount == 1) {
                    input.setCustomValidity(error);
                    input.reportValidity();
                } else {
                    invalidCount = 0;
                }
                commit((value === '') ? undefined : value, input, error);
            }

            input.onfocus = () => {
                let value = node.getValue();
                console.log('onfocus ' + value);
                if (converter.toInputEdit) converter.toInputEdit(value, input);
            }
        } 
        // else if (schema.type === 'integer' || schema.type === 'number') {
        //     if (!(element instanceof HTMLInputElement)) throw Error(`Form element at path ${path} must be an input, but found a ${element.tagName}`);
        //     const input = element;
        //     let converter;
        //     if (schema.type === 'integer') {
        //         converter = new IntegerConverter();
        //     } else {
        //         converter = new NumberConverter(schema.fractionDigits || 2);
        //     }

        //     converter.conditionInput(input, node.readOnly);

        //     node.refreshUI = function () {
        //         const value = node.getValue();
        //         if (value == null) {
        //             input.value = '';
        //         } else {
        //             converter.toInput(value, input);
        //         }
        //     };

        //     if (typeof schema.multipleOf === 'number') {
        //         input.step = String(schema.multipleOf);
        //     } else if (schema.type === 'number') {
        //         input.step = 'any';
        //     }
        //     if (typeof schema.minimum === 'number') input.min = String(schema.minimum);
        //     if (typeof schema.maximum === 'number') input.max = String(schema.maximum);

        //     input.onchange = function () {
        //         const value = converter.fromInput(input);
        //         commit(value, input);
        //     }

        //     input.onfocus = () => {
        //         converter.toInputEdit(node.getValue(), input);
        //     }

        //     input.onblur = () => {
        //         node.refreshUI();
        //     }
        // } 
        


        /**
         * @param {string | number | boolean} value
         * @param {HTMLElement} target
         * 
         */
        function commit(value, target, error) {
            const patch = node.patchValue(value, error);
            const trans = transactionManager.openTransaction(target);
            trans.patches.push(patch);
            trans.commit();
        };

    }

    /**
     * 
     * @param {HolderNode} node 
     */
    function bindHolderNode(node) {
        const schema = node.schema;
        const path = node.path;

        let control = new Control(rootElement, path, node);

        if (schema.format === 'grid') {
            if (!control.element) {
                console.error(`Cannot find control for ${path}`);
                return
            }

            if (!(control.element instanceof GridChen)) throw Error(`Form element at path ${path} must be an input, but found a ${control.element.tagName}`);
            bindGrid(/**@type{HolderNode}*/(node), control.element);
        } else if (schema.type === 'object') {
            bindObject(/**@type{HolderNode}*/(node));
        } else if (schema.type === 'array') {
            bindTuple(/**@type{HolderNode}*/(node));
        } else {
            throw Error();
        }

    }

    /**
     * @implements {FormChen}
     */
    class FormChenClass {
        /**
         * Returns the current value of the bound object.
         * @returns {*}
         */
        get value() {
            return rootNode.getValue()
        }

        get patch() {
            return removeNoOps(orgObj, transactionManager.patch)
        }

        clearPatch() {
            transactionManager.clear()
        }

        /**
         * @param {string} id
         * @returns {BaseNode}
         */
        getNodeById(id) {
            return rootTree.getNode(id);
        }

        get _transactionManager() {
            return transactionManager
        }
    }

    return new FormChenClass();
}

class Control {
    /**
    * @param {HTMLElement} container
    * @param {string} path
    * @param {BaseNode} node
    */
    constructor(container, path, node) {
        /** @type{?HTMLElement} */
        this.control;
        /** @type{?HTMLElement} */
        this.element = container.querySelector(`[name="${path}"]`);

        if (this.element) {
            // Case <label><span class="data-info"></span><input name="/plant"></label>
            this.control = this.element.closest('label')
        } else {
            this.element = document.getElementById(path);
            if (this.element) {
                // Case <label for="/reference"><span class="data-info"></span></label><input id="/reference">
                this.control = container.querySelector(`[for="${path}"]`);
            }
        }
    }

}

