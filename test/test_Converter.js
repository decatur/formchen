import {test, assert} from './utils.js'
import * as c from "../docs/gridchen/converter.js";

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
    function pi(locale, fractionDigits, piLongString, piShortString) {
        const converter = new c.NumberConverter(fractionDigits, locale);
        assert.equal(piLongString, converter.toTSV(Math.PI));
        assert.equal(piLongString, converter.toEditable(Math.PI));
        assert.equal(3.1415926536, converter.fromEditable(piLongString));

        const elem = document.createElement('span');
        converter.render(elem, Math.PI);
        assert.equal(piShortString, elem.textContent);
        assert.equal('non-string', elem.className);

        converter.render(elem, {});
        assert.equal('[object Object]', elem.textContent);
        assert.equal('error', elem.className);
    }

    pi('de', 2, '3,1415926536', '3,14');
    pi('en', 2, '3.1415926536', '3.14');
    pi('de', 0, '3,1415926536', '3');
    pi('en', 0, '3.1415926536', '3');

    const converter = new c.NumberConverter(0);
    assert.equal(NaN, converter.fromEditable('NaN'));
});

function assertNotADate(converter, elem) {
    converter.render(elem, 'not_a_date');
    assert.equal('not_a_date', elem.textContent);
    assert.equal('error', elem.className);
}

function runEdits(run) {
    const defaultEdits = ['2019-10-27T02:13:14.123+02:00', '2019-10-27 02:13:14.123+02:00', '2019-10-27T00:13:14.123Z'];
    const de = defaultEdits.concat(['27.10.2019 02:13:14.123+02:00']);
    const en = defaultEdits.concat(['10/27/2019 02:13:14.123+02:00']);

    run('de', de);
    run('en', en);
}

function runPartialEdits(run) {
    const defaultEdits = ['2019-10-27T02:13:14.123', '2019-10-27 02:13:14.123'];
    const de = defaultEdits.concat(['27.10.2019 02:13:14.123']);
    const en = defaultEdits.concat(['10/27/2019 02:13:14.123']);

    run('de', de);
    run('en', en);
}

test('DatePartialTimeStringConverter SECONDS', () => {
    function run(locale, localizedDates) {
        let converter = new c.DatePartialTimeStringConverter('SECONDS', locale);
        assert.equal('not_a_date', converter.toTSV('not_a_date'));
        assert.equal('2019-10-27 02:13:14', converter.toEditable('2019-10-27T02:13:14'));
        for (const date of localizedDates) {
            assert.equal('2019-10-27T02:13:14', converter.fromEditable(date));
        }

        const elem = document.createElement('span');
        converter.render(elem, '2019-10-27T02:13:14');
        assert.equal('2019-10-27 02:13:14', elem.textContent);
        assert.equal('non-string', elem.className);

        assertNotADate(converter, elem);
    }

    runPartialEdits(run);

});

test('DatePartialTimeStringConverter MINUTES', () => {
    function run(locale, localizedDates) {
        let converter = new c.DatePartialTimeStringConverter('MINUTES', locale);
        assert.equal('not_a_date', converter.toTSV('not_a_date'));
        assert.equal('2019-10-27 02:13', converter.toEditable('2019-10-27T02:13'));
        for (const date of localizedDates) {
            assert.equal('2019-10-27T02:13', converter.fromEditable(date));
        }

        const elem = document.createElement('span');
        converter.render(elem, '2019-10-27T02:13');
        assert.equal('2019-10-27 02:13', elem.textContent);
        assert.equal('non-string', elem.className);

        assertNotADate(converter, elem);
    }

    runPartialEdits(run);

});

test('DatePartialTimeStringConverter HOURS', () => {
    function run(locale, localizedDates) {
        let converter = new c.DatePartialTimeStringConverter('HOURS', locale);
        assert.equal('not_a_date', converter.toTSV('not_a_date'));
        assert.equal('2019-10-27 02', converter.toEditable('2019-10-27T02:13'));
        for (const date of localizedDates) {
            assert.equal('2019-10-27T02', converter.fromEditable(date));
        }

        const elem = document.createElement('span');
        converter.render(elem, '2019-10-27T02:13');
        assert.equal('2019-10-27 02', elem.textContent);
        assert.equal('non-string', elem.className);

        assertNotADate(converter, elem);
    }

    runPartialEdits(run);
});

test('DatePartialTimeStringConverter DAYS', () => {
    function run(locale, localizedDates) {
        let converter = new c.DatePartialTimeStringConverter('DAYS', locale);
        assert.equal('not_a_date', converter.toTSV('not_a_date'));
        assert.equal('2019-10-27', converter.toEditable('2019-10-27'));
        for (const date of localizedDates) {
            assert.equal('2019-10-27', converter.fromEditable(date));
        }

        const elem = document.createElement('span');
        converter.render(elem, '2019-10-27');
        assert.equal('2019-10-27', elem.textContent);
        assert.equal('non-string', elem.className);

        assertNotADate(converter, elem);
    }

    runPartialEdits(run);
});

test('DateTimeStringConverter HOURS', () => {
    function run(locale, localizedDates) {
        let converter = new c.DateTimeStringConverter('HOURS', locale);
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
    }

    runEdits(run);
});

test('DateTimeStringConverter MINUTES', () => {
    function run(locale, localizedDates) {
        let converter = new c.DateTimeStringConverter('MINUTES', locale);
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
    }

    runEdits(run);
});

test('DateTimeStringConverter SECONDS', () => {
    function run(locale, localizedDates) {
        let converter = new c.DateTimeStringConverter('SECONDS', locale);
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
    }

    runEdits(run);
});

test('DateTimeStringConverter MILLISECONDS', () => {
    function run(locale, localizedDates) {
        let converter = new c.DateTimeStringConverter('MILLISECONDS', locale);
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
    }

    runEdits(run);
});

test('DatePartialTimeConverter SECONDS', () => {
    function run(locale, localizedDates) {
        let converter = new c.DatePartialTimeConverter('SECONDS', locale);
        let d = new Date(Date.UTC(2019, 9, 27, 2, 13, 14));

        assert.equal('2019-10-27 02:13:14', converter.toTSV(d));
        assert.equal('2019-10-27 02:13:14', converter.toEditable(d));
        assert.equal('not_a_date', converter.toTSV('not_a_date'));
        for (const date of localizedDates) {
            assert.equal(d, converter.fromEditable(date));
        }

        const elem = document.createElement('span');
        converter.render(elem, d);
        assert.equal('2019-10-27 02:13:14', elem.textContent);
        assert.equal('non-string', elem.className);

        assertNotADate(converter, elem);
    }

    runPartialEdits(run);
});

test('DatePartialTimeConverter MINUTES', () => {
    function run(locale, localizedDates) {
        let converter = new c.DatePartialTimeConverter('MINUTES', locale);
        let d = new Date(Date.UTC(2019, 9, 27, 2, 13));

        assert.equal('2019-10-27 02:13', converter.toTSV(d));
        assert.equal('not_a_date', converter.toTSV('not_a_date'));
        assert.equal('2019-10-27 02:13', converter.toEditable(d));
        for (const date of localizedDates) {
            assert.equal(d, converter.fromEditable(date));
        }

        const elem = document.createElement('span');
        converter.render(elem, d);
        assert.equal('2019-10-27 02:13', elem.textContent);
        assert.equal('non-string', elem.className);

        assertNotADate(converter, elem);
    }

    runPartialEdits(run);
});

test('DatePartialTimeConverter HOURS', () => {
    function run(locale, localizedDates) {
        let converter = new c.DatePartialTimeConverter('HOURS', locale);
        let d = new Date(Date.UTC(2019, 9, 27, 2));

        assert.equal('2019-10-27 02', converter.toTSV(d));
        assert.equal('not_a_date', converter.toTSV('not_a_date'));
        assert.equal('2019-10-27 02', converter.toEditable(d));
        for (const date of localizedDates) {
            assert.equal(d, converter.fromEditable(date));
        }

        const elem = document.createElement('span');
        converter.render(elem, d);
        assert.equal('2019-10-27 02', elem.textContent);
        assert.equal('non-string', elem.className);

        assertNotADate(converter, elem);
    }

    runPartialEdits(run);
});

test('DatePartialTimeConverter DAYS', () => {
    function run(locale, localizedDates) {
        let converter = new c.DatePartialTimeConverter('DAYS', locale);
        let d = new Date(Date.UTC(2019, 9, 27));

        assert.equal('2019-10-27', converter.toTSV(d));
        assert.equal('not_a_date', converter.toTSV('not_a_date'));
        assert.equal('2019-10-27', converter.toEditable(d));
        for (const date of localizedDates) {
            assert.equal(d, converter.fromEditable(date));
        }

        const elem = document.createElement('span');
        converter.render(elem, d);
        assert.equal('2019-10-27', elem.textContent);
        assert.equal('non-string', elem.className);

        assertNotADate(converter, elem);
    }

    runPartialEdits(run);
});

test('DateTimeConverter MILLISECONDS', () => {
    function run(locale, localizedDates) {
        let converter = new c.DateTimeConverter('MILLISECONDS', locale);
        let d = new Date('2019-10-27T02:13:14.123+02:00');
        assert.equal('2019-10-27 02:13:14.123+02:00', converter.toTSV(d));
        assert.equal('2019-10-27 02:13:14.123+02:00', converter.toEditable(d));
        for (const date of localizedDates) {
            assert.equal(d, converter.fromEditable(date));
        }

        const elem = document.createElement('span');
        converter.render(elem, d);
        assert.equal('2019-10-27 02:13:14.123+02:00', elem.textContent);
        assert.equal('non-string', elem.className);

        assertNotADate(converter, elem);
    }

    runEdits(run);
});

test('DateTimeConverter SECONDS', () => {
    function run(locale, localizedDates) {
        let converter = new c.DateTimeConverter('SECONDS', locale);
        let d = new Date('2019-10-27T02:13:14+02:00');
        assert.equal('2019-10-27 02:13:14+02:00', converter.toTSV(d));
        assert.equal('2019-10-27 02:13:14+02:00', converter.toEditable(d));
        for (const date of localizedDates) {
            assert.equal(d, converter.fromEditable(date));
        }

        const elem = document.createElement('span');
        converter.render(elem, d);
        assert.equal('2019-10-27 02:13:14+02:00', elem.textContent);
        assert.equal('non-string', elem.className);

        assertNotADate(converter, elem);
    }

    runEdits(run);
});

test('DateTimeConverter MINUTES', () => {
    function run(locale, localizedDates) {
        let converter = new c.DateTimeConverter('MINUTES', locale);
        let d = new Date('2019-10-27T02:13+02:00');
        assert.equal('2019-10-27 02:13+02:00', converter.toTSV(d));
        assert.equal('2019-10-27 02:13+02:00', converter.toEditable(d));
        for (const date of localizedDates) {
            assert.equal(d, converter.fromEditable(date));
        }

        const elem = document.createElement('span');
        converter.render(elem, d);
        assert.equal('2019-10-27 02:13+02:00', elem.textContent);
        assert.equal('non-string', elem.className);

        assertNotADate(converter, elem);
    }

    runEdits(run);
});

test('DateTimeConverter HOURS', () => {
    function run(locale, localizedDates) {
        let converter = new c.DateTimeConverter('HOURS', locale);
        let d = new Date('2019-10-27T02:00+02:00');
        assert.equal('2019-10-27 02+02:00', converter.toTSV(d));
        assert.equal('2019-10-27 02+02:00', converter.toEditable(d));
        for (const date of localizedDates) {
            assert.equal(d, converter.fromEditable(date));
        }

        const elem = document.createElement('span');
        converter.render(elem, d);
        assert.equal('2019-10-27 02+02:00', elem.textContent);
        assert.equal('non-string', elem.className);

        assertNotADate(converter, elem);
    }

    runEdits(run);
});



