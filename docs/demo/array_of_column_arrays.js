import { create_grid } from "./grid_helper.js"

const schema = {
    title: 'Array of Column Arrays',
    type: 'array',
    items: [ // tuple schema
        { type: 'array', items: { title: 'TimeStamp', width: 200, type: 'string', format: 'full-date' } },
        { type: 'array', items: { title: 'Age', width: 100, type: 'number' } },
        { type: 'array', items: { title: 'Weight', width: 100, type: 'number' } }
    ]
};
const data = [
    ["2019-01-01", "2019-01-02", "2019-01-03"],
    [0, 1, 2],
    [0, 2, 4]
];

create_grid(schema, data);


