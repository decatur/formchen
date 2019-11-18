/////////////////////////////
/// form-chen JavaScript APIs
/////////////////////////////

declare module FormChenNS {

    export interface Graph {
        pathPrefix: string;
        add: (node: TypedValue) => void;
        getNodeById: (id: string) => TypedValue;
    }
    
    export interface TypedValue {
        id: string;
        graph: Graph;
        parent: ProxyNode;
        schema: GridChenNS.ColumnSchema;
        key: string | number;
        path: string;
        title: string;
        readOnly: boolean;
        readonly root: TypedValue;

        getValue: () => any;
        setValue: (any) => GridChenNS.Patch;
        _setValue: (any) => void;
        refreshUI: (disabled: boolean) => void;
    }

    export interface LeafNode extends TypedValue {
    }
    
    export interface ProxyNode extends TypedValue {
        obj: object | Array;
        children: TypedValue[];
        onObjectReferenceChanged: (obj: object | Array) => void;
    }
    
    export interface DetailNode extends ProxyNode {
        grid: GridChenNS.GridChen;
        masterNode: ProxyNode;
        rowIndex: number;
        setRowIndex: (rowIndex: number) => void;
    }
}

