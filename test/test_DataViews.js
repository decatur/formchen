/** @import { JSONSchema } from "../formchen/types" */

import { test, assert } from './utils.js'
import { createView } from '../formchen/gridchen/matrixview.js'
import { applyJSONPatch, reversePatch } from '../formchen/utils.js'

/**
 * Runs tests on the specified view.
 * @param {JSONSchema} schema
 * @param {function():object} createModel
 * @param {object} emptyModel
 */
function testView(schema, createModel, emptyModel) {
    const path = [schema.title];

    test(path.concat('getCellFromEmptyModel'), () => {
        const view = createView(schema, null);
        assert.equal(view.getCell(0, 0), null);
    });

    test(path.concat('getModel'), () => {
        const model = createModel();
        const view = createView(schema, model);
        assert.equal(view.getModel(), model);
    });

    test(path.concat('setAfterLast'), () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.setCell(3, 0, 'x', '');
        const patched = applyJSONPatch(createModel(), patch);
        assert.equal(patched, model);

        view.applyJSONPatch(reversePatch(patch));
        view.applyJSONPatch(patch);
        assert.equal(patched, model);
    });

    test(path.concat('setSecondAfterLast'), () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.setCell(4, 0, 'x', '');
        const patched = applyJSONPatch(createModel(), patch);
        assert.equal(patched, model);

        view.applyJSONPatch(reversePatch(patch));
        view.applyJSONPatch(patch);
        assert.equal(patched, model);
    });

    test(path.concat('deleteAllCells'), () => {
        /**
         * @param {number} rowIndex 
         * @param {number} columnIndex 
         */
        function deleteCell(rowIndex, columnIndex) {
            const model = createModel();
            const view = createView(schema, model);
            const patch = view.setCell(rowIndex, columnIndex, null, '');
            const patched = applyJSONPatch(createModel(), patch);
            assert.equal(patched, model);

            view.applyJSONPatch(reversePatch(patch));
            view.applyJSONPatch(patch);
            assert.equal(patched, model);
        }

        const model = createModel();
        const view = createView(schema, model);
        for (let rowIndex = 0; rowIndex < view.rowCount(); rowIndex++) {
            for (let columnIndex = 0; columnIndex < view.columnCount(); columnIndex++) {
                deleteCell(rowIndex, columnIndex);
            }
        }
    });

    test(path.concat('setAllCells'), () => {
        /**
         * @param {number} rowIndex 
         * @param {number} columnIndex 
         */
        function setCell(rowIndex, columnIndex) {
            const model = createModel();
            const view = createView(schema, model);
            const patch = view.setCell(rowIndex, columnIndex, 'x', '');
            const patched = applyJSONPatch(createModel(), patch);
            assert.equal(patched, model);

            view.applyJSONPatch(reversePatch(patch));
            view.applyJSONPatch(patch);
            assert.equal(patched, model);
        }

        const model = createModel();
        const view = createView(schema, model);
        for (let rowIndex = 0; rowIndex < view.rowCount(); rowIndex++) {
            for (let columnIndex = 0; columnIndex < view.columnCount(); columnIndex++) {
                setCell(rowIndex, columnIndex);
            }
        }
    });

    test(path.concat('set-from-scratch'), () => {
        const view = createView(schema, null);
        const patch = view.setCell(1, 0, 42, '');
        const patched = applyJSONPatch(null, patch);
        assert.equal(patched, view.getModel());

        view.applyJSONPatch(reversePatch(patch));
        view.applyJSONPatch(patch);
        assert.equal(patched, view.getModel());
    });

    test(path.concat('splice'), () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.splice(1);
        const patched = applyJSONPatch(createModel(), patch);
        assert.equal(patched, model);

        view.applyJSONPatch(reversePatch(patch));
        view.applyJSONPatch(patch);
        assert.equal(patched, model);
    });

    test(path.concat('deleteRow'), () => {
        const model = createModel();
        const view = createView(schema, model);
        const patch = view.deleteRow(1);
        const patched = applyJSONPatch(createModel(), patch);
        assert.equal(patched, model);

        view.applyJSONPatch(reversePatch(patch));
        view.applyJSONPatch(patch);
        assert.equal(patched, model);
    });

    test(path.concat('deleteAllRowsAndOne'), () => {
        const model = createModel();
        const view = createView(schema, model);
        const rowCount = view.rowCount();
        const patches = [];
        patches.push(view.deleteRow(rowCount));  // NoOp
        for (let i = 0; i < rowCount; i++) {
            patches.push(view.deleteRow(0));
        }
        assert.equal(emptyModel, view.getModel());
        patches.push(view.deleteRow(0)); // NoOp
        assert.equal(emptyModel, view.getModel());

        for (let i = patches.length - 1; i >= 0; i--) {
            view.applyJSONPatch(reversePatch(patches[i]));
        }
        for (let i = 0; i < patches.length; i++) {
            view.applyJSONPatch(patches[i]);
        }
        assert.equal(emptyModel, model);
    });

    test(path.concat('remove'), () => {
        const view = createView(schema, createModel());
        const patch = view.removeModel();
        const patched = applyJSONPatch(createModel(), patch);
        // jsonPatch does NOT return null, which would be more appropriate.
        assert.equal(patched, undefined);

        view.applyJSONPatch(reversePatch(patch));
        assert.equal(createModel(), view.getModel());
    });
}

