/////////////////////////////
// Author: Wolfgang Kühn 2019-2024
// Public formchen JavaScript APIs
// Source located at https://github.com/decatur/formchen
/////////////////////////////

export interface FormChen {
    /**
     * The current value of the bound object.
     */
    value: object;

    /**
     * Returns a flat patch set according to JSON Patch https://tools.ietf.org/html/rfc6902
     * of all performed transactions.
     */
    readonly patch: JSONPatch;

    clearPatch: () => void;
}

// See https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/refs/heads/master/types/json-patch/index.d.ts
type JSONPatchOperation = AddPatch | RemovePatch | ReplacePatch;
interface Patch {
    path: string;
}
interface AddPatch extends Patch {
    op: "add";
    value: any;
    validation?: string;
}
interface RemovePatch extends Patch {
    op: "remove";
    oldValue?: any;
}
interface ReplacePatch extends Patch {
    op: "replace";
    value: any;
    oldValue?: any;
    validation?: string;
}

export type JSONPatch = JSONPatchOperation[];
export type JSONSchemaOrRef = JSONSchema | JSONSchemaRef;

interface JSONSchemaRef  {
    $ref: string;
    title?: string;
}

export interface JSONSchema {
    $defs?: { [key: string]: JSONSchema };
    width?: number;
    period?: "hours" | "minutes" | "seconds" | "milli_seconds";
    multipleOf?: number;
    // converter?: Converter;
    minimum?: number;
    maximum?: number;
    format?: "grid" | "datetime" | "date" | "url" | "color";
    description?: string;
    readOnly?: boolean;
    total?: 'sum' | 'avg';
    title?: string;
    type: string;
    /**
     * If properties is set, this schema describes an object.
     */
    properties?: { [key: string]: JSONSchemaOrRef };
    /**
     * If items is an array object, this schema describes a fixed length tuple
     * with item at index having schema items[index].
     * If items is an object, this schema describes a variable length array
     * with each item having the object as its schema.
     */
    items?: JSONSchemaOrRef | JSONSchemaOrRef[];
    prefixItems?: JSONSchemaOrRef[];
    enum?: (string | number)[];
    height?: number;
    fractionDigits?: number;
    // TODO: Rename according ISO
    frequency?: string;
    sortDirection?: number;
    unit?: string;
}