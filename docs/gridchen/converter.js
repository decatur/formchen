/**
 * Author: dsdsdWolfgang Kühn 2019-2021
 * Source located at https://github.com/decatur/gridchen/gridchen
 *
 * Module implementing data mapping for some common data types.
 */

/** @import { Converter } from "./gridchen" */


import * as utils from './utils.js'

/**
 * @returns {HTMLSpanElement}
 */
function createSpan() {
    const elem = document.createElement('span');
    elem.style.cursor = 'cell';
    return elem
}

/**
 * @implements {Converter}
 */
export class StringConverter {
    constructor() {
    }

    /**
     * @param {string} s
     * @returns {string}
     */
    toTSV(s) {
        return String(s)
    }

    /**
     * @param {string} s
     * @returns {string}
     */
    toEditable(s) {
        return this.toTSV(s)
    }

    /**
     * @param {string} s
     */
    fromEditable(s) {
        return s.trim();
    }

    /**
     * @returns {HTMLSpanElement}
     */
    createElement() {
        return createSpan()
    }

    /**
     * @param {HTMLElement} element
     * @param {string|*} value
     */
    render(element, value) {
        if (typeof value !== 'string') {
            element.textContent = String(value);
            element.className = 'error';
        } else {
            element.textContent = String(value);
            element.className = 'string';
        }
    }
}

export class URIConverter {
    constructor() {
    }

    /**
     * @param {string} s
     * @returns {string}
     */
    toTSV(s) {
        return String(s)
    }

    /**
     * @param {string} s
     * @returns {string}
     */
    toEditable(s) {
        return String(s)
    }

    /**
     * @param {string} s
     */
    fromEditable(s) {
        return s
    }

    /**
     * Creates the display for an anchor cell mimicking MS-Excel.
     * It supports entering edit mode via slow click and cursor management.
     * @returns {HTMLAnchorElement}
     */
    createElement() {
        const elem = document.createElement('a');

        function onMouseUpOrOut(func) {
            elem.onmouseup = elem.onmouseout = func;
        }

        /*
         * Requirements from Excel:
         * 1) A fast click selects the cell and follows the link.
         * 2) A dblclick is the same as a fast click. So a dblclick must not enter edit mode.
         * 3) A slow click (>500ms)
         *     a) selects the cell
         *     b) changes the cursor to cell
         *     c) does not follow the link
         */

        // Avoid activeCell.enterEditMode() being called.
        elem.ondblclick = (evt) => evt.stopPropagation();

        // TODO: Use event delegation.
        elem.onmousedown = function () {
            const h = window.setTimeout(function () {
                const href = elem.getAttribute('href');
                // Make sure link is not followed
                elem.removeAttribute('href');
                elem.style.cursor = 'cell';
                onMouseUpOrOut(function () {
                    // Reestablish cursor.
                    elem.style.removeProperty('cursor');
                    // Reestablish link. Must be done async because if this is a onmouseup event,
                    // an onclick will always fire afterwards, which in turn would follow the link.
                    window.requestAnimationFrame(function() { elem.href = href; });
                    // Remove this handlers.
                    onMouseUpOrOut(undefined);
                });
            }, 500);

            // In case timer did not trigger yet this will clear it.
            onMouseUpOrOut(() => window.clearTimeout(h));
        };

        return elem
    }

    /**
     * @param {HTMLAnchorElement} element
     * @param {string|*} value
     */
    render(element, value) {
        // This will also remove the pointer cursor.
        element.removeAttribute('href');
        element.removeAttribute('target');

        if (typeof value !== "string") {
            element.textContent = String(value);
            element.className = 'error';
        } else {
            // Check for markdown link, i.e. [foobar](http://foobar.org)
            const m = value.match(/^\[(.+)\]\((.+)\)$/);
            let href;
            let text;
            if (m) {
                text = m[1];
                href = m[2];
            } else {
                if (value !== '') {
                    href = value;
                }
                text = value;
            }

            element.textContent = text;
            if (href) {
                element.href = href;
                if (!href.startsWith('#')) element.target = '_blank';
            }

            element.className = 'non-string';
        }
    }
}

/**
 * @interface {Converter}
 */
export class BooleanStringConverter {
    constructor() {
    }

    /**
     * @param {boolean|*} b
     * @returns {string}
     */
    toTSV(b) {
        return String(b)
    }

