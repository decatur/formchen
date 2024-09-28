/**
 * Author: Wolfgang Kühn 2019-2024
 * Source located at https://github.com/decatur/formchen
 *
 * Module implementing data mapping for some common data types.
 */

/** @import { Converter } from "./types" */


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
     * @returns {string}
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
     * @returns {string}
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
     * @returns {boolean | string}
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
        this.nf_editable = new Intl.NumberFormat(locale, {maximumFractionDigits: 10});
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
     * @param {string} s The string value from a HTMLInputElement with type='number', i.e. decimal seperator is always a dot.
     * @returns {number | string}
     */
    fromEditable(s) {
        s = s.trim();
        if (!s) return undefined;
        if (s.toLowerCase() === 'nan') return NaN;
        const n = Number(s);
        return isNaN(n) ? s : n;
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

// /**
//  * Converter for naive dates. Naive dates do not know about time zones
//  * or daylight saving times. JavaScript does not support such naive dates.
//  * As a workaround, we choose the UTC time zone as the 'naive' zone.
//  * So the date 2017-01-01 corresponds to new Date('2017-01-01T00:00Z').
//  */
// export class DatePartialTimeStringConverter {

//     /**
//      * @param {string} period
//      */
//     constructor(period) {
//         this.period = utils.resolvePeriod(period);
//         this.parser = utils.localeDateParser();
//     }

//     /**
//      * Returns a iso formatted string in local time without timezone information, for example 2017-01-01T02:00.
//      * @param {string|*} s
//      * @returns {string}
//      */
//     toTSV(s) {
//         if (typeof s !== 'string') {
//             return String(s);
//         }

//         let r = this.parser.datePartialTime(s);
//         if (r instanceof SyntaxError) {
//             return s
//         }
//         const d = new Date(Date.UTC(...r));
//         return utils.toUTCDatePartialTimeString(d, this.period);
//     }

//     toEditable(s) {
//         return this.toTSV(s);
//     }

//     /**
//      * Parses any valid date-time format, but iso format is preferred.
//      * @param {string} s
//      * @returns {string}
//      */
//     fromEditable(s) {
//         const r = this.parser.datePartialTime(s);
//         if (r instanceof SyntaxError) {
//             return s
//         }
//         return utils.toUTCDatePartialTimeString(new Date(Date.UTC(...r)), this.period).replace(' ', 'T')
//     }

//     /**
//      * @returns {HTMLSpanElement}
//      */
//     createElement() {
//         return createSpan()
//     }

//     /**
//      * @param {HTMLElement} element
//      * @param {string|*} value
//      */
//     render(element, value) {
//         if (typeof value !== 'string') {
//             element.textContent = String(value);
//             element.className = 'error';
//         } else {
//             const r = this.parser.datePartialTime(value);
//             if (r instanceof SyntaxError) {
//                 element.textContent = value;
//                 element.className = 'error';
//             } else {
//                 element.textContent = utils.toUTCDatePartialTimeString(new Date(Date.UTC(...r)), this.period);
//                 element.className = 'non-string';
//             }
//         }
//     }
// }

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

// /**
//  * Converter for naive dates. Naive dates do not know about time zones
//  * or daylight saving times. JavaScript does not support such naive dates.
//  * As a workaround, we choose the UTC time zone as the 'naive' zone.
//  * So the date 2017-01-01 corresponds to new Date('2017-01-01T00:00Z').
//  */
// export class DatePartialTimeConverter {
//     /**
//      * @param {string} period
//      */
//     constructor(period) {
//         this.period = utils.resolvePeriod(period);
//         this.parser = utils.localeDateParser();
//     }

//     /**
//      * Returns a iso formatted string in local time without timezone information, for example 2017-01-01T02:00.
//      * @param {Date|*} d
//      * @returns {string}
//      */
//     toTSV(d) {
//         if (d.constructor !== Date) {
//             return String(d);
//         }

//         return utils.toUTCDatePartialTimeString(d, this.period)
//     }

//     toEditable(d) {
//         return this.toTSV(d);
//     }

//     /**
//      * Parses any valid date-time format, but iso format is preferred.
//      * @param {string} s
//      * @returns {Date|string}
//      */
//     fromEditable(s) {
//         let r = this.parser.datePartialTime(s);
//         if (r instanceof SyntaxError) {
//             return s
//         }
//         let tuple = /**@type{[number, number]}*/(r.slice(0, 1 + this.period));
//         return new Date(Date.UTC(...tuple))
//     }

//     /**
//      * @returns {HTMLSpanElement}
//      */
//     createElement() {
//         return createSpan()
//     }

//     /**
//      * @param {HTMLElement} element
//      * @param {Date|*} value
//      */
//     render(element, value) {
//         if (value.constructor !== Date) {
//             element.textContent = String(value);
//             element.className = 'error';
//         } else {
//             element.textContent = utils.toUTCDatePartialTimeString(value, this.period);
//             element.className = 'non-string';
//         }
//     }
// }

/**
 * Converter for naive dates. Naive dates do not know about time zones
 * or daylight saving times. JavaScript does not support such naive dates.
 * As a workaround, we choose the UTC time zone as the 'naive' zone.
 * So the date 2017-01-01 corresponds to new Date('2017-01-01T00:00Z').
 */
export class FullDateConverter {

    constructor() {
        this.parser = utils.localeDateParser();
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
     * @returns {string}
     */
    fromEditable(s) {
        let r = this.parser.fullDate(s);
        if (r instanceof SyntaxError) {
            // TODO: Style this case differently?
            return s
        }
        return s
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

/**
 * Converter for timezone aware dates.
 */
export class DateTimeConverter {
    /**
     * @param {string} period
     */
    constructor(period) {
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

