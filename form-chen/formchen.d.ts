/////////////////////////////
/// form-chen JavaScript APIs
/////////////////////////////

declare module FormChenNS {

    export interface FormChen {
        /**
         * The current value of the bound object.
         */
        readonly value: object;
        getNodeById: (id: string) => BaseNode;
    }
}