    /**
     * @param {boolean} b
     * @returns {string}
     */
    toEditable(b) {
        return String(b)
    }

    /**
     * @param {string} s
     */
    fromEditable(s) {
        s = s.trim();
        if (['true', 'wahr', '1', 'y'].indexOf(s.toLowerCase()) >= 0) {
            return true
        }
        if (['false', 'falsch', '0', 'n'].indexOf(s.toLowerCase()) >= 0) {
            return false
        }
        return s;
    }

    /**
     * @returns {HTMLSpanElement}
     */
    createElement() {
        return createSpan()
    }

    /**
     * @param {HTMLElement} element
     * @param {boolean|*} value
     */
    render(element, value) {
        if (typeof value !== 'boolean') {
            element.textContent = String(value);
            element.className = 'error';
        } else {
            element.textContent = String(value); // text is true or false
            element.className = 'non-string';
        }
    }
}

/**
 * @interface {Converter}
 */
export class NumberConverter {
    /**
     * @param {number} fractionDigits
     * @param {string=} locale
     */
    constructor(fractionDigits, locale) {
        /** @type {Intl.NumberFormat} */
        this.nf_render = Intl.NumberFormat(locale, {
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits
        });
        // Default for maximumFractionDigits is 3.
        /** @type {Intl.NumberFormat} */
        this.nf_editable = new Intl.NumberFormat(locale, {maximumFractionDigits: 10});
        let testNumber = this.nf_editable.format(1000.5); // 1.000,50 in de-DE or 1,000.5 in en
        this.thousandSep = testNumber[1];
        this.decimalSep = testNumber[5];  // Will be undefined for fractionDigits=0
        this.isPercent = false;
    }

    /**
     * @param {number|*} n
     * @returns {string}
     */
    toTSV(n) {
        if (typeof n !== 'number') {
            // Normalize String instances, i.e. new String('foo') -> 'foo'
            return String(n)
        }
        let s;
        if (this.isPercent) {
            s = this.nf_editable.format(n * 100) + '%';
        } else {
            s = this.nf_editable.format(n);
        }

        if (this.thousandSep == ',') {
            // Browsers do not support commas in input tags with type number or integer, sadly.
            // So we strip it.
            // See also https://stackoverflow.blog/2022/12/26/why-the-number-input-is-the-worst-input/
            // Round tripping is hard, see 
            // https://stackoverflow.com/questions/29255843/is-there-a-way-to-reverse-the-formatting-by-intl-numberformat-in-javascript
            // https://stackoverflow.com/questions/15303940/how-to-handle-floats-and-decimal-separators-with-html5-input-type-number
            s = s.replaceAll(',', '');
        }
        
        return s
    }

    toEditable(n) {
        return this.toTSV(n)
    }

    /**
     * For example in locale de: parseNumber('1.000,2') -> 1000.2
     */
    fromEditable(s) {
        s = s.trim();
        if (!s) return undefined;
        if (s.toLowerCase() === 'nan') return NaN;
        const isPercent = s[s.length - 1] === '%';
        if (isPercent) {
            s = s.substr(0, s.length - 1);
        }
        let parts = s.split(this.decimalSep);
        parts[0] = parts[0].split(this.thousandSep).join('');
        const n = Number(parts.join('.'));
        return isNaN(n) ? s : (isPercent ? n / 100 : n);
    }

    /**
     * @returns {HTMLSpanElement}
     */
    createElement() {
        return createSpan()
    }

    /**
     * @param {HTMLElement} element
     * @param {number|*} value
     */
    render(element, value) {
        if (typeof value !== 'number') {
            // Normalize String instances, i.e. new String('foo') -> 'foo'
            element.textContent = String(value);
            element.className = 'error';
        } else {
            if (this.isPercent) {
                element.textContent = this.nf_render.format(value * 100) + '%';
            } else {
                element.textContent = this.nf_render.format(value);
            }
            element.className = 'non-string';
        }
    }
}

/**
 * Converter for naive dates. Naive dates do not know about time zones
 * or daylight saving times. JavaScript does not support such naive dates.
 * As a workaround, we choose the UTC time zone as the 'naive' zone.
 * So the date 2017-01-01 corresponds to new Date('2017-01-01T00:00Z').
 */
