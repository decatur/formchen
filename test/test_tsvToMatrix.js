import { test, assert, log } from './utils.js'
import {tsvToMatrix} from '../docs/gridchen/webcomponent.js'

log('\x1B[41;93;4m####### Loading test/test_tsvToMatrix.js')

test('tsvToMatrix', () => {
    let rows = tsvToMatrix("1\t2\r\n3\t4\r\n");
    assert.equal([['1', '2'], ['3', '4']], rows);

    rows = tsvToMatrix("1\t2\r\n3\t\r\n");
    assert.equal([['1', '2'], ['3', '']], rows);

    rows = tsvToMatrix("1\t2\r\n3\t");
    assert.equal([['1', '2'], ['3', '']], rows);

    rows = tsvToMatrix("\r\n");
    assert.equal([['']], rows);

    rows = tsvToMatrix('1	"foo\r\nbar"\r\n2	3');
    assert.equal([['1', 'foo\r\nbar'], ['2', '3']], rows);

    rows = tsvToMatrix('1	"foo\r\nbar"\r\n2	3\n');
    assert.equal([['1', 'foo\r\nbar'], ['2', '3']], rows);

    rows = tsvToMatrix('1	"foo\r\nbar"\r\n2	"3"""\n');
    assert.equal([['1', 'foo\r\nbar'], ['2', '3"']], rows);

    rows = tsvToMatrix('1	"foo\r\nbar"\r\n2	"3"""');
    assert.equal([['1', 'foo\r\nbar'], ['2', '3"']], rows);

    rows = tsvToMatrix('1	"foo\r\nbar"\r\n"2"	"3"""');
    assert.equal([['1', 'foo\r\nbar'], ['2', '3"']], rows);
});

