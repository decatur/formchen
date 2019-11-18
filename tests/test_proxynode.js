import { test, assert } from './grid-chen/utils.js'
import { ProxyNode, TypedValue, Graph } from "../form-chen/webcomponent.js";

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

    const graph = new Graph(schema);
    const node1 = new ProxyNode(graph, '', '', schema, null);
    const node2 = new ProxyNode(graph, 'foo', 'foo', schema.properties.foo, node1);
    const node3 = new TypedValue(graph, 'bar', 'bar', schema.properties.foo.properties.bar, node2);

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



