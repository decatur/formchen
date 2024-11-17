import { test, assert } from './utils.js'
import {localeDateParser, FullDate, resolvePeriod, } from "../formchen/utils.js";

test('FullDate', () => {
    let parser = localeDateParser();
    assert.equal(parser.fullDate('2019-10-27'), new FullDate(2019, 9, 27));
    assert.equal(parser.fullDate('27.10.2019'), new SyntaxError('27.10.2019'));
});

test('DateTime', () => {
    let parser = localeDateParser();
    assert.equal([2019, 9, 27, 1, 2, 0, 0, 0, 0], parser.dateTime('2019-10-27 01:02Z', resolvePeriod('minutes')));
    assert.true(parser.dateTime('27.10.2019 01+01:00',  resolvePeriod('minutes')) instanceof SyntaxError);
    assert.true(parser.dateTime('27.10.2019', resolvePeriod('minutes')) instanceof SyntaxError);
});

// test('toUTCDateTimeString', () => {
//     assert.equal('2020-01-04 01:02:03.012Z', toUTCDateTimeString(
//         new Date(Date.UTC(2020, 0, 4, 1, 2, 3, 12)),
//         resolvePeriod('MILLISECONDS')));
// });




