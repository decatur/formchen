/////////////////////////////
// Author: Wolfgang Kühn 2019-2024
// Public formchen JavaScript APIs
// Source located at https://github.com/decatur/formchen
/////////////////////////////

export interface FormChen {
    /**
     * The current value of the bound object.
     */
    readonly value: object;

    /**
     * Returns a flat patch set according to JSON Patch https://tools.ietf.org/html/rfc6902
     * of all performed transactions.
     */
    readonly patch: JSONPatchOperation[];

    clearPatch: () => void;
}

/**
 * The Web Component.
 */
export interface GridChenElement extends HTMLElement {

    bind: (schema: JSONSchema, data: any) => void;

    readonly value: any;

    /**
     * Returns a flat patch set according to JSON Patch https://tools.ietf.org/html/rfc6902
     * of all performed transactions.
     */
    readonly patch: JSONPatchOperation[];
    clearPatch: () => void;




    // /**
    //  * Returns the selection as a rectangle.
    //  */
    // readonly selectedRange: Range;

    // select: (r: Range) => void;

    // insertEmptyRow: (rowIndex: number, options: { fadeOutDuration: number }) => void;
}

export interface JSONPatchOperation {
    op: string;
    path: string;
    value?: any;
    oldValue?: any;
}

export interface JSONSchema {
    width?: number;
    period?: string;
    multipleOf?: number;
    // converter?: Converter;
    minimum?: number;
    maximum?: number;
    format?: string;
    tooltip?: string;
    readOnly?: boolean;
    title?: string;
    type: string;
    /**
     * If properties is set, this schema describes an object.
     */
    properties?: { [key: string]: JSONSchema };
    /**
     * If items is an array object, this schema describes a fixed length tuple
     * with item at index having schema items[index].
     * If items is an object, this schema describes a variable length array
     * with each item having the object as its schema.
     */
    items?: JSONSchema | JSONSchema[];
    prefixItems?: JSONSchema[];
    enum?: (string | number)[];
    readOnly?: boolean;
    height?: number;
    fractionDigits?: number;
    // TODO: Rename according ISO
    frequency?: string;
    sortDirection?: number;
    unit?: string;
}