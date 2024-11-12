/**
 * Author: Wolfgang Kühn 2019-2024
 * Source located at https://github.com/decatur/formchen
 *
 * Module implementing data (model) abstraction for some common matrix representations.
 */

/** @import { Interval, MatrixView, GridSchema, ColumnSchema, JSONPatch } from "../private-types" */
/** @import { JSONSchema, JSONPatchOperation } from "../types" */

import * as c from "../converter.js";
import { applyJSONPatch, Patch } from '../utils.js'

const ABSTRACT_METHOD = Error('Abstract method');

/**
 * @param {number} count
 * @returns {number[]}
 */
function range(count) {
    return Array.from({ length: count }, (_, i) => i);
}

/**
 * Compare numeric values.
 * undefined, null and NaN always compare as bigger in compliance to Excel.
 * TODO: This is not true; Excel compares #VALUE! as smaller! (What about #VALUE! vs undefined?)
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function compareNumber(a, b) {
    // Note that we have to handle undefined/null here because this is NOT the compareFct of Array.sort().
    if (a < b) return -1;
    if (a > b) return 1;
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    if (isNaN(a) && isNaN(b)) return 0;
    if (isNaN(a)) return 1;  // isNaN also works for invalid dates.
    if (isNaN(b)) return -1;
    return 0;
}

/**
 * Compare strings, also dates as strings.
 * undefined, null and NaN always compare as bigger in compliance to Excel.
 * TODO: This is not true; Excel compares #VALUE! as smaller! (What about #VALUE! vs undefined?)
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function compareString(a, b) {
    // Note that we have to handle undefined/null here because this is NOT the compareFct of Array.sort().
    if (a < b) return -1;
    if (a > b) return 1;
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return 0;
}

/**
 * Compare booleans.
 * undefined, null and NaN always compare as bigger in compliance to Excel.
 * TODO: This is not true; Excel compares #VALUE! as smaller! (What about #VALUE! vs undefined?)
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function compareBoolean(a, b) {
    // Note that we have to handle undefined/null here because this is NOT the compareFct of Array.sort().
    if (a < b) return -1;
    if (a > b) return 1;
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    return 0;
}

/**
 * @param {ColumnSchema[]} schemas 
 * @param {number} colIndex 
 * @returns {number}
 */
function updateSortDirection(schemas, colIndex) {
    let sortSchema = schemas[colIndex];
    let sortDirection = sortSchema.sortDirection;
    for (const schema of schemas) {
        delete schema.sortDirection
    }

    if (sortDirection === undefined) {
        sortDirection = 1;
    } else {
        sortDirection *= -1;
    }

    sortSchema.sortDirection = sortDirection;
    return sortDirection
}

/**
 * @param {JSONSchema[]} schemas
 * @returns {ColumnSchema[]}
 */
function createColumSchemas(schemas) {
    const columSchemas = []
    for (let _schema of schemas) {
        const schema = /** @type{ColumnSchema} */(JSON.parse(JSON.stringify(_schema)));
        console.assert(schema.width !== undefined || schema.title !== undefined, `You must specify either width or title in schema ${JSON.stringify(schema, null, 2)}`);
        schema.width = Number(schema.width || (schema.title.length * 12) || 100);
        // schema.type = schema.type || 'string';

        if (schema.type === 'number') {
            let fractionDigits = 2;
            if (schema.fractionDigits !== undefined) {
                fractionDigits = schema.fractionDigits;
            }
            schema.converter = new c.NumberConverter(fractionDigits);
            schema.compare = compareNumber;
        } else if (schema.type === 'integer') {
            schema.converter = new c.IntegerConverter();
            schema.compare = compareNumber;
        } else if (schema.type === 'string' && schema.format === 'date') {
            schema.converter = new c.FullDateConverter();
            schema.compare = compareString;
        }
        // else if (schema.type === 'string' && schema.format === 'date-partial-time') {
        //     schema.converter = new c.DatePartialTimeStringConverter(schema.period || 'MINUTES');
        // } 
        else if (schema.type === 'string' && schema.format === 'datetime') {
            schema.converter = new c.DateTimeStringConverter(schema.period || 'MINUTES');
            schema.compare = compareString;
        }
        // else if (schema.type === 'object' && schema.format === 'date') {
        //     schema.converter = new c.DatePartialTimeConverter('DAYS');
        // } else if (schema.type === 'object' && schema.format === 'date-partial-time') {
        //     schema.converter = new c.DatePartialTimeConverter(schema.period || 'MINUTES');
        // } 
        //else if (schema.type === 'object' && schema.format === 'datetime') {
        //    schema.converter = new c.DateTimeConverter(schema.period || 'MINUTES');
        //}
        else if (schema.type === 'boolean') {
            schema.converter = new c.BooleanStringConverter();
            schema.compare = compareBoolean;
        } else if (schema.type === 'string' && schema.format === 'url') {
            schema.converter = new c.UrlConverter();
            schema.compare = compareString;
        } else if (schema.type === 'string') {
            // string and others
            schema.converter = new c.StringConverter();
            schema.compare = compareString;
        } else {
            throw Error(`Invalid schema type ${schema.type}`)
        }

        columSchemas.push(schema);
    }

    return columSchemas
}

