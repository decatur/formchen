import { create_grid } from "./grid_helper.js"

const schema = {
    title: 'demo',
    type: 'object',
    properties: {
        a: { type: 'array', title: 'a', columnIndex: 0, width: 100, items: { type: 'number' } },
        1: { type: 'array', title: '1', columnIndex: 1, width: 100, items: { type: 'number' } }
    }
};


const data = { a: [1, 2], 1: [3, 4] };

create_grid(schema, data);