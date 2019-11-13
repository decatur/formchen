/////////////////////////////
/// form-chen JavaScript APIs
/////////////////////////////

declare module FormChenNS {

    export interface Graph {
        rootSchema: GridChenNS.JSONSchema;
        add: (node: TypedValue) => void;
        getNodeById: (id: number) => TypedValue;
        // This is a slow method and should only be used for unit testing
        _getNodeByPath: (path: string) => TypedValue;
        resolveSchema: (schema: GridChenNS.ColumnSchema, path: string) => GridChenNS.ColumnSchema;
    }
    
    export interface TypedValue {
        id: number;
        obj: any;
        graph: Graph;
        parent: ProxyNode;
        schema: GridChenNS.ColumnSchema;
        key: string | number;
        readonly path: string;
        title: string;
        readOnly: boolean;
        readonly root: TypedValue;

        getValue: () => any;
        setValue: (any) => GridChenNS.Patch;
        _setValue: (any) => void;
        refreshUI: () => void;
    }

    export interface ProxyNode extends TypedValue {
        children: TypedValue[];
        onNewObjectReference: (obj: object | Array) => void;
    }
    
    export interface DetailNode extends ProxyNode {
        grid: GridChenNS.GridChen;
        masterNodeId: number;
        rowIndex: number;
        setIndex: (rowIndex: number) => void;
    }
}