/**
 * @param {object} properties
 * @returns {[string, object][]}
 */
function sortedColumns(properties) {
    const entries = Object.entries(properties);
    entries.sort(function (e1, e2) {
        const o1 = e1[1]['columnIndex'];
        const o2 = e2[1]['columnIndex'];
        if (!(o1 == null || o2 == null)) {
            return o1 - o2;
        }
        return 0;
    });
    return entries;
}

// function assert(condition, ...data) {
//     if (!condition) throw Error(data)
// }

/**
 * @param {JSONSchema} schema
 * @param {*=} matrix
 * @returns {MatrixView}
 */
export function createView(schema, matrix) {
    const invalidError = Error('Invalid schema: ' + schema.title);

    if (schema.type === 'array' && typeof schema.items === 'object' && Array.isArray(schema.items['items'])) {
        return createRowMatrixView(schema, matrix)
    }

    if (schema.type === 'array' && typeof schema.items === 'object' && schema.items['properties']) {
        return createRowObjectsView(schema, matrix)
    }

    if (Array.isArray(schema.items)) {
        return createColumnMatrixView(schema, matrix)
    }

    if (typeof schema.properties === 'object') {
        return createColumnObjectView(schema, matrix)
    }

    if (schema.items && schema.items.constructor === Object) {
        return createColumnVectorView(schema, matrix)
    }

    throw invalidError
}

/**
 * @implements {MatrixView}
 */
class MatrixViewClass {

    /**
         * @param {number} _startRowIndex
         * @param {string} _pattern
         * @returns {number[]}
         */
    search(_startRowIndex, _pattern) {
        throw ABSTRACT_METHOD;
    }

    /**
     * @returns {any[]}
     */
    getRowStyles() { return [] };

    /**
     * @returns {JSONPatchOperation[]}
     */
    removeModel() { throw ABSTRACT_METHOD; };

    /**
     * @param {number} _rowIndex
     * @returns {JSONPatchOperation[]}
     */
    deleteRow(_rowIndex) {
        throw ABSTRACT_METHOD;
    }

    /**
     * @param {number} _rowIndex
     * @returns {JSONPatch}
     */
    splice(_rowIndex) { throw ABSTRACT_METHOD; };

    /**
     * @param {number} _colIndex
     */
    sort(_colIndex) { };

    /**@type{GridSchema}*/
    schema;

    /**
    * @returns {object}
    */
    getModel() { throw ABSTRACT_METHOD; }

    /**
     * @returns {number}
     */
    columnCount() {
        throw ABSTRACT_METHOD;
    }

    /**
     * @returns {number}
     */
    rowCount() {
        throw ABSTRACT_METHOD;
    }

    /**
     * @param {number} _rowIndex
     * @param {number} _colIndex
     * @returns {*}
     */
    getCell(_rowIndex, _colIndex) {
        throw ABSTRACT_METHOD;
    }

    /**
     * @param {number} _rowIndex
     * @param {number} _colIndex
     * @param {any} _value
     * @param {string} _validation
     * @returns {JSONPatchOperation[]}
     */
    setCell(_rowIndex, _colIndex, _value, _validation) {
        throw ABSTRACT_METHOD;
    }

    /**
     * @param {number} columnIndex
     * @returns {*[]}
     */
    getColumn(columnIndex) {
        return range(this.rowCount()).map(rowIndex => this.getCell(rowIndex, columnIndex));
    }

    /**
     * @param {number} rowIndex
     * @returns {any[]}
     */
    getRow(rowIndex) {
        return range(this.columnCount()).map(columnIndex => this.getCell(rowIndex, columnIndex));
    }