export class DatePartialTimeStringConverter {

    /**
     * @param {string} period
     */
    constructor(period) {
        this.period = utils.resolvePeriod(period);
        this.parser = utils.localeDateParser();
    }

    /**
     * Returns a iso formatted string in local time without timezone information, for example 2017-01-01T02:00.
     * @param {string|*} s
     * @returns {string}
     */
    toTSV(s) {
        if (typeof s !== 'string') {
            return String(s);
        }

        let r = this.parser.datePartialTime(s);
        if (r instanceof SyntaxError) {
            return s
        }
        const d = new Date(Date.UTC(...r));
        return utils.toUTCDatePartialTimeString(d, this.period);
    }

    toEditable(s) {
        return this.toTSV(s);
    }

    /**
     * Parses any valid date-time format, but iso format is preferred.
     * @param {string} s
     * @returns {string}
     */
    fromEditable(s) {
        const r = this.parser.datePartialTime(s);
        if (r instanceof SyntaxError) {
            return s
        }
        return utils.toUTCDatePartialTimeString(new Date(Date.UTC(...r)), this.period).replace(' ', 'T')
    }

    /**
     * @returns {HTMLSpanElement}
     */
    createElement() {
        return createSpan()
    }

    /**
     * @param {HTMLElement} element
     * @param {string|*} value
     */
    render(element, value) {
        if (typeof value !== 'string') {
            element.textContent = String(value);
            element.className = 'error';
        } else {
            const r = this.parser.datePartialTime(value);
            if (r instanceof SyntaxError) {
                element.textContent = value;
                element.className = 'error';
            } else {
                element.textContent = utils.toUTCDatePartialTimeString(new Date(Date.UTC(...r)), this.period);
                element.className = 'non-string';
            }
        }
    }
}

/**
 * Converter for timezone aware dates.
 */
export class DateTimeStringConverter {
    /**
     * @param {string} period
     */
    constructor(period) {
        this.period = utils.resolvePeriod(period);
        this.parser = utils.localeDateParser();
    }

    /**
     * Returns a iso formatted string in local time with time zone offset, for example 2017-01-01T02:00+01.
     * @param {string} s
     * @returns {string}
     */
    toTSV(s) {
        return this.fromEditable(s).replace('T', ' ')
    }

    toEditable(s) {
        return this.toTSV(s)
    }

    /**
     * @param {string|*} s
     * @returns {string}
     */
    fromEditable(s) {
        if (typeof s !== 'string') {
            return String(s);
        }

        let r = this.parser.dateTime(s);
        if (r instanceof SyntaxError) {
            return s
        }
        r[3] -= r[7]; // Get rid of hour offset
        r[4] -= r[8]; // Get rid of minute offset
        let tuple = /**@type{[number, number]}*/(r.slice(0, 1 + this.period));

        const d = new Date(Date.UTC(...tuple));
        return utils.toLocaleISODateTimeString(d, this.period).replace(' ', 'T')
    }

    /**
     * @returns {HTMLSpanElement}
     */
    createElement() {
        return createSpan()
    }

    /**
     * @param {HTMLElement} element
     * @param {string|*} value
     */
    render(element, value) {
        if (typeof value !== 'string') {
            element.textContent = String(value);
            element.className = 'error';
        } else {
            const r = this.parser.dateTime(value);
            if (r instanceof SyntaxError) {
                element.textContent = value;
                element.className = 'error';
            } else {
                const parts = r;
                parts[3] -= parts[7]; // Get rid of hour offset
                parts[4] -= parts[8]; // Get rid of minute offset
                let tuple = /**@type{[number, number]}*/(parts.slice(0, 7));
                element.textContent = utils.toLocaleISODateTimeString(new Date(Date.UTC(...tuple)), this.period);
                element.className = 'non-string';
            }
        }
    }
}

/**
 * Converter for naive dates. Naive dates do not know about time zones
 * or daylight saving times. JavaScript does not support such naive dates.
 * As a workaround, we choose the UTC time zone as the 'naive' zone.
 * So the date 2017-01-01 corresponds to new Date('2017-01-01T00:00Z').
 */
export class DatePartialTimeConverter {
    /**
     * @param {string} period
     */
    constructor(period, locale) {
        this.period = utils.resolvePeriod(period);
        this.parser = utils.localeDateParser();
    }

    /**
     * Returns a iso formatted string in local time without timezone information, for example 2017-01-01T02:00.
     * @param {Date|*} d
     * @returns {string}
     */
    toTSV(d) {
        if (d.constructor !== Date) {
            return String(d);
        }

        return utils.toUTCDatePartialTimeString(d, this.period)
    }

    toEditable(d) {
        return this.toTSV(d);
    }

    /**
     * Parses any valid date-time format, but iso format is preferred.
     * @param {string} s
     * @returns {Date|string}
     */
    fromEditable(s) {
        let r = this.parser.datePartialTime(s);
        if (r instanceof SyntaxError) {
            return s
        }
        let tuple = /**@type{[number, number]}*/(r.slice(0, 1 + this.period));
        return new Date(Date.UTC(...tuple))
    }

    /**
     * @returns {HTMLSpanElement}
     */
    createElement() {
        return createSpan()
    }

    /**
     * @param {HTMLElement} element
     * @param {Date|*} value
     */
    render(element, value) {
        if (value.constructor !== Date) {
            element.textContent = String(value);
            element.className = 'error';
        } else {
            element.textContent = utils.toUTCDatePartialTimeString(value, this.period);
            element.className = 'non-string';
        }
    }
}

/**
 * Converter for timezone aware dates.
 */
export class DateTimeConverter {
    /**
     * @param {string} period
     */
    constructor(period, locale) {
        this.period = utils.resolvePeriod(period);
        this.parser = utils.localeDateParser();
    }

    /**
     * Returns a iso formatted string in local time with time zone offset, for example 2017-01-01T02:00+01.
     * @param {Date|*} d
     * @returns {string}
     */
    toTSV(d) {
        if (d.constructor !== Date) {
            return String(d)
        }
        return utils.toLocaleISODateTimeString(d, this.period)
    }

    toEditable(d) {
        return this.toTSV(d);
    }

    /**
     * Parses any valid date-time format, but iso format is preferred.
     * @param {string} s
     * @returns {Date | string}
     */
    fromEditable(s) {
        let r = this.parser.dateTime(s);
        if (r instanceof SyntaxError) {
            return s
        }
        const parts = r;
        parts[3] -= parts[7]; // Get rid of hour offset
        parts[4] -= parts[8]; // Get rid of minute offset
        let tuple = /**@type{[number, number]}*/(parts.slice(0, 1 + this.period));
        return new Date(Date.UTC(...tuple));
    }

    /**
     * @returns {HTMLSpanElement}
     */
    createElement() {
        return createSpan()
    }

    /**
     * @param {HTMLElement} element
     * @param {Date|*} value
     */
    render(element, value) {
        if (value.constructor !== Date) {
            element.textContent = String(value);
            element.className = 'error';
        } else {
            element.textContent = utils.toLocaleISODateTimeString(value, this.period);
            element.className = 'non-string';
        }
    }
}


// /**
//  * Parses a list of local date strings and returns a list of dates. This is only possible because we assert that
//  * the date value must always increase.
//  *
//  * Example:
//  * let dates = ['2019-10-27 01:00', '2019-10-27 02:00', '2019-10-27 02:15', '2019-10-27 02:00', '2019-10-27 02:15', '2019-10-27 03:00'];
//  * localDateStringToDate(dates).map((d, i) => dates[i] + ' -> ' + d.toJSON()).join('\n')
//  *  2019-10-27 01:00 -> 2019-10-26T23:00Z
//  *  2019-10-27 02:00 -> 2019-10-27T00:00Z
//  *  2019-10-27 02:15 -> 2019-10-27T00:15Z
//  *  2019-10-27 02:00 -> 2019-10-27T01:00Z
//  *  2019-10-27 02:15 -> 2019-10-27T01:15Z
//  *  2019-10-27 03:00 -> 2019-10-27T02:00Z
//  *
//  * @param {Array<string>} dateStrings
//  * @returns {Date[]}
//  */
// function localDateStringToDate(dateStrings) {
//     let prevTime = undefined;
//     return dateStrings.map(function (s) {
//         let d = new Date(s);
//         if (d.getTime() <= prevTime) {
//             d = new Date(d.getTime() + 60 * 60 * 1000);
//         }
//         prevTime = d.getTime();
//         return (d);
//     });
// }