/*
 * Our test matrix is 3x3 with one unset row and column each and is of the form
 * a ~ b
 * ~ ~ ~
 * c ~ d
 */
test('RowMatrixView', (path) => {
    const createModel = () => [['a', null, 'b'], null, ['c', null, 'd']];
    const emptyModel = [];
    const schema = {
        "title": "RowMatrixView",
        "type": "array",
        "items": {
            "type": "array",
            "items": [
                { title: 'c1', type: 'number' },
                { title: 'c2', type: 'string' },
                { title: 'c3', type: 'string' }
            ]
        }
    };

    testView(schema, createModel, emptyModel);

    test(path.concat('sort'), () => {
        const rowMatrix = [[1, 'b'], [NaN], [3, 'c'], [2, 'a']];
        const rowView = createView(schema, rowMatrix);
        assert.equal(1, rowView.getCell(0, 0));
        assert.equal('b', rowView.getCell(0, 1));

        rowView.sort(0);
        assert.equal([[1, 'b'], [2, 'a'], [3, 'c'], [NaN]], rowMatrix);
        rowView.sort(1);
        assert.equal([[2, 'a'], [1, 'b'], [3, 'c'], [NaN]], rowMatrix);
    });

});

test('RowObjectsView', (path) => {
    const createModel = () => [{ c1: 'a', c3: 'b' }, null, { c1: 'c', c3: 'd' }];
    const emptyModel = [];
    const schema = {
        "title": "RowObjectsView",
        "type": "array",
        "items": {
            "type": "object",
            "properties": {
                "c1": { title: 'string', type: 'number' },
                "c2": { title: 'string', type: 'string' },
                "c3": { title: 'string', type: 'string' }
            }
        }
    };

    testView(schema, createModel, emptyModel);

    test(path.concat('sort'), (path) => {
        const rowMatrix = [{ c1: 1, c2: 'b' }, { c1: NaN }, { c1: 3, c2: 'c' }, { c1: 2, c2: 'a' }];
        const rowView = createView(schema, rowMatrix);
        assert.equal(1, rowView.getCell(0, 0));
        assert.equal('b', rowView.getCell(0, 1));

        rowView.sort(0);
        assert.equal([{ "c1": 1, "c2": "b" }, { "c1": 2, "c2": "a" }, { "c1": 3, "c2": "c" }, { "c1": NaN }], rowMatrix);
        rowView.sort(1);
        assert.equal([{ "c1": 2, "c2": "a" }, { "c1": 1, "c2": "b" }, { "c1": 3, "c2": "c" }, { "c1": NaN }], rowMatrix);
    });

});

test('ColumnMatrixView', (path) => {
    const createModel = () => [['a', null, 'c'], null, ['b', null, 'd']];
    const emptyModel = [[], null, []];
    const schema = {
        "title": "ColumnMatrixView",
        "type": "array",
        "items": [
            { "type": "array", "items": { title: 'c1', type: 'number' } },
            { "type": "array", "items": { title: 'c2', type: 'string' } },
            { "type": "array", "items": { title: 'c3', type: 'string' } },
        ]
    };

    testView(schema, createModel, emptyModel);

    test(path.concat('sort'), () => {
        const model = [[1, NaN, 3, 2], ['b', null, 'c', 'a']];
        const colView = createView(schema, model);
        colView.sort(0);
        assert.equal([[1, 2, 3, NaN], ['b', 'a', 'c', null]], model);
        colView.sort(1);
        assert.equal([[2, 1, 3, NaN], ['a', 'b', 'c', null]], model);
    });

});

test('ColumnObjectView', (path) => {
    const createModel = function () {
        return {
            col1: ['a', null, 'c'],
            col3: ['b', null, 'd']
        };
    };
    const emptyModel = { col1: [], col3: [] };
    const schema = {
        title: 'ColumnObjectView',
        type: 'object',
        properties: {
            col1: { "type": "array", items: { title: 'number', type: 'number' } },
            col2: { "type": "array", items: { title: 'string', type: 'string' } },
            col3: { "type": "array", items: { title: 'string', type: 'string' } }
        }
    };

    testView(schema, createModel, emptyModel);

    test(path.concat('sort'), () => {
        const model = {
            col1: [1, NaN, 3, 2],
            col2: ['b', null, 'c', 'a']
        };
        const colView = createView(schema, model);
        colView.sort(0);
        assert.equal({ col1: [1, 2, 3, NaN], col2: ['b', 'a', 'c', null] }, model);
        colView.sort(1);
        assert.equal({ col1: [2, 1, 3, NaN], col2: ['a', 'b', 'c', null] }, model);
    });

});

test('ColumnVectorView', (path) => {
    const createModel = () => [1, null, 3, 2];
    const emptyModel = [];
    const schema = {
        "title": "ColumnVectorView",
        "type": "array",
        "items": {
            "title": "foo",
            "type": "number"
        }
    };

    testView(schema, createModel, emptyModel);

    test(path.concat('sort'), () => {
        const column = [1, NaN, 3, 2];
        const view = createView(schema, column);
        view.sort(0);
        assert.equal([1, 2, 3, NaN], column);
    });

});

test('Test Invalid Schema', () => {
    try {
        createView({ title: 'FooBar', 'type': 'foo' }, []);
    } catch (e) {
        assert.equal("Invalid schema: FooBar", e.message);
    }
});