    /**
     * @param {JSONPatchOperation[]} _patch
     */
    applyJSONPatch(_patch) {
        throw ABSTRACT_METHOD;
    }

    /**
     * @returns {Patch}
     */
    updateHolder() {
        throw ABSTRACT_METHOD;
        // const patch = new Patch();
        // if (this.getModel() == null) {
        //     patch.operations.push({op: 'remove', path: ''});
        // }
        // return patch
    }
}

// # Notes about JSON Patch
//
// # Root
// Root path is '', not '/'.
//
// # Arrays
// Index based patching of arrays is weird, value based patching is not supported.
//
// # About index based patching
// In general it is not possible to set array values by index. For example
//     let a = Array(2);
//     0 in a === false;
//     a[0] = 1;
// cannot be expressed by JSON Patch operations. Patching a above by {op:'add', path:'/0', value:1}
// will result in an array of length 3.
// Array values can be inserted, replaced or removed. Indices which do not exits cannot be set.
//
// # Solution
// Work only with arrays where all indices are set. Missing values should be null or undefined.
// So instead of Array(2) use [null, null] or es6 Array.from({length:2}, ()=>null).
// To set a value at index k, first make sure that the target object is an array, for example
//     {op:'add', path:'', value:[]}
// Then
// Case k < array.length: This is a simple {op:'replace', path:'/k', value:value}.
// Case k >= array.length: Add k - array.length nulls followed by adding the value, or
//     for (const l=array.length; l < k; l++) {op:'add', path:'/' + l, value:null}
//     {op:'add', path:'/k', value:value}
//
// For the add operation, never use the '-' path fragment, because we cannot revert that operation into a remove.

/**
 * @param {number} length
 * @param {function(any, number): null} [mapfn]
 * @returns {null[]}
 */
function createArray(length, mapfn) {
    // Note this is differs from Array(length), the latter not having any index set
    // (which we need for JSON Patch)
    mapfn = mapfn || (() => null);
    return Array.from({ length: length }, mapfn)
}

/**
 * @param {any[]} a 
 * @param {number} targetLength 
 * @param {string} prefix 
 * @returns 
 */
function padArray(a, targetLength, prefix) {
    const patch = [];
    for (let k = a.length; k < targetLength; k++) {
        a[k] = null;
        patch.push({ op: 'add', path: prefix + k, value: null });
    }
    return patch
}

/**
 * @param {string} pattern
 * @param {string} value
 * @returns {boolean}
 */
function search(pattern, value) {
    return value.includes(pattern)
}

/**
 * @param {JSONSchema} schema
 */
function readOnly(schema) {
    return (typeof schema.readOnly === 'boolean') ? schema.readOnly : false;
}

/**
 * @param {JSONSchema} jsonSchema
 * @param {(number | string | boolean | null)[][]} rows
 * @returns {MatrixView}
 */
export function createRowMatrixView(jsonSchema, rows) {
    // Array of tuples.
    /** @type{JSONSchema[]} */
    const itemSchemas = jsonSchema.items['items'];
    const columnSchemas = [];
    /** @type{number[]} */
    const columnIndices = [];

    for (const [columnIndex, columnSchema] of itemSchemas.entries()) {
        // Do not test for columnSchema.type === 'object' because the type could be a Date.
        columnSchemas.push(columnSchema);
        columnIndices.push(columnIndex);
    }

    const schemas = createColumSchemas(columnSchemas);

    /** @type{GridSchema} */
    const schema = {
        title: jsonSchema.title,
        columnSchemas: schemas,
        readOnly: readOnly(jsonSchema)
    };

    /**
     * @implements {MatrixView}
     */
    class RowMatrixView extends MatrixViewClass {
        //schema;

        constructor() {
            super();
            this.schema = schema;
        }

        getModel() {
            return rows;
        }

        /**
         * @returns {JSONPatchOperation[]}
         */
        removeModel() {
            const oldValue = rows;
            rows = null;
            return [{ op: 'remove', path: '', oldValue: oldValue }];
        }

        /**
         * @returns {number}
         */
        columnCount() {
            return schemas.length
        }

        /**
         * @returns {number}
         */
        rowCount() {
            return rows ? rows.length : 0
        }

        /**
         * @param {Interval} rowsRange
         * @param {number} colIndex
         * @returns {any[]}
         */
        getColumnSlice(rowsRange, colIndex) {
            colIndex = columnIndices[colIndex];
            return range(rowsRange.sup - rowsRange.min).map(i => rowsRange[rowsRange.min + i][colIndex]);
        }

        /**
         * @param {number} rowIndex
         * @returns {JSONPatchOperation[]}
         */
        deleteRow(rowIndex) {
            const oldValue = rows[rowIndex];
            rows.splice(rowIndex, 1);
            return [{ op: 'remove', path: `/${rowIndex}`, oldValue }];
        }

        /**
         * @param {number} rowIndex
         * @param {number} colIndex
         * @returns {*}
         */
        getCell(rowIndex, colIndex) {
            colIndex = columnIndices[colIndex];
            // TODO: Should not be called with rowIndex >= rowCount.
            if (!rows[rowIndex]) {
                return null;
            }
            return rows[rowIndex][colIndex];
        }

        /**
         * @param {number} rowIndex
         * @param {number} colIndex
         * @param {any} value
         * @param {string} validation
         * @returns {JSONPatch}
         */
        setCell(rowIndex, colIndex, value, validation) {
            function createOperation(oldValue) {
                let op = { op: 'replace', path: `/${rowIndex}/${colIndex}`, value: value, oldValue };
                if (validation) op.error = validation;
                return op
            }
            colIndex = columnIndices[colIndex];
            let patch = [];

            if (value == null) {
                if (!rows[rowIndex]) {
                    return patch
                }
                // Important: Must not delete rows[rowIndex][colIndex], as this would produce an empty index, which is not JSON.
                patch.push(createOperation(rows[rowIndex][colIndex]));
                rows[rowIndex][colIndex] = null;
                return patch
            }

            if (!rows) {
                rows = createArray(1 + rowIndex);
                patch.push({ op: 'add', path: '', value: createArray(1 + rowIndex) });
            }

            patch.push(...padArray(rows, 1 + rowIndex, '/'));

            if (!rows[rowIndex]) {
                rows[rowIndex] = createArray(1 + colIndex);
                patch.push({ op: 'replace', path: `/${rowIndex}`, value: createArray(1 + colIndex), oldValue: null });
            } else if (rows[rowIndex].length < schemas.length) {
                patch.push(...padArray(rows[rowIndex], schemas.length, `/${rowIndex}/`));
            }

            const oldValue = rows[rowIndex][colIndex];
            if (value === oldValue) {
                // TODO: assert that patch is empty?
                return patch
            }
            patch.push(createOperation(oldValue));

            rows[rowIndex][colIndex] = value;
            return patch;
        }

        /**
         * @param {number} rowIndex
         * @returns {JSONPatch}
         */
        splice(rowIndex) {
            rows.splice(rowIndex, 0, null);
            return [{ op: 'add', path: `/${rowIndex}`, value: null }];
        }

        /**
         * @param {number} colIndex
         */
        sort(colIndex) {
            colIndex = columnIndices[colIndex];
            let sortDirection = updateSortDirection(schemas, colIndex);
            rows.sort((row1, row2) => schemas[colIndex].compare(row1[colIndex], row2[colIndex]) * sortDirection);
        }

        /**
         * @param {number} startRowIndex
         * @param {string} pattern
         * @returns {number[]}
         */
        search(startRowIndex, pattern) {
            for (let rowIndex = startRowIndex; rowIndex < rows.length; rowIndex++) {
                // TODO: Must not use String, but converter.toEditable()
                const columnIndex = rows[rowIndex].findIndex((value) => search(pattern, String(value)));
                if (columnIndex !== -1) {
                    return [rowIndex, columnIndex]
                }
            }
            return [-1, -1]
        }

        applyJSONPatch(patch) {
            rows = /**@type{object[]}*/ (applyJSONPatch(rows, patch));
        }
    }

    return new RowMatrixView();
}

/**
 * @param {JSONSchema} jsonSchema
 * @param {Array<object>} rows
 * @returns {MatrixView}
 */
export function createRowObjectsView(jsonSchema, rows) {

    const entries = sortedColumns(jsonSchema.items['properties']);
    const columnSchemas = entries.map(function (e) {
        e[1].title = e[1].title || e[0];
        return e[1]
    });
    const ids = entries.map(e => e[0]);
    const rowStyles = new Array(rows ? rows.length : 0);
    const schemas = createColumSchemas(columnSchemas);

    /**@type{GridSchema} */
    const schema = {
        title: jsonSchema.title,
        columnSchemas: schemas,
        ids,
        readOnly: readOnly(jsonSchema)
    };

    /**
     * @implements {MatrixView}
     */
    class RowObjectsView extends MatrixViewClass {

        constructor() {
            super();
            this.schema = schema;
        }

        getModel() {
            return rows;
        }

        getRowStyles() {
            return rowStyles
        }

        /**
         * @returns {JSONPatch}
         */
        removeModel() {
            const patch = [{ op: 'remove', path: '', oldValue: rows }];
            rows = null;
            return patch
        }

        /**
         * @returns {number}
         */
        rowCount() {
            return rows ? rows.length : 0
        }

        /**
         * @returns {number}
         */
        columnCount() {
            return schemas.length
        }

        /**
         * @param {number} rowIndex
         * @returns {JSONPatch}
         */
        deleteRow(rowIndex) {
            const deleteElements = rows.splice(rowIndex, 1);
            rowStyles.splice(rowIndex, 1);
            return [{ op: 'remove', path: `/${rowIndex}`, oldValue: deleteElements[0] }];
        }

        /**
         * @param {number} rowIndex
         * @param {number} colIndex
         * @returns {*}
         */
        getCell(rowIndex, colIndex) {
            if (!rows[rowIndex]) return null;
            return rows[rowIndex][ids[colIndex]];
        }

        /**
         * @param {number} rowIndex
         * @param {number} colIndex
         * @param {any} value
         * @param {string} _validation
         * @returns {JSONPatch}
         */
        setCell(rowIndex, colIndex, value, _validation) {
            let patch = [];

            if (!rows) {
                rows = createArray(1 + rowIndex);
                patch.push({ op: 'add', path: '', value: createArray(1 + rowIndex) });
            }

            patch.push(...padArray(rows, 1 + rowIndex, '/'));

            if (!rows[rowIndex]) {
                rows[rowIndex] = {};
                // TODO: Make this an add and previous padArray(rows, rowIndex, '/-')
                patch.push({ op: 'replace', path: `/${rowIndex}`, value: {} });
            }

            const key = ids[colIndex];
            const oldValue = rows[rowIndex][key];
            if (value == null && oldValue == null) {
                // No Op
            } else if (value == null) {
                patch.push({ op: 'remove', path: `/${rowIndex}/${key}`, oldValue });
                delete rows[rowIndex][key];
            } else if (oldValue == null) {
                patch.push({ op: 'add', path: `/${rowIndex}/${key}`, value });
                rows[rowIndex][key] = value;
            } else {
                patch.push({ op: 'replace', path: `/${rowIndex}/${key}`, value: value, oldValue: oldValue });
                rows[rowIndex][key] = value;
            }

            return patch;
        }

        /**
         * @param {number} rowIndex
         * @returns {JSONPatch}
         */
        splice(rowIndex) {
            rows.splice(rowIndex, 0, null);
            rowStyles.splice(rowIndex, 0, null);
            return [{ op: 'add', path: `/${rowIndex}`, value: null }];
        }

        /**
         * @param {number} colIndex
         */
        sort(colIndex) {
            let sortDirection = updateSortDirection(schemas, colIndex);
            rows.sort((row1, row2) => schemas[colIndex].compare(row1[ids[colIndex]], row2[ids[colIndex]]) * sortDirection);
        }

        /**
         * @param {number} startRowIndex
         * @param {string} pattern
         * @returns {number[]}
         */
        search(startRowIndex, pattern) {
            for (let rowIndex = startRowIndex; rowIndex < rows.length; rowIndex++) {
                const row = rows[rowIndex];
                // TODO: Must not use String, but converter.toEditable()
                for (const [columnIndex, id] of ids.entries()) {
                    if (search(pattern, row[id])) {
                        return [rowIndex, columnIndex]
                    }
                }
            }
            return [-1, -1]
        }

        /**
         * @param {JSONPatchOperation[]} patch 
         */
        applyJSONPatch(patch) {
            rows = /**@type{object[]}*/ (applyJSONPatch(rows, patch));
        }
    }

    return new RowObjectsView();
}

/**
 * @param {JSONSchema} jsonSchema
 * @param {object[]} columns
 * @returns {MatrixView}
 */
export function createColumnMatrixView(jsonSchema, columns) {
    const columnSchemas = /**@type{JSONSchema[]}*/(jsonSchema.items).map(item => /**@type{JSONSchema}*/(item.items));
    const schemas = createColumSchemas(columnSchemas);

    /**@type{GridSchema} */
    const schema = {
        title: jsonSchema.title,
        columnSchemas: schemas,
        readOnly: readOnly(jsonSchema)
    };

    function getRowCount() {
        if (!columns) return 0;
        return columns.reduce((length, column) => Math.max(length, column ? column.length : 0), 0);
    }

    /**
     * @implements {MatrixView}
     */
    class ColumnMatrixView extends MatrixViewClass {
        constructor() {
            super();
            this.schema = schema;
        }

        getModel() {
            return columns;
        }

        /**
         * @returns {JSONPatch}
         */
        removeModel() {
            const patch = [{ op: 'remove', path: '', oldValue: columns }];
            columns = null;
            return patch
        }

        /**
         * @returns {number}
         */
        rowCount() {
            return getRowCount();
        }

        /**
         * @returns {number}
         */
        columnCount() {
            return schemas.length
        }

        /**
         * @param {number} rowIndex
         * @returns {JSONPatch}
         */
        deleteRow(rowIndex) {
            const patch = [];
            columns.forEach(function (column, colIndex) {
                if (column) {
                    const deletedElements = column.splice(rowIndex, 1);
                    patch.push({ op: 'remove', path: `/${colIndex}/${rowIndex}`, oldValue: deletedElements[0] })
                }
            });
            return patch;
        }

        /**
         * @param {number} rowIndex
         * @param {number} colIndex
         * @returns {*}
         */
        getCell(rowIndex, colIndex) {
            if (!columns[colIndex]) return null;
            return columns[colIndex][rowIndex];
        }

        /**
         * @param {number} rowIndex
         * @param {number} colIndex
         * @param {any} value
         * 
         * @returns {JSONPatch}
         */
        setCell(rowIndex, colIndex, value) {
            let patch = [];
            if (!columns) {
                columns = createArray(schemas.length);
                patch.push({ op: 'add', path: '', value: createArray(schemas.length) });
            }

            let column = columns[colIndex];
            if (!column) {
                column = columns[colIndex] = [];
                patch.push({ op: 'replace', path: `/${colIndex}`, value: [] });
            }

            if (rowIndex >= column.length) {
                patch.push(...padArray(column, rowIndex + 1, `/${colIndex}/`));
            }

            const oldValue = columns[colIndex][rowIndex];
            // Must not use remove operation here!
            columns[colIndex][rowIndex] = value;
            patch.push({ op: 'replace', path: `/${colIndex}/${rowIndex}`, value: value, oldValue });

            return patch;
        }

        /**
         * @param {number} rowIndex
         * @returns {JSONPatch}
         */
        splice(rowIndex) {
            let patch = [];
            columns.forEach(function (column, colIndex) {
                if (column) {
                    column.splice(rowIndex, 0, null);
                    patch.push({ op: 'add', path: `/${colIndex}/${rowIndex}`, value: null });
                }
            });
            return patch;
        }

        /**
         * @param {number} colIndex
         */
        sort(colIndex) {
            let sortDirection = updateSortDirection(schemas, colIndex);
            const indexes = columns[colIndex].map((value, rowIndex) => [value, rowIndex]);

            indexes.sort((a, b) => schemas[colIndex].compare(a[0], b[0]) * sortDirection);

            columns.forEach(function (column, j) {
                const sortedColumn = Array();
                indexes.forEach(function (index, i) {
                    sortedColumn[i] = column[index[1]];
                });
                columns[j] = sortedColumn;
            });
        }

        /**
         * @param {number} startRowIndex
         * @param {string} pattern
         * @returns {number[]}
         */
        search(startRowIndex, pattern) {
            const rowCount = getRowCount();
            for (let rowIndex = startRowIndex; rowIndex < rowCount; rowIndex++) {
                for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
                    const value = this.getCell(rowIndex, columnIndex);
                    if (search(pattern, value)) {
                        return [rowIndex, columnIndex]
                    }
                }
            }
            return [-1, -1]
        }

        applyJSONPatch(patch) {
            columns = /**@type{object[]}*/ (applyJSONPatch(columns, patch));
        }
    }

    return new ColumnMatrixView();
}

/**
 * @param {JSONSchema} jsonSchema
 * @param {Object.<string, any[]>} columns
 */
