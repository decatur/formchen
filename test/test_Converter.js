import { test, assert } from './utils.js'
import * as c from "../formchen/converter.js";

test('URIConverter', (test_name) => {
    const converter = new c.URIConverter();
    const markdown = '[foobar](http://foobar.org)';
    assert.equal(markdown, converter.toTSV(markdown));
    assert.equal(markdown, converter.toEditable(markdown));
    assert.equal(markdown, converter.fromEditable(markdown));

    const elem = document.createElement('a');
    converter.render(elem, markdown);
    assert.equal('foobar', elem.textContent);
    assert.equal('http://foobar.org/', elem.href);
    assert.equal('non-string', elem.className);

    converter.render(elem, 123);
    assert.equal('123', elem.textContent);
    assert.equal('error', elem.className);
});

test('BooleanStringConverter', () => {
    let converter = new c.BooleanStringConverter();
    assert.equal('true', converter.toTSV(true));
    assert.equal('true', converter.toEditable(true));

    for (const truely of ['true', 'wahr', '1', 'y']) {
        assert.equal(true, converter.fromEditable(truely));
    }

    for (const falsey of ['false', 'falsch', '0', 'n']) {
        assert.equal(false, converter.fromEditable(falsey));
    }

    const elem = document.createElement('span');
    converter.render(elem, true);
    assert.equal('true', elem.textContent);
    assert.equal('non-string', elem.className);

    converter.render(elem, 13);
    assert.equal('13', elem.textContent);
    assert.equal('error', elem.className);
});

test('NumberConverter', () => {
    const elem = document.createElement('span');

    let converter = new c.NumberConverter(0);
    assert.equal(NaN, converter.fromEditable('nan'));

    assert.equal(converter.toTSV(Math.PI).length, 12);
    assert.equal(converter.toEditable(Math.PI), String(Math.PI));
    assert.equal(converter.fromEditable('3'), 3);

    converter = new c.NumberConverter(2);
    assert.equal(converter.toTSV(Math.PI).length, 12);
    assert.equal(converter.fromEditable('3.1415926536'), 3.1415926536);

    converter.render(elem, Math.PI);
    assert.equal(elem.textContent.length, 4);
    assert.equal('non-string', elem.className);

    converter.render(elem, {});
    assert.equal('[object Object]', elem.textContent);
    assert.equal('error', elem.className);

    converter = new c.NumberConverter(0);
    assert.equal(NaN, converter.fromEditable('NaN'));
});

function assertNotADate(converter, elem) {
    converter.render(elem, 'not_a_date');
    assert.equal('not_a_date', elem.textContent);
    assert.equal('error', elem.className);
}

test('FullDateConverter', () => {
    let converter = new c.FullDateConverter();
    assert.equal('01/01/1970', converter.toTSV('01/01/1970'));
    assert.equal('2019-10-27', converter.toEditable('2019-10-27'));

    const elem = document.createElement('span');
    converter.render(elem, '2019-10-27');
    assert.equal('2019-10-27', elem.textContent);
    assert.equal('non-string', elem.className);

    assertNotADate(converter, elem);

});

// test('DatePartialTimeStringConverter SECONDS', () => {
//     function run(locale, localizedDates) {
//         let converter = new c.DatePartialTimeStringConverter('SECONDS', locale);
//         assert.equal('not_a_date', converter.toTSV('not_a_date'));
//         assert.equal('2019-10-27 02:13:14', converter.toEditable('2019-10-27T02:13:14'));
//         for (const date of localizedDates) {
//             assert.equal('2019-10-27T02:13:14', converter.fromEditable(date));
//         }

//         const elem = document.createElement('span');
//         converter.render(elem, '2019-10-27T02:13:14');
//         assert.equal('2019-10-27 02:13:14', elem.textContent);
//         assert.equal('non-string', elem.className);

//         assertNotADate(converter, elem);
//     }

//     runPartialEdits(run);

// });

// test('DatePartialTimeStringConverter MINUTES', () => {
//     function run(locale, localizedDates) {
//         let converter = new c.DatePartialTimeStringConverter('MINUTES', locale);
//         assert.equal('not_a_date', converter.toTSV('not_a_date'));
//         assert.equal('2019-10-27 02:13', converter.toEditable('2019-10-27T02:13'));
//         for (const date of localizedDates) {
//             assert.equal('2019-10-27T02:13', converter.fromEditable(date));
//         }

//         const elem = document.createElement('span');
//         converter.render(elem, '2019-10-27T02:13');
//         assert.equal('2019-10-27 02:13', elem.textContent);
//         assert.equal('non-string', elem.className);

//         assertNotADate(converter, elem);
//     }

//     runPartialEdits(run);

// });

// test('DatePartialTimeStringConverter HOURS', () => {
//     function run(locale, localizedDates) {
//         let converter = new c.DatePartialTimeStringConverter('HOURS', locale);
//         assert.equal('not_a_date', converter.toTSV('not_a_date'));
//         assert.equal('2019-10-27 02', converter.toEditable('2019-10-27T02:13'));
//         for (const date of localizedDates) {
//             assert.equal('2019-10-27T02', converter.fromEditable(date));
//         }

//         const elem = document.createElement('span');
//         converter.render(elem, '2019-10-27T02:13');
//         assert.equal('2019-10-27 02', elem.textContent);
//         assert.equal('non-string', elem.className);

//         assertNotADate(converter, elem);
//     }

//     runPartialEdits(run);
// });

// test('DatePartialTimeStringConverter DAYS', () => {
//     function run(locale, localizedDates) {
//         let converter = new c.DatePartialTimeStringConverter('DAYS', locale);
//         assert.equal('not_a_date', converter.toTSV('not_a_date'));
//         assert.equal('2019-10-27', converter.toEditable('2019-10-27'));
//         for (const date of localizedDates) {
//             assert.equal('2019-10-27', converter.fromEditable(date));
//         }

//         const elem = document.createElement('span');
//         converter.render(elem, '2019-10-27');
//         assert.equal('2019-10-27', elem.textContent);
//         assert.equal('non-string', elem.className);

//         assertNotADate(converter, elem);
//     }

//     runPartialEdits(run);
// });

test('DateTimeStringConverter HOURS', () => {
    const localizedDates = ['2019-10-27T02:13:14.123+02:00', '2019-10-27 02:13:14.123+02:00', '2019-10-27T00:13:14.123Z'];

    let converter = new c.DateTimeStringConverter('HOURS');
    assert.equal('not_a_date', converter.toTSV('not_a_date'));
    assert.equal('2019-10-27 01+02:00', converter.toTSV('2019-10-27T01+02:00'));
    assert.equal('2019-10-27 00+02:00', converter.toEditable('2019-10-27T00+02:00'));
    for (const date of localizedDates) {
        assert.equal('2019-10-27T02+02:00', converter.fromEditable(date));
    }

    const elem = document.createElement('span');
    converter.render(elem, '2019-10-27T01+02:00');
    assert.equal('2019-10-27 01+02:00', elem.textContent);
    assert.equal('non-string', elem.className);

    assertNotADate(converter, elem);

});

test('DateTimeStringConverter MINUTES', () => {
    const localizedDates = ['2019-10-27T02:13:14.123+02:00', '2019-10-27 02:13:14.123+02:00', '2019-10-27T00:13:14.123Z'];
    let converter = new c.DateTimeStringConverter('MINUTES');
    assert.equal('not_a_date', converter.toTSV('not_a_date'));
    assert.equal('2019-10-27 01:13+02:00', converter.toTSV('2019-10-27T01:13+02:00'));
    assert.equal('2019-10-27 00:13+02:00', converter.toEditable('2019-10-27T00:13+02:00'));
    for (const date of localizedDates) {
        assert.equal('2019-10-27T02:13+02:00', converter.fromEditable(date));
    }

    const elem = document.createElement('span');
    converter.render(elem, '2019-10-27T01:13+02:00');
    assert.equal('2019-10-27 01:13+02:00', elem.textContent);
    assert.equal('non-string', elem.className);

    assertNotADate(converter, elem);

});

