import {test, assert} from './grid-chen/utils.js'
import {ProxyNode} from "../form-chen/webcomponent.js";

test('parents', () => {
    const schema = {
        type: 'object',
        properties: {
            foo: {
                type: 'object',
                properties: {
                    bar: {type: 'string'}
                }
            }
        }
    };

    const node1 = new ProxyNode('', schema, null);
    const node2 = new ProxyNode('foo', schema.properties.foo, node1);
    const node3 = new ProxyNode('bar', schema.properties.foo.properties.bar, node2);

    let patch = node3.setValue('foobar');

    assert.equal({foo: {bar: 'foobar'}}, node1.obj);
    assert.equal({bar: 'foobar'}, node2.obj);

    assert.equal(
        [{"op": "add", "path": "", "value": {}},
            {"op": "add", "path": "/foo", "value": {}},
            {"op": "add", "path": "/foo/bar", "value": "foobar"}], patch.operations);

    patch = node3.setValue(undefined);
    assert.equal(undefined, node1.obj);
    assert.equal(undefined, node2.obj);
    assert.equal(undefined, node3.getValue());

    console.log(JSON.stringify(patch));

    assert.equal(
        [{"op":"remove","path":"/foo/bar","oldValue":"foobar"},
            {"op": "remove", "path": "/foo", oldValue: {}},
            {"op": "remove", "path": "", oldValue: {}}], patch.operations);

});



