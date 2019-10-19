/////////////////////////////
/// form-chen JavaScript APIs
/////////////////////////////

declare module FormChen {

    export interface FormChen {
        /**
         * The current value of the bound object.
         */
        readonly value: object;
        readonly transactionManager: GridChen.TransactionManager
    }
}