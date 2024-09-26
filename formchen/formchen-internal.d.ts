/////////////////////////////
/// formchen JavaScript APIs
/////////////////////////////

import { JSONSchema, TransactionManager, Patch } from "../gridchen/gridchen"

// export interface Graph {
//     add: (node: BaseNode) => void;
//     getNodeById: (id: string) => BaseNode;
// }

export interface BaseNode {
    tooltip: string;
    graph: Graph;
    parent: HolderNode;
    schema: JSONSchema;
    key: string | number;
    path: string;
    title: string;
    readOnly: boolean;

    getValue: () => any;
    setValue: (any) => Patch;
    _setValue: (any, disabled: boolean) => HTMLInputElement?;
    refreshUI: (disabled: boolean) => void;
}

export interface HolderNode extends BaseNode {
    obj: object | Array;
    children: BaseNode[];
}