export function createColumnObjectView(jsonSchema, columns) {
    // Object of columns.

    const entries = sortedColumns(jsonSchema.properties);
    const columnSchemas = [];
    for (const entry of entries) {
        const property = entry[1];
        const colSchema = property.items;
        if (typeof colSchema !== 'object') {
            // TODO: Be much more strict!
            throw Error('Invalid column schema');
        }
        if (!colSchema.title) colSchema.title = property.title || entry[0];
        if (!colSchema.width) colSchema.width = property.width;

        columnSchemas.push(colSchema);
    }

    const ids = entries.map(e => e[0]);
    const rowStyles = new Array(getRowCount());
    let schemas = createColumSchemas(columnSchemas);

    /**@type{GridSchema}*/
    const schema = {
        title: jsonSchema.title,
        columnSchemas: schemas,
        ids,
        readOnly: readOnly(jsonSchema)
    };

    function getRowCount() {
        if (!columns) return 0;
        return Object.values(columns).reduce((length, column) => Math.max(length, column.length), 0);
    }

    /**
     * @implements {MatrixView}
     */
    class ColumnObjectView extends MatrixViewClass {
        constructor() {
            super();
            this.schema = schema;
        }

        getModel() {
            return columns;
        }

        getRowStyles() {
            return rowStyles
        }

        /**
         * @returns {JSONPatch}
         */
        removeModel() {
            const patch = [{ op: 'remove', path: '', oldValue: columns }];
            columns = null;
            return patch
        }

        /**
         * @returns {number}
         */
        rowCount() {
            return getRowCount();
        }

        /**
         * @returns {number}
         */
        columnCount() {
            return schemas.length
        }

        /**
         * @param {number} rowIndex
         * @returns {JSONPatch}
         */
        deleteRow(rowIndex) {
            const patch = [];
            Object.keys(columns).forEach(function (key) {
                // TODO: Handle column == null
                const column = columns[key];
                const deletedElements = column.splice(rowIndex, 1);
                patch.push({ op: 'remove', path: `/${key}/${rowIndex}`, oldValue: deletedElements[0]})
            });
            rowStyles.splice(rowIndex, 1);
            return patch;
        }

        /**
         * @param {number} rowIndex
         * @param {number} colIndex
         * @returns {*}
         */
        getCell(rowIndex, colIndex) {
            const key = ids[colIndex];
            if (!columns[key]) return null;
            return columns[key][rowIndex];
        }

        /**
         * @param {number} rowIndex
         * @param {number} colIndex
         * @param {any} value
         * @param {string} _validation
         * @returns {JSONPatch}
         */
        setCell(rowIndex, colIndex, value, _validation) {
            let patch = [];
            const key = ids[colIndex];

            if (!columns) {
                /**
                 * @returns {Object.<string, any[]>}
                 */
                const createEmptyObject = function () {
                    /** @type{Object.<string, any[]>} */
                    const o = {};
                    o[key] = [];
                    return o;
                };
                columns = createEmptyObject();
                patch.push({ op: 'add', path: '', value: createEmptyObject() });
            }

            let column = columns[key];
            if (!column) {
                column = columns[key] = [];
                patch.push({ op: 'add', path: `/${key}`, value: [] });
            }

            if (rowIndex >= column.length) {
                patch.push(...padArray(column, rowIndex + 1, `/${key}/`));
            }

            const oldValue = column[rowIndex];
            column[rowIndex] = value;
            // Must not use remove operation here!
            patch.push({ op: 'replace', path: `/${key}/${rowIndex}`, value: value, oldValue });

            return patch;
        }

        /**
         * @param {number} rowIndex
         * @returns {JSONPatch}
         */
        splice(rowIndex) {
            /** @type{JSONPatch} */
            let patch = [];
            // TODO: Object.values and sort index?
            ids.forEach(function (key) {
                const column = columns[key];
                if (!column) {
                    return
                }
                column.splice(rowIndex, 0, null);
                patch.push({ op: 'add', path: `/${key}/${rowIndex}`, value: null });
            });
            rowStyles.splice(rowIndex, 0, null);
            return patch;
        }

        /**
         * @param {number} colIndex
         */
        sort(colIndex) {
            const key = ids[colIndex];
            let sortDirection = updateSortDirection(schemas, colIndex);
            const indexes = columns[key].map((value, rowIndex) => [value, rowIndex]);

            indexes.sort((a, b) => schemas[colIndex].compare(a[0], b[0]) * sortDirection);

            ids.forEach(function (key) {
                const sortedColumn = Array();
                const column = columns[key];
                if (!column) return;
                indexes.forEach(function (index, i) {
                    sortedColumn[i] = column[index[1]];
                });
                columns[key] = sortedColumn;
            });
        }

        /**
         * @param {number} startRowIndex
         * @param {string} pattern
         * @returns {number[]}
         */
        search(startRowIndex, pattern) {
            const rowCount = getRowCount();
            for (let rowIndex = startRowIndex; rowIndex < rowCount; rowIndex++) {
                for (let columnIndex = 0; columnIndex < ids.length; columnIndex++) {
                    const value = this.getCell(rowIndex, columnIndex);
                    if (search(pattern, value)) {
                        return [rowIndex, columnIndex]
                    }
                }
            }
            return [-1, -1]
        }

        /**
         * @param {JSONPatch} patch
         */
        applyJSONPatch(patch) {
            columns = applyJSONPatch(columns, patch);
        }
    }

    return new ColumnObjectView();
}

