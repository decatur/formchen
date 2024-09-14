/////////////////////////////
/// formchen JavaScript APIs
/////////////////////////////

declare module FormChenNS {

    export interface Graph {
        pathPrefix: string;
        add: (node: BaseNode) => void;
        getNodeById: (id: string) => BaseNode;
    }

    export interface BaseNode {
        tooltip: string;
        id: string;
        graph: Graph;
        parent: HolderNode;
        schema: GridChenNS.JSONSchema;
        key: string | number;
        path: string;
        title: string;
        readOnly: boolean;
        // readonly root: BaseNode;
        tm: GridChenNS.TransactionManager;

        getValue: () => any;
        setValue: (any) => GridChenNS.Patch;
        _setValue: (any, disabled: boolean) => void;
        refreshUI: (disabled: boolean) => void;
    }

    export interface HolderNode extends BaseNode {
        obj: object | Array;
        children: BaseNode[];
    }

}

