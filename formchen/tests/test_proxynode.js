import { test, assert } from 'gridchen/testing/utils.js'
import { HolderNode, BaseNode, Graph } from "./formchen/webcomponent.js";

test('graph', () => {
    const schema = {
        type: 'object',
        properties: {
            foo: {
                type: 'object',
                properties: {
                    bar: { type: 'string' }
                }
            }
        }
    };

    schema.pathPrefix = '/prefix';
    const graph = new Graph('');
    const node1 = new HolderNode(graph, '', '', schema, null);
    const node2 = new HolderNode(graph, 'foo', 'foo', schema.properties.foo, node1);
    const node3 = new BaseNode(graph, 'bar', 'bar', schema.properties.foo.properties.bar, node2);
    let patch = node3.setValue('foobar');
    patch.operations.forEach(op => { delete op.nodeId });
    assert.equal({ foo: { bar: 'foobar' } }, node1.obj);
    assert.equal({ bar: 'foobar' }, node2.obj);
    assert.equal([
        { op: "add", path: "", value: {} },
        { op: "add", path: "/foo", value: {} },
        { op: "add", path: "/foo/bar", value: "foobar" }
    ], patch.operations);

    patch = node3.setValue(undefined);
    patch.operations.forEach(op => { delete op.nodeId });
    assert.equal(undefined, node1.getValue());
    assert.equal(undefined, node2.getValue());
    assert.equal(undefined, node3.getValue());
    assert.equal([
        { op: "remove", path: "/foo/bar", oldValue: "foobar" },
        { op: "remove", path: "/foo", oldValue: {} },
        { op: "remove", path: "", oldValue: {} }
    ], patch.operations);

});



