/** @import { JSONSchema } from "../formchen/types" */

import { createFormChen } from "../formchen/formchen.js";
import { bindDemoTabs } from "./utils.js";

/** @type{JSONSchema} */
const schema = {
    type: 'object',
    title: 'Single Column Array',
    properties: {
        column: {
            title: 'Single Column',
            type: 'array',
            format: 'grid',
            items: { width: 200, type: 'string', format: 'date' }
        }
    }
};
const data = { column: ["2019-01-01", "2019-01-02", "2019-01-03"] };

bindDemoTabs(document.getElementById(schema.title), schema, () => formchen.value, () => formchen.patch);
const formchen = createFormChen(document.getElementById(schema.title), schema, data);