test('DateTimeStringConverter SECONDS', () => {
    const localizedDates = ['2019-10-27T02:13:14.123+02:00', '2019-10-27 02:13:14.123+02:00', '2019-10-27T00:13:14.123Z'];
    let converter = new c.DateTimeStringConverter('SECONDS');
    assert.equal('not_a_date', converter.toTSV('not_a_date'));
    assert.equal('2019-10-27 01:13:14+02:00', converter.toTSV('2019-10-27T01:13:14+02:00'));
    assert.equal('2019-10-27 00:13:14+02:00', converter.toEditable('2019-10-27T00:13:14+02:00'));
    for (const date of localizedDates) {
        assert.equal('2019-10-27T02:13:14+02:00', converter.fromEditable(date));
    }

    const elem = document.createElement('span');
    converter.render(elem, '2019-10-27T01:13:14+02:00');
    assert.equal('2019-10-27 01:13:14+02:00', elem.textContent);
    assert.equal('non-string', elem.className);

    assertNotADate(converter, elem);

});

test('DateTimeStringConverter MILLISECONDS', () => {
    const localizedDates = ['2019-10-27T02:13:14.123+02:00', '2019-10-27 02:13:14.123+02:00', '2019-10-27T00:13:14.123Z'];
    let converter = new c.DateTimeStringConverter('MILLISECONDS');
    assert.equal('not_a_date', converter.toTSV('not_a_date'));
    assert.equal('2019-10-27 01:13:14.123+02:00', converter.toTSV('2019-10-27T01:13:14.123+02:00'));
    assert.equal('2019-10-27 00:13:14.123+02:00', converter.toEditable('2019-10-27T00:13:14.123+02:00'));
    for (const date of localizedDates) {
        assert.equal('2019-10-27T02:13:14.123+02:00', converter.fromEditable(date));
    }

    const elem = document.createElement('span');
    converter.render(elem, '2019-10-27T01:13:14.123+02:00');
    assert.equal('2019-10-27 01:13:14.123+02:00', elem.textContent);
    assert.equal('non-string', elem.className);

    assertNotADate(converter, elem);

});

// test('DatePartialTimeConverter SECONDS', () => {
//     function run(locale, localizedDates) {
//         let converter = new c.DatePartialTimeConverter('SECONDS', locale);
//         let d = new Date(Date.UTC(2019, 9, 27, 2, 13, 14));

//         assert.equal('2019-10-27 02:13:14', converter.toTSV(d));
//         assert.equal('2019-10-27 02:13:14', converter.toEditable(d));
//         assert.equal('not_a_date', converter.toTSV('not_a_date'));
//         for (const date of localizedDates) {
//             assert.equal(d, converter.fromEditable(date));
//         }

//         const elem = document.createElement('span');
//         converter.render(elem, d);
//         assert.equal('2019-10-27 02:13:14', elem.textContent);
//         assert.equal('non-string', elem.className);

//         assertNotADate(converter, elem);
//     }

//     runPartialEdits(run);
// });

// test('DatePartialTimeConverter MINUTES', () => {
//     function run(locale, localizedDates) {
//         let converter = new c.DatePartialTimeConverter('MINUTES', locale);
//         let d = new Date(Date.UTC(2019, 9, 27, 2, 13));

//         assert.equal('2019-10-27 02:13', converter.toTSV(d));
//         assert.equal('not_a_date', converter.toTSV('not_a_date'));
//         assert.equal('2019-10-27 02:13', converter.toEditable(d));
//         for (const date of localizedDates) {
//             assert.equal(d, converter.fromEditable(date));
//         }

//         const elem = document.createElement('span');
//         converter.render(elem, d);
//         assert.equal('2019-10-27 02:13', elem.textContent);
//         assert.equal('non-string', elem.className);

//         assertNotADate(converter, elem);
//     }

//     runPartialEdits(run);
// });

// test('DatePartialTimeConverter HOURS', () => {
//     function run(locale, localizedDates) {
//         let converter = new c.DatePartialTimeConverter('HOURS', locale);
//         let d = new Date(Date.UTC(2019, 9, 27, 2));

//         assert.equal('2019-10-27 02', converter.toTSV(d));
//         assert.equal('not_a_date', converter.toTSV('not_a_date'));
//         assert.equal('2019-10-27 02', converter.toEditable(d));
//         for (const date of localizedDates) {
//             assert.equal(d, converter.fromEditable(date));
//         }

//         const elem = document.createElement('span');
//         converter.render(elem, d);
//         assert.equal('2019-10-27 02', elem.textContent);
//         assert.equal('non-string', elem.className);

//         assertNotADate(converter, elem);
//     }

//     runPartialEdits(run);
// });

// test('DatePartialTimeConverter DAYS', () => {
//     function run(locale, localizedDates) {
//         let converter = new c.DatePartialTimeConverter('DAYS', locale);
//         let d = new Date(Date.UTC(2019, 9, 27));

//         assert.equal('2019-10-27', converter.toTSV(d));
//         assert.equal('not_a_date', converter.toTSV('not_a_date'));
//         assert.equal('2019-10-27', converter.toEditable(d));
//         for (const date of localizedDates) {
//             assert.equal(d, converter.fromEditable(date));
//         }

//         const elem = document.createElement('span');
//         converter.render(elem, d);
//         assert.equal('2019-10-27', elem.textContent);
//         assert.equal('non-string', elem.className);

//         assertNotADate(converter, elem);
//     }

//     runPartialEdits(run);
// });

// test('DateTimeConverter MILLISECONDS', () => {
//     const localizedDates = ['2019-10-27T02:13:14.123+02:00', '2019-10-27 02:13:14.123+02:00', '2019-10-27T00:13:14.123Z'];
//     let converter = new c.DateTimeConverter('MILLISECONDS');
//     let d = new Date('2019-10-27T02:13:14.123+02:00');
//     assert.equal('2019-10-27 02:13:14.123+02:00', converter.toTSV(d));
//     assert.equal('2019-10-27 02:13:14.123+02:00', converter.toEditable(d));
//     for (const date of localizedDates) {
//         assert.equal(d, converter.fromEditable(date));
//     }

//     const elem = document.createElement('span');
//     converter.render(elem, d);
//     assert.equal('2019-10-27 02:13:14.123+02:00', elem.textContent);
//     assert.equal('non-string', elem.className);

//     assertNotADate(converter, elem);

// });

// test('DateTimeConverter SECONDS', () => {
//     const localizedDates = ['2019-10-27T02:13:14.123+02:00', '2019-10-27 02:13:14.123+02:00', '2019-10-27T00:13:14.123Z'];
//     let converter = new c.DateTimeConverter('SECONDS');
//     let d = new Date('2019-10-27T02:13:14+02:00');
//     assert.equal('2019-10-27 02:13:14+02:00', converter.toTSV(d));
//     assert.equal('2019-10-27 02:13:14+02:00', converter.toEditable(d));
//     for (const date of localizedDates) {
//         assert.equal(d, converter.fromEditable(date));
//     }

//     const elem = document.createElement('span');
//     converter.render(elem, d);
//     assert.equal('2019-10-27 02:13:14+02:00', elem.textContent);
//     assert.equal('non-string', elem.className);

//     assertNotADate(converter, elem);

// });

// test('DateTimeConverter MINUTES', () => {
//     const localizedDates = ['2019-10-27T02:13:14.123+02:00', '2019-10-27 02:13:14.123+02:00', '2019-10-27T00:13:14.123Z'];
//     let converter = new c.DateTimeConverter('MINUTES');
//     let d = new Date('2019-10-27T02:13+02:00');
//     assert.equal('2019-10-27 02:13+02:00', converter.toTSV(d));
//     assert.equal('2019-10-27 02:13+02:00', converter.toEditable(d));
//     for (const date of localizedDates) {
//         assert.equal(d, converter.fromEditable(date));
//     }

//     const elem = document.createElement('span');
//     converter.render(elem, d);
//     assert.equal('2019-10-27 02:13+02:00', elem.textContent);
//     assert.equal('non-string', elem.className);

//     assertNotADate(converter, elem);

// });

// test('DateTimeConverter HOURS', () => {
//     const localizedDates = ['2019-10-27T02:13:14.123+02:00', '2019-10-27 02:13:14.123+02:00', '2019-10-27T00:13:14.123Z'];

//     let converter = new c.DateTimeConverter('HOURS');
//     let d = new Date('2019-10-27T02:00+02:00');
//     assert.equal('2019-10-27 02+02:00', converter.toTSV(d));
//     assert.equal('2019-10-27 02+02:00', converter.toEditable(d));
//     for (const date of localizedDates) {
//         assert.equal(d, converter.fromEditable(date));
//     }

//     const elem = document.createElement('span');
//     converter.render(elem, d);
//     assert.equal('2019-10-27 02+02:00', elem.textContent);
//     assert.equal('non-string', elem.className);

//     assertNotADate(converter, elem);

// });