/**
 * @param {JSONSchema} jsonSchema
 * @param {(number|string|boolean|null)[]} column
 */
export function createColumnVectorView(jsonSchema, column) {

    const items = /**@type{JSONSchema} */(jsonSchema.items);
    const title = items.title;
    items.title = title;

    const schemas = createColumSchemas([items]);
    const columnSchema = schemas[0];

    /**@type{GridSchema} */
    const schema = {
        title: title,
        columnSchemas: schemas,
        readOnly: readOnly(jsonSchema)
    };

    function getRowCount() {
        if (!column) return 0;
        return column.length
    }

    /**
     * @implements {MatrixView}
     */
    class ColumnVectorView extends MatrixViewClass {
        constructor() {
            super();
            this.schema = schema;
        }

        getModel() {
            return column;
        }

        /**
         * @returns {JSONPatch}
         */
        removeModel() {
            const patch = [{ op: 'remove', path: '', oldValue: column }];
            column = null;
            return patch
        }

        /**
         * @returns {number}
         */
        columnCount() {
            return 1
        }

        /**
         * @returns {number}
         */
        rowCount() {
            return getRowCount();
        }

        /**
         * @param {number} rowIndex
         * @returns {JSONPatch}
         */
        deleteRow(rowIndex) {
            column.splice(rowIndex, 1);
            return [{ op: 'remove', path: `/${rowIndex}` }];
        }

        /**
         * @param {number} rowIndex
         * @param {number} colIndex
         * @returns {*}
         */
        getCell(rowIndex, colIndex) {
            if (colIndex !== 0) throw Error()
            return column[rowIndex];
        }

        /**
         * @param {number} rowIndex
         * @param {number} colIndex
         * @param {any} value
         * @param {string} _validation
         * @returns {JSONPatch}
         */
        setCell(rowIndex, colIndex, value, _validation) {
            if (colIndex !== 0) {
                throw new RangeError();
            }
            let patch = [];

            if (!column) {
                column = createArray(1 + rowIndex);
                patch.push({ op: 'add', path: '', value: createArray(1 + rowIndex) });
            } else if (rowIndex >= column.length) {
                patch.push(...padArray(column, rowIndex + 1, '/'));
            }

            const oldValue = column[rowIndex];
            if (value == null) {
                // Important: Must not use delete column[rowIndex], see RowMatrixView.
                column[rowIndex] = null;
                patch.push({ op: 'replace', path: `/${rowIndex}`, value: null, oldValue });
                return patch
            }

            patch.push({ op: 'replace', path: `/${rowIndex}`, value: value, oldValue });

            column[rowIndex] = value;
            return patch;
        }

        /**
         * @param {number} rowIndex
         * @returns {JSONPatch}
         */
        splice(rowIndex) {
            column.splice(rowIndex, 0, null);
            return [{ op: 'add', path: `/${rowIndex}`, value: null }]
        }

        /**
         * @param {number} colIndex
         */
        sort(colIndex) {
            console.assert(colIndex === 0);
            let sortDirection = updateSortDirection([columnSchema], 0);
            column.sort((a, b) => columnSchema.compare(a, b) * sortDirection);
        }

        /**
         * @param {number} startRowIndex
         * @param {string} pattern
         * @returns {number[]}
         */
        search(startRowIndex, pattern) {
            const rowCount = getRowCount();
            for (let rowIndex = startRowIndex; rowIndex < rowCount; rowIndex++) {
                const value = column[rowIndex];
                // TODO: Must not use String, but converter.toEditable()
                if (search(pattern, String(value))) {
                    return [rowIndex, 0]
                }
            }
            return [-1, -1]
        }

        applyJSONPatch(patch) {
            column = /**@type{(number|string|boolean|null)[]}*/ (applyJSONPatch(column, patch));
        }
    }

    return new ColumnVectorView();
}
