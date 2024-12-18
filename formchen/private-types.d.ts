/////////////////////////////
// Author: Wolfgang Kühn 2019-2024
// Private/internal formchen APIs
// Source located at https://github.com/decatur/formchen


import type { JSONSchema, JSONSchemaOrRef, FormChen, JSONPatch } from './types.d.ts'
import {Patch, Transaction} from './utils.js'

// export interface FormChenExt extends FormChen {
//     getNodeById: (id: string) => BaseNode;
// }

export enum CellEditMode {
    HIDDEN = 'hidden',
    INPUT = 'input',
    EDIT = 'edit'
}

export interface ColumnSchema {
    readonly type: string;
    format?: string;
    title: string;
    width?: number;
    fractionDigits?: number;
    total?: 'sum' | 'avg';
    sortDirection?: number;
    // TODO: Rename according ISO
    period?: string;
    enum?: (string | number)[];
    readOnly?: boolean; 
    
    converter?: Converter;
    compare: (a: any, b: any) => number;
}

export interface GridSchema {
    title: string;
    columnSchemas: ColumnSchema[];
    ids?: string[];
    readOnly?: boolean;
}

export interface ParsedValue {
    input: string;
    parsed: number | string | boolean;
    validation: string;
    value: number | string | boolean;
}

export interface Converter {
    fromEditable: (a: string) => ParsedValue; 
    toTSV: (a: (number | Date | string | boolean)) => string;
    toEditable: (a: (number | Date | string | boolean)) => string;
    createElement: () => HTMLElement;
    render: (element: HTMLElement, value: any) => void;

    conditionInput: (element: HTMLInputElement|HTMLTextAreaElement, readOnly: boolean) => void;
    fromInput: (HTMLInputElement) => ParsedValue;
    toInput: (string, HTMLInputElement) => void;
    toInputEdit: (number, HTMLInputElement) => void;
}

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
    setBounds: (rowIndex: number, columnIndex: number, rowCount: number, columnCount: number) => void;
}

// A range of one cell only.
export type Cell = Range;



// export interface PlotEventDetail {
//     graphElement: HTMLElement;
//     title: string;
//     schemas: ColumnSchema[];
//     columns: number[][];
// }

// interface PlotEvent extends CustomEvent<PlotEventDetail> {
// }



export function createView(schema: JSONSchema, view: any[] | object): MatrixView;

export interface MatrixView {
    search(startRowIndex: number, s: string): number[];
    getRowStyles: () => any[];
    schema: GridSchema;
    getModel: () => object;
    // setModel: (obj) => void;
    columnCount: () => number;
    rowCount: () => number;
    removeModel: () => JSONPatch; // TODO: Return void.
    deleteRow: (rowIndex: number) => JSONPatch;
    getCell: (rowIndex: number, colIndex: number) => any;
    getRow: (rowIndex: number) => any[];
    getColumn: (colIndex: number) => any[];
    setCell: (rowIndex: number, colIndex: number, value: any, validation: string) => JSONPatch;
    splice: (rowIndex: number) => JSONPatch; // TODO: Rename to insertEmptyRow
    sort: (colIndex: number) => void;
    // TODO: Return the patched object as of getModel()?
    applyJSONPatch: (patch: JSONPatch) => void;
    updateHolder: () => Patch;
}

export interface TransactionEvent {
    type: string;
    transaction: Transaction;
}

// #### Begin of grichen internal types ####
export interface Interval {
    min: number;
    sup: number;
}

export interface Selection extends Range {
    active: Range;
    initial: Range;
    pilot: Range;
    areas: Range[];
    headerSelected: boolean;
    lastEvt: KeyboardEvent;
    show: () => void;
    hide: () => void;
    move: (rowIncrement: number, columnIncrement: number, doExpand?: boolean) => void;
    setRange: (rowIndex: number, columnIndex: number, rowCount: number, columnCount: number) => void;
    startSelection: (evt: MouseEvent, cellParent: HTMLElement, indexMapper: IndexToPixelMapper) => void;
    convexHull: () => void;
    uiRefresher: (area: Range, show: boolean) => void;
    keyDownHandler: (evt: KeyboardEvent) => void;
}

export interface IndexToPixelMapper {
    cellIndexToPixelCoords: (rowIndex: number, columnIndex: number) => { clientX: number, clientY: number };
    pixelCoordsToCellIndex: (clientX: number, clientY: number) => { rowIndex: number, columnIndex: number }
}

export interface GridSelectionAbstraction {
    colCount: number;
    rowCount: number;
    pageIncrement: number;
    container: HTMLElement;
    scrollIntoView: (rowIndex: number, rowIncrement: number) => void;
    repaintActiveCell: (active: Range) => void;
}

export interface PatchNode {
    children: Record<string, PatchNode>;
    items: PatchNode[];
    splices: { op: string, index: number }[];
    op: string;
    value: any;
}


export interface ResizeObserverEntry {
    // Not yet exported by lib.dom.d.ts
}

/**
 * The Web Component.
 */
export interface GridChenElement extends HTMLElement {

    bind: (schema: JSONSchemaOrRef, value: any) => void;

    readonly value: any;

    /**
     * Returns a flat patch set according to JSON Patch https://tools.ietf.org/html/rfc6902
     * of all performed transactions.
     */
    readonly patch: JSONPatch;
    clearPatch: () => void;
}




