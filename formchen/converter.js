/**
 * Author: Wolfgang Kühn 2019-2024
 * Source located at https://github.com/decatur/formchen
 *
 * Module implementing data mapping for some common data types.
 */

/** @import { Converter } from "./private-types" */


import * as utils from './utils.js'
import { ParsedValue } from './utils.js'

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
     * @param {number} _n
     * @param {HTMLInputElement} _input 
     */
    toInputEdit(_n, _input) {}

    /**
     * @param {HTMLInputElement|HTMLTextAreaElement} input
     * @param {boolean} readOnly
     */
    conditionInput(input, readOnly) {
        if (input instanceof HTMLInputElement) input.type = 'string';
        input.readOnly = readOnly;
    }

    /**
    * @param {string} s 
    * @param {HTMLInputElement} input 
    */
    toInput(s, input) {
        input.value = s;
    }

    /**
     * @param {HTMLInputElement} input
     * @returns {ParsedValue}
     */
    fromInput(input) {
        return this.fromEditable(input.value);
    }

    /**
     * @param {string} s
     * @returns {ParsedValue}
     */
    fromEditable(s) {
        s = s.trim();
        return new ParsedValue(s, s?s:null);
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

/**
 * @implements {Converter}
 */
export class ColorConverter extends StringConverter {
    constructor() {
        super();
    }

    /**
     * @param {HTMLInputElement} input
     * @param {boolean} readOnly
     */
    conditionInput(input, readOnly) {
        input.type = 'color';
        input.readOnly = readOnly;
    }
}

/**
 * @implements {Converter}
 */
export class UrlConverter extends StringConverter {
    constructor() {
        super();
    }

    /**
     * @param {HTMLInputElement} input
     * @param {boolean} readOnly
     */
    conditionInput(input, readOnly) {
        input.type = 'url';
        input.readOnly = readOnly;
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
                    window.requestAnimationFrame(function () { elem.href = href; });
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
 * @implements {Converter}
 */
export class BooleanStringConverter extends StringConverter {
    truthy = new Set(['true', 'wahr', '1', 'y']);
    falsy = new Set(['false', 'falsch', '0', 'n']);
    constructor() {
        super();
    }

    /**
     * @param {boolean|*} b
     * @returns {string}
     */
    toTSV(b) {
        return String(b)
    }

    /**
     * @param {boolean|any} b
     * @returns {string}
     */
    toEditable(b) {
        return String(b)
    }

    /**
     * @param {string} s
     * @returns {ParsedValue}
     */
    fromEditable(s) {
        s = s.trim();
        if (this.truthy.has(s.toLowerCase())) {
            return new ParsedValue(s, true)
        }
        if (this.falsy.has(s.toLowerCase())) {
            return new ParsedValue(s, false)
        }
        return new ParsedValue(s, null, 'Invalid value');
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
 * @implements {Converter}
 */
export class NumberConverter {
    /**
     * @param {number} fractionDigits
     */
    constructor(fractionDigits) {
        // NumberConverter only works in conjuction wit input elements of type='number'.
        // Regardles from the locale/language of the browser, such input elements value has always '.' as a decimal separator. 

        const locale = navigator.language;

        /** @type {Intl.NumberFormat} */
        this.nf_render = Intl.NumberFormat(locale, {
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits
        });
        // Default for maximumFractionDigits is 3.
        /** @type {Intl.NumberFormat} */
        this.nf_editable = new Intl.NumberFormat(locale, { maximumFractionDigits: 10 });
        this.fractionDigits = fractionDigits;
    }

    /**
     * @param {HTMLInputElement} input
     * @param {boolean} readOnly
     */
    conditionInput(input, readOnly) {
        input.type = 'number';
        input.step = 'any';
        input.style.textAlign = "right";
        input.readOnly = readOnly;
    }

    /**
     * @param {number} n
     * @param {HTMLInputElement} input 
     */
    toInput(n, input) {
        input.value = n.toFixed(this.fractionDigits)
    }

    /**
     * @param {number} n
     * @param {HTMLInputElement} input 
     */
    toInputEdit(n, input) {
        input.value = String(n)
    }

    /**
     * @param {HTMLInputElement} input
     * @returns {ParsedValue}
     */
    fromInput(input) {
        return this.fromEditable(input.value);
    }

    /**
     * @param {string} s The string value from a HTMLInputElement with type='number', i.e. decimal seperator is always a dot.
     * @returns {ParsedValue}
     */
    fromEditable(s) {
        s = s.trim();
        if (!s) return new ParsedValue('', null);
        if (s.toLowerCase() === 'nan') return new ParsedValue(s, NaN);
        const n = Number(s);
        return isNaN(n) ? new ParsedValue(s, null, 'Invalid number'): new ParsedValue(s, n);
    }

    /**
     * @param {number|*} n
     * @returns {string}
     */
    toTSV(n) {
        if (typeof n !== 'number') {
            return String(n)
        }
        return this.nf_editable.format(n);
    }

    /**
     * 
     * @param {number|*} n
     * @returns {string} The string value for a HTMLInputElement with type='number', i.e. decimal seperator is always a dot.
     */
    toEditable(n) {
        return String(n)
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
            element.textContent = this.nf_render.format(value);
            element.className = 'non-string';
        }
    }
}

/**
 * @implements {Converter}
 */
export class IntegerConverter extends StringConverter {
    constructor() {
        super()
    }

    /**
     * @param {HTMLInputElement} input
     * @param {boolean} readOnly
     */
    conditionInput(input, readOnly) {
        input.type = 'number';
        input.step = '1';
        input.style.textAlign = "right";
        input.readOnly = readOnly;
    }

    /**
     * @param {number|any} n
     * @param {HTMLInputElement} input 
     */
    toInput(n, input) {
        input.value = String(n)
    }

    /**
     * @param {number} n
     * @param {HTMLInputElement} input 
     */
    toInputEdit(n, input) {
        this.toInput(n, input);
    }

    /**
     * @param {HTMLInputElement} input
     * @returns {ParsedValue}
     */
    fromInput(input) {
        let s = input.value.trim();
        if (input.validity.stepMismatch) return new ParsedValue(s, NaN, input.validationMessage)
        return this.fromEditable(s);
    }

    /**
     * @param {string} s The string value from a HTMLInputElement with type='number', i.e. decimal seperator is always a dot.
     * @returns {ParsedValue}
     */
    fromEditable(s) {
        s = s.trim();
        if (!s) return new ParsedValue('', null);
        if (s.toLowerCase() === 'nan') return new ParsedValue(s, NaN);
        if (!/^(\+|\-)?\d+$/.test(s)) {
            return new ParsedValue(s, null, 'Invalid number');
        }

        return new ParsedValue(s, Number(s));
    }

    /**
     * @param {number|*} n
     * @returns {string}
     */
    toTSV(n) {
        return String(n);
    }

    /**
     * 
     * @param {number|*} n
     * @returns {string} The string value for a HTMLInputElement with type='number', i.e. decimal seperator is always a dot.
     */
    toEditable(n) {
        return String(n)
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
            element.textContent = String(value);
            element.className = 'non-string';
        }
    }
}

/**
 * Converter for timezone aware dates. The converter does not really convert but validates.
 * @implements {Converter}
 */
export class DateTimeStringConverter extends StringConverter {
    /**
     * @param {string} period
     */
    constructor(period) {
        super();
        this.period = utils.resolvePeriod(period);
        this.parser = utils.localeDateParser();
    }

    /**
     * @param {string} s 
     * @param {HTMLInputElement} input 
     */
    toInput(s, input) {
        input.value = s;
    }

    /**
     * @param {HTMLInputElement} input
     * @returns {ParsedValue}
     */
    fromInput(input) {
        return this.fromEditable(input.value.trim());
    }

    /**
     * Returns a iso formatted string in local time with time zone offset, for example 2017-01-01T02:00+01.
     * @param {string} s
     * @returns {string}
     */
    toTSV(s) {
        // Apply String() for type checker only.
        // return String(this.fromEditable(s).parsed).replace('T', ' ')
        return s
    }

    /**
     * @param {string} s 
     * @returns {string}
     */
    toEditable(s) {
        return s
    }

    /**
     * @param {string|*} s
     * @returns {ParsedValue}
     */
    fromEditable(s) {
        if (typeof s !== 'string') {
            throw Error('fromEditable');
            return new ParsedValue(s, String(s), 'Not a string');
        }

        s = s.trim();
        if (!s) return new ParsedValue('', null);

        let r = this.parser.dateTime(s, this.period);
        if (r instanceof SyntaxError) {
            return new ParsedValue(s, null, r.toString());
        }

        return new ParsedValue(s, s);
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
            const r = this.parser.dateTime(value, this.period);
            if (r instanceof SyntaxError) {
                element.textContent = value;
                element.className = 'error';
            } else {
                element.textContent = value;
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
 * 
 * @implements {Converter}
 */
export class FullDateConverter extends StringConverter {

    constructor() {
        super();
        this.parser = utils.localeDateParser();
    }

    /**
     * @param {HTMLInputElement} input
     * @param {boolean} readOnly
     */
    conditionInput(input, readOnly) {
        input.type = 'date';
        input.readOnly = readOnly;
    }

    /**
     * @param {string} s 
     * @param {HTMLInputElement} input 
     */
    toInput(s, input) {
        input.value = s;
    }

    /**
     * @param {HTMLInputElement} input
     * @returns {ParsedValue}
     */
    fromInput(input) {
        let s = input.value.trim();
        let r = this.parser.fullDate(s);
        if (r instanceof SyntaxError) {
            return new ParsedValue(s, null, r.message);
        } else {
            return new ParsedValue(s, s);
        }
    }

    /**
     * Returns a iso formatted string in local time without timezone information, for example 2017-01-01T02:00.
     * @param {string} date
     * @returns {string}
     */
    toTSV(date) {
        return date
    }

    /**
     * 
     * @param {string} date
     * @returns 
     */
    toEditable(date) {
        return this.toTSV(date);
    }

    /**
     * Parses the full date format yyyy-mm-dd.
     * @param {string} s
     * @returns {ParsedValue}
     */
    fromEditable(s) {
        s = s.trim();
        if (!s) return new ParsedValue('', null);

        let r = this.parser.fullDate(s);
        if (r instanceof SyntaxError) {
            // TODO: Style this case differently?
            return new ParsedValue(s, null, r.toString())
        }
        return new ParsedValue(s, s)
    }

    /**
     * @returns {HTMLSpanElement}
     */
    createElement() {
        return createSpan()
    }

    /**
     * @param {HTMLElement} element
     * @param {string} date
     */
    render(element, date) {
        let r = this.parser.fullDate(date);
        if (r instanceof SyntaxError) {
            element.className = 'error';
        } else {
            element.className = 'non-string';
        }
        element.textContent = date
    }
}

