/////////////////////////////
// Author: Wolfgang Kühn 2019-2024
// gridchen JavaScript APIs
// Source located at https://github.com/decatur/gridchen/gridchen
/////////////////////////////

declare module GridChenNS {

    export interface JSONSchema {
        width?: number;
        period?: string;
        multipleOf?: number;
        converter?: (any) => any;
        minimum?: number;
        maximum?: number;
        format?: string;
        tooltip: string;
        editable: boolean;
        title?: string;
        pathPrefix?: string,
        type: string;
        /**
         * If properties is set, this schema describes an object.
         */
        properties?: {[key: string]: JSONSchema};
        /**
         * If items is an array object, this schema describes a fixed length tuple
         * with item at index having schema items[index].
         * If items is an object, this schema describes a variable length array
         * with each item having the object as its schema.
         */
        items?: JSONSchema | JSONSchema[];
		enum?: (string | number)[];						   
        readOnly?: boolean;
		height?: number;
        fractionDigits?: number;
        // TODO: Rename according ISO
        frequency?: string;
        sortDirection?: number;
        unit?: string;				
    }

    export interface ColumnSchema {
        readonly type: string;
        format?: string;
        title: string;
        width?: number;
        fractionDigits?: number;
        sortDirection?: number;
        converter?: Converter;
        // TODO: Rename according ISO
        period?: string;
        enum?: (string|number)[];
        readOnly?: boolean; // TODO: Remove
        editable?: boolean;
    }

    export interface GridSchema {
        pathPrefix: string,
        title: string;
        columnSchemas: ColumnSchema[];
		detailSchemas: ColumnSchema[];							  
        ids?: string[];
        readOnly?: boolean;
    }

    export interface Converter {
        fromEditable: (a: string) => (number | Date | string | boolean);
        toTSV: (a: (number | Date | string | boolean)) => string;
        toEditable: (a: (number | Date | string | boolean)) => string;
        createElement:() => HTMLElement;
        render: (element: HTMLElement, value: any) => void;
    }

    // export interface Interval {
    //     min: number;
    //     sup: number;
    // }

    /**
     * A rectangular range of grid cells.
     */
    export interface Range {
        /**
         * Returns the lowest row index in the range.
         */
        rowIndex: number;
        /**
         * Returns the lowest column index in the range.
         */
        columnIndex: number;
        rowCount: number;
        columnCount: number;
        //right: () => number;
        //bottom: () => number;
        offset: (rowOffset: number, colOffset: number) => Range;
        intersect: (other: Range) => Range | void;  // TODO: Do not return void, work with empty.
        intersects: (other: Range) => boolean;
        subtract: (other: Range) => Range[];
        clone: () => Range;
    }

    // A range of one cell only.
    export type Cell = Range;

    /**
     * The Web Component.
     */
    export interface GridChen extends HTMLElement {
        /**
         * Resets this element based on the specified view.
         * @param view
         */
        resetFromView: (view: MatrixView, transactionManager?: TransactionManager) => GridChen;

        /**
         * Resets this element with respect to its implicit dependencies, DOM dimensions and data view content.
         * Currently, this is implemented by calling resetFromView().
         */
        reset: () => void;

        /**
         * Rereads to data view content.
         */
        refresh: (pathPrefix?: string) => GridChen;

        /**
         * Returns the selection as a rectangle.
         */
        readonly selectedRange: Range;

        select: (r: Range) => void;

        insertEmptyRow: (rowIndex: number, options: {fadeOutDuration: number}) => void;
    }

    export interface PlotEventDetail {
        graphElement: HTMLElement;
        title: string;
        schemas: ColumnSchema[];
        columns: number[][];
    }

    interface PlotEvent extends CustomEvent<PlotEventDetail> {
    }

    export interface JSONPatchOperation {
        op: string;
        path: string;
        value?: any;
        oldValue?: any;
        nodeId?: string;
    }

    export interface Patch {
        apply: (Patch) => void;
        pathPrefix: string;
        detail: object;
        operations: JSONPatchOperation[];
    }

    export type JSONPatch = JSONPatchOperation[];

    export function createView(schema: JSONSchema, view: any[] | object): MatrixView;

    export interface MatrixView {
        search(arg0: number, s: any): [any, any];
        getRowStyles: any;
        schema: GridSchema;
        getModel: () => object;
        // setModel: (obj) => void;
        columnCount: () => number;
        rowCount: () => number;
        removeModel: () => JSONPatch; // TODO: Return void.
        deleteRow: (rowIndex: number) => JSONPatch;
        getCell: (rowIndex: number, colIndex: number) => any;
        getRow: (rowIndex: number) => any;
        getColumn: (colIndex: number) => any;
        setCell: (rowIndex: number, colIndex: number, value: any) => JSONPatchOperation[];
        splice: (rowIndex: number) => JSONPatch; // TODO: Rename to insertEmptyRow
        sort: (colIndex: number) => void;
        // TODO: Return the patched object as of getModel()?
        applyJSONPatch: (patch: JSONPatch) => void;
        updateHolder: () => Patch;
    }

    export interface Transaction {
        patches: Patch[];
        commit: () => void;
		context: () => void;					
        readonly operations: JSONPatchOperation[]
    }

    export interface TransactionEvent {
        type: string;
        transaction: Transaction;
    }

    export interface TransactionManager {

        addEventListener: (type: string, listener: (evt: TransactionEvent) => void) => void;

        requestTransaction: (func:() => void) => Promise<void>;

        /**
         * @param {(ops:GridChenNS.JSONPatchOperation[]) => any} apply
         */
        openTransaction: (apply) => Transaction;

        undo: () => void;

        redo: () => void;

        /**
         * Clears the accumulated transactions.
         */
        clear: () => void;

        /**
         * Returns a flat patch set according to JSON Patch https://tools.ietf.org/html/rfc6902
         * of all performed transactions.
         */
        readonly patch: JSONPatch;
    }

    enum CellEditMode {
        HIDDEN = 'hidden',
        INPUT = 'input',
        EDIT = 'edit'
    }

    export interface LocalDateParser {
        dateTime(s: String): {parts?: [number, number, number, number, number, number, number, number, number], error?: SyntaxError};
        datePartialTime: (string) => {parts?: [number, number, number], error?: SyntaxError};
    }

}