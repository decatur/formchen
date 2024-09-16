/////////////////////////////
/// formchen JavaScript APIs
/////////////////////////////



export interface IFormChen {
    /**
     * The current value of the bound object.
     */
    readonly value: object;
    getNodeById: (id: string) => BaseNode;
}

