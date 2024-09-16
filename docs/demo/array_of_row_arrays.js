
import { create_grid } from "./grid_helper.js"

const schema = {
    title: 'Array of Row Tuples',
    type: 'array',
    items: {
        type: 'array',
        items: [  // tuple schema
            { title: 'TimeStamp', width: 200, type: 'string', format: 'full-date' },
            { title: 'Age', width: 100, type: 'number' },
            { title: 'Weight', width: 100, type: 'number' }
        ]
    }
};

const data = [
    ["2019-01-01", 0, 0],
    ["2019-01-02", 1, 2],
    ["2019-01-03", 2, 4]
];

create_grid(schema, data);

