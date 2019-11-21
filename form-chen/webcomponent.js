//@ts-check

import "../grid-chen/webcomponent.js"
import { createView } from "../grid-chen/matrixview.js";
import { Range } from "../grid-chen/selection.js";
import {
    NumberConverter,
    DateTimeStringConverter,
    FullDateStringConverter,
    DatePartialTimeStringConverter,
    StringConverter
} from "../grid-chen/converter.js";
import { registerGlobalTransactionManager, applyJSONPatch } from "../grid-chen/utils.js";


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
 * @implements {FormChenNS.Graph}
 */
export class Graph {
    /**
     * @param {string} pathPrefix
     */
    constructor(pathPrefix) {
        this.pathPrefix = pathPrefix;
        /** @type{{[key: string]: FormChenNS.BaseNode}} */
        this.nodesById = {};
    }

    /**
     * @param {FormChenNS.BaseNode} node 
     */
    add(node) {
        this.nodesById[node.id] = node;
    }

    // /**
    //  * @param {string} path 
    //  * @returns {FormChenNS.BaseNode}
    //  */
    // _getNodeByPath(path) {
    //     for (const node of this.nodes) {
    //         if (node.path === path) {
    //             return node
    //         }
    //     }
    //     return null;
    // }

    /**
     * @param {string} id 
     * @returns {FormChenNS.BaseNode}
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
 * @implements{FormChenNS.BaseNode} 
 */
export class BaseNode {

    /**
     * @param {FormChenNS.Graph} graph
     * @param {string} relId
     * @param {string | number} key
     * @param {GridChenNS.ColumnSchema} schema
     * @param {FormChenNS.HolderNode} parent
     */
    constructor(graph, relId, key, schema, parent) {
        if (!parent && relId === '') {
            this.id = schema.pathPrefix;
        } else {
            this.id = relId[0] === '/' ? relId : ((parent ? parent.id : '') + '/' + String(relId));
        }
        this.graph = graph;
        this.parent = parent;
        this.key = key;
        //if (this.key !== undefined) {
        //    this.path = (this.parent?this.parent.path + '/' + key:String(key));
        //}
        if (typeof schema.readOnly === 'boolean') {
            this.readOnly = schema.readOnly
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

        if (parent) {
            parent.children.push(this);
        }

        graph.add(this);
    }

    // /**
    //  * @returns {string}
    //  */
    // get path() {
    //     /** @type{FormChenNS.BaseNode} */
    //     let n = this;
    //     let parts = [];
    //     while (n) {
    //         parts.unshift(String(n.key));
    //         n = n.parent;
    //     }
    //     return parts.join('/');
    // }

    /**
     * @returns {FormChenNS.BaseNode}
     */
    get root() {
        /** @type{FormChenNS.BaseNode} */
        let n = this;
        while (n.parent) {
            n = n.parent;
        }
        return n;
    }

    getValue() {
        if (this.parent && this.parent.obj) {
            return this.parent.obj[this.key]
        }
        return undefined;
    }

    /**
     * @param {?} obj
     * @returns {GridChenNS.Patch}
     */
    setValue(obj) {
        let oldValue = this.getValue();

        /** @type {GridChenNS.Patch} */
        const patch = {
            apply: (patch) => {
                for (let op of patch.operations) {
                    let node = this.graph.getNodeById(op.nodeId);
                    const detailNode = /** @type{FormChenNS.DetailNode} */ (node.root);
                    if (detailNode.select) {
                        detailNode.select(patch.details.selectedRange);
                    }
                    node._setValue(op.value);
                }
            },
            operations: [],
            pathPrefix: this.graph.pathPrefix
        };

        const detailNode = /** @type{FormChenNS.DetailNode} */ (this.root);
        if (detailNode.grid) {
            patch.details = { selectedRange: /**@type{FormChenNS.DetailNode}*/detailNode.grid.selectedRange };
        }

        if (obj == oldValue) {
            return patch
        }

        /** @type{GridChenNS.JSONPatchOperation} */
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

        this._setValue(obj);

        if (obj == null) {
            patch.operations.push(...this.clearPathToRoot());
        }

        return patch
    }

    /**
     * TODO: What is this doing?
     * @param {?} obj
     */
    _setValue(obj) {
        this.path = (this.parent ? this.parent.path + '/' + this.key : String(this.key));

        if (this.parent && this.parent.obj) {
            if (obj == null) {
                delete this.parent.obj[this.key];
            } else {
                this.parent.obj[this.key] = obj;
            }
        } else if (obj !== undefined && this.constructor === BaseNode) {
            throw Error('Value lost')
        }

        this.refreshUI(false);
    }

    /**
     * @param{number | string | boolean} value
     * @returns {GridChenNS.JSONPatchOperation[]}
     */
    createPathToRoot(value) {
        /** @type{GridChenNS.JSONPatchOperation[]} */
        let operations = [];
        /** @type{FormChenNS.HolderNode} */
        let n = this.parent;
        /** @type{string | number} */
        let key = this.key;
        while (n && n.obj == null) {
            let empty = n.schema.type === 'array' ? [[], []] : [{}, {}];
            operations.unshift({ op: 'add', path: n.path, value: empty[0], nodeId: n.id });
            n.obj = empty[1];
            n.onObjectReferenceChanged(n.obj);
            n.obj[key] = value;
            key = n.key;
            value = n.obj
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
        /** @type{FormChenNS.HolderNode} */
        let n = this.parent;
        while (true) {

            if (!n) break
            if (n.obj == null) break;
            if ((n.schema.type === 'object' ? Object.values(n.obj) : n.obj).length === 0) {
                let oldValue = n.obj;
                delete n.obj;
                n.onObjectReferenceChanged(null);
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
 * @implements{FormChenNS.HolderNode} 
 */
export class HolderNode extends BaseNode {
    /**
     * @param {FormChenNS.Graph} graph
     * @param {string} relId
     * @param {string | number} key
     * @param {GridChenNS.ColumnSchema} schema
     * @param {FormChenNS.HolderNode} parent
     */
    constructor(graph, relId, key, schema, parent) {
        if (!['object', 'array'].includes(schema.type)) {
            throw new Error('Invalid schema type: ' + schema.type);
        }
        super(graph, relId, key, schema, parent)
        /** @type{FormChenNS.BaseNode[]} */
        this.children = [];
    }

    getValue() {
        return this.obj;
    }

    _setValue(obj) {
        if (obj == null) {
            delete this.obj;
        } else {
            this.obj = obj;
        }

        super._setValue(obj);

        for (let child of this.children) {
            child._setValue((obj == null ? undefined : obj[child.key]));
        }
    }

    onObjectReferenceChanged(obj) {
        // NoOp
    }
}

/**
 * @param {GridChenNS.ColumnSchema} topSchema
 * @param {object} topObj
 */
export function createFormChen(topSchema, topObj) {

    const pathPrefix = topSchema.pathPrefix || '';
    /** @type{FormChenNS.Graph} */
    const graph = new Graph(pathPrefix);

    let holder;
    if (['object', 'array'].includes(topSchema.type)) {
        holder = null;
    } else {
        // A leaf node always needs a composit parent.
        holder = new HolderNode(graph, '', '', { type: 'object' }, null);
        holder.obj = {};
    }

    /**
      * @param {GridChenNS.ColumnSchema} schema
      * @param {string} path
      * @returns {GridChenNS.ColumnSchema}
      */
    function resolveSchema(schema, path) {
        if ('$ref' in schema) {
            const refSchema = getValueByPointer(topSchema, schema['$ref']);
            if (!refSchema) {
                throw new Error('Undefined $ref at ' + path);
            }
            return refSchema
        }
        return schema
    }

    /**
    * @param {string} relId 
    * @param {string | number} key 
    * @param {GridChenNS.ColumnSchema} schema 
    * @param {FormChenNS.HolderNode} parent 
    * @returns {FormChenNS.BaseNode}
    */
    function createNode(relId, key, schema, parent) {
        schema = resolveSchema(schema, String(key));
        if (schema.type === 'object' || schema.type === 'array') {
            return new HolderNode(graph, relId, key, schema, parent);
        } else {
            return new BaseNode(graph, relId, key, schema, parent);
        }
    }

    const transactionManager = registerGlobalTransactionManager();
    const rootNode = createNode('', '', topSchema, holder);
    bindNode(rootNode, undefined); //document.getElementById(rootNode.id));

    rootNode.setValue(topObj);

    /**
     * @param {FormChenNS.HolderNode} node
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
     * @param {FormChenNS.HolderNode} masterNode 
     * @param {GridChenNS.MatrixView} view 
     * @param {GridChenNS.GridChen} grid 
     * @param {HTMLElement} container 
     * @param {number} detailIndex 
     * @param {GridChenNS.ColumnSchema} detailSchema 
     */
    function bindDetail(masterNode, view, grid, container, detailIndex, detailSchema) {
        const id = masterNode.id + view.getDetailId(detailIndex);
        detailSchema = resolveSchema(detailSchema, id);

        class DetailNode extends HolderNode {
            constructor(graph, relId, key, schema) {
                super(graph, relId, key, schema, null);
                this.masterNode = masterNode;
                this.grid = grid;
                this.rowIndex = 0;
            }
            setRowIndex(rowIndex) {
                this.rowIndex = rowIndex;
                const { path, value } = view.getDetail(rowIndex, detailIndex);
                this.key = masterNode.path + path;
                this._setValue(value);
                return value
            }
            select(range) {
                this.setRowIndex(range.rowIndex);
                this.grid.select(range);
            }
            onObjectReferenceChanged(obj) {
                view.setDetail(this.rowIndex, detailIndex, obj);
            }
        }

        const detailNode = new DetailNode(graph, id, undefined, detailSchema);

        bindNode(detailNode, container);

        grid.addEventListener('selectionChanged', function () {
            const selection = grid.selectedRange;
            //const isEmptyRow = view.getRow(selection.rowIndex).every(item => item == null);
            detailNode.setRowIndex(selection.rowIndex);
            // const trans = transactionManager.openTransaction();
            // const patch =  {
            //     apply: (patch) => {
            //         for (let op of patch.operations) {
            //             let node = this.graph.getNodeById(op.nodeId);
            //             const detailNode = /** @type{FormChenNS.DetailNode} */ (node.root);
            //             if (detailNode.select) {
            //                 detailNode.select(patch.details.selectedRange);
            //             }
            //             node._setValue(op.value);
            //         }
            //     },
            //     operations: [{op: 'select', value: selection, oldValue:}],
            //     pathPrefix: this.graph.pathPrefix
            // };
            // trans.patches.push(patch);
            // trans.commit();

            // for (const n of detailNode.children) {
            //     if (n.constructor !== BaseNode) {
            //         throw new Error('Nested details are not allowed');
            //     }
            //     n.path = detailNode.path + '/' + n.key; 
            //     n.refreshUI(isEmptyRow);
            // }
        });
    }

    /**
     * @param {FormChenNS.HolderNode} node
     * @param {HTMLElement} containerElement
     */
    function bindGrid(node, containerElement) {
        const label = document.createElement('label');
        label.className = 'grid-label';
        label.textContent = node.title;
        containerElement.appendChild(label);

        const grid = /** @type{GridChenNS.GridChen} */ (document.createElement('grid-chen'));
        grid.id = node.id;
        if (node.schema.height) {
            grid.style.height = node.schema.height + 'px';
        }
        label.appendChild(grid);
        node.schema.readOnly = node.readOnly;  // schema is mutated anyway by createView.
        const gridSchema = Object.assign({}, node.schema);

        const view = createView(gridSchema, null);
        let tm = transactionManager;
        if (node.root.select) {
            tm = Object.create(tm);
            tm.openTransaction = function () {
                const transaction = transactionManager.openTransaction();
                const selection = node.root.grid.selectedRange;
                transaction.context = function () {
                    console.log(selection); // -> /measurements/1/3
                    console.log(node.path); // -> /measurements/1/3
                    const detailNode = node.root; //graph.getNodeById('/myPrefix/measurements/*/3');
                    detailNode.select(selection);
                }
                return transaction
            }
        }
        grid.resetFromView(view, tm);
        view.updateHolder = function () {
            return node.setValue(view.getModel())
        };

        for (const [detailIndex, detailSchema] of view.schema.detailSchemas.entries()) {
            bindDetail(node, view, grid, containerElement, detailIndex, detailSchema);
        }

        node.refreshUI = function () {
            view.applyJSONPatch([{ op: 'replace', path: '', value: node.obj }]);
            grid._refresh(rootNode.schema.pathPrefix + this.path);
        }
    }

    /**
     * @param {FormChenNS.HolderNode} node
     * @param {HTMLElement} container
     */
    function bindTuple(node, container) {
        if (Array.isArray(node.schema.items)) {
            // Fixed length tuple.
            const tupleSchemas = /**@type{GridChenNS.ColumnSchema[]}*/ (node.schema.items);
            for (let [key, childSchema] of Object.entries(tupleSchemas)) {
                const childNode = createNode(key, key, childSchema, node);
                bindNode(childNode, container);
            }
        }
    }

    /**
     * 
     * @param {FormChenNS.BaseNode} node 
     * @param {HTMLElement} container
     */
    function bindNode(node, container) {
        const schema = node.schema;
        const path = node.path;

        const e = document.getElementById(node.id);
        if (e) {
            container = e;
            container.textContent = '';
        }

        if (schema.type === 'object' || schema.type === 'array') {
            console.log('bind: ' + path);

            if (schema.type === 'object') {
                bindObject(/**@type{FormChenNS.HolderNode}*/(node), container);
                return
            }

            if (schema.type === 'array') {
                if (schema.format === 'grid') {
                    if (container) bindGrid(/**@type{FormChenNS.HolderNode}*/(node), container);
                } else {
                    bindTuple(/**@type{FormChenNS.HolderNode}*/(node), container);
                }
                return
            }

        }

        console.log('bind: ' + path);

        if (!container) return

        const label = document.createElement('label');
        let input;

        if (schema.type === 'boolean') {
            input = document.createElement('input');
            input.type = 'checkbox';
            node.refreshUI = function (disabled) {
                const value = this.getValue();
                input.checked = (value == null ? false : value);
                input.disabled = node.readOnly || disabled;
            };
        } else if (schema.enum) {
            input = document.createElement('select');
            schema.enum.forEach(function (optionName) {
                const option = document.createElement('option');
                option.textContent = String(optionName);
                input.appendChild(option);
            });
            node.refreshUI = function (disabled) {
                input.value = this.getValue();
                input.disabled = node.readOnly || disabled;
            };
        } else {
            input = document.createElement('input');
            node.refreshUI = function (disabled) {
                const value = this.getValue();
                if (value == null) {
                    input.defaultValue = input.value = '';
                } else {
                    input.defaultValue = input.value = this.schema.converter.toEditable(value);
                }
                input.disabled = node.readOnly || disabled;
            };

            if (schema.type === 'integer') {
                if (!schema.converter) {
                    schema.converter = new NumberConverter(0, undefined);
                }
            } else if (schema.type === 'number') {
                if (!schema.converter) {
                    schema.converter = new NumberConverter(schema.fractionDigits || 2, undefined, schema.format === '%');
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

        // if (node.readOnly && !(value == null)) {
        //     input.disabled = true;
        // }

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


        label.setAttribute('for', node.id);
        input.id = node.id;
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
            return rootNode.getValue()
        }

        /**
         * @param {string} id
         * @returns {FormChenNS.BaseNode}
         */
        getNodeById(id) {
            return graph.getNodeById(id);
        }
    }

    return new FormChen();
}
