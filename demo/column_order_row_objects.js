import { create_grid } from "./grid_helper.js"

const schema = {
    title: 'Column Order',
    type: 'array',
    items: {
        type: 'object',
        properties: {
            a: { title: 'a', type: 'number', columnIndex: 0, width: 100 },
            1: { title: '1', type: 'number', columnIndex: 1, width: 100 }
        }
    }
};

const data = [{ a: 1, 1: 3 }, { a: 2, 1: 4 }];

create_grid(schema, data);