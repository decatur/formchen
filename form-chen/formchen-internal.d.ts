/////////////////////////////
/// form-chen JavaScript APIs
/////////////////////////////

declare module FormChenNS {

    export interface Graph {
        pathPrefix: string;
        add: (node: BaseNode) => void;
        getNodeById: (id: string) => BaseNode;
    }
    
    export interface BaseNode {
        id: string;
        graph: Graph;
        parent: HolderNode;
        schema: GridChenNS.ColumnSchema;
        key: string | number;
        path: string;
        title: string;
        readOnly: boolean;
        // readonly root: BaseNode;
        tm: GridChenNS.TransactionManager;

        getValue: () => any;
        setValue: (any) => GridChenNS.Patch;
        _setValue: (any) => void;
        refreshUI: (disabled: boolean) => void;
    }

    export interface LeafNode extends TypeBaseNodedValue {
    }
    
    export interface HolderNode extends BaseNode {
        obj: object | Array;
        children: BaseNode[];
        onObjectReferenceChanged: (obj: object | Array) => void;
    }
    
    export interface MasterNode extends HolderNode {
        selectedRowIndex: number;
        children: DetailNode[];
    }
    
    export interface DetailNode extends HolderNode {
        grid: GridChenNS.GridChen;
        masterNode: HolderNode;
        rowIndex: number;
        setRowIndex: (rowIndex: number) => void;
    }
}

