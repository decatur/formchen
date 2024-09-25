import { create_grid } from "./grid_helper.js"

const schema = {
    title: 'Single Column Array',
    type: 'array',
    items: { width: 200, type: 'string', format: 'full-date' }
};

const data = ["2019-01-01", "2019-01-02", "2019-01-03"];

create_grid(schema, data);