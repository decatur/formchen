/**
 * Author: Wolfgang Kühn 2019-2024
 * Source located at https://github.com/decatur/formchen
 *
 * Module implementing the visual grid and scrolling behaviour.
 */

/** @import { GridSelectionAbstraction, Range as IRange, CellEditMode, MatrixView, GridChenElement, ColumnSchema } from "../private-types" */
/** @import { JSONPatch, JSONSchema } from "../types" */
/** @import { Transaction } from "../utils" */


import { logger, Patch, wrap, TransactionManager, ParsedValue } from "../utils.js";
import { createSelection, Range, IndexToPixelMapper } from "./selection.js";
import * as edit from "./editor.js"
import { createView } from "../gridchen/matrixview.js"
import { removeNoOps } from "../json_patch_merge.js";


//////////////////////
// Start Configuration
const cellPadding = 3;
const scrollBarBorderWidth = 1;
const scrollBarThumbWidth = 15;
const lineHeight = 22;
const dark = {
    selectionBackgroundColor: 'slategrey',
    activeCellBackgroundColor: 'dimgrey',
    headerRowBackgroundColor: 'dimgrey',
    headerRowSelectedBackgroundColor: 'slategrey',
    cellBorderWidth: 0.5
};
const light = {
    selectionBackgroundColor: '#c6c6c6',
    activeCellBackgroundColor: '#e6e6e6',
    headerRowBackgroundColor: '#e6e6e6',
    headerRowSelectedBackgroundColor: '#c6c6c6',
    cellBorderWidth: 1
};
// End Configuration
//////////////////////

/**
 * Returns a numerical vector from a CSS color of the form rgb(1,2,3).
 * @param {string} color
 * @returns {number[]}
 */
function colorVector(color) {
    return color.substring(4).split(',').map(part => parseInt(part))
}

// We use document.body style for theming.
// TODO: Maybe use CSS custom properties https://developers.google.com/web/fundamentals/web-components/shadowdom#stylehooks
const bodyStyle = window.getComputedStyle(document.body);
const inputColor = bodyStyle.color;
const inputBackgroundColor = bodyStyle.backgroundColor;
const intensity = colorVector(bodyStyle.backgroundColor).reduce((a, b) => a + b, 0) / 3;
let {
    selectionBackgroundColor,
    activeCellBackgroundColor,
    headerRowBackgroundColor,
    headerRowSelectedBackgroundColor,
    cellBorderWidth
} = (intensity < 0xff / 2 ? dark : light);

const cellBorderStyle = `${cellBorderWidth}px solid ` + inputColor;
const scrollBarWidth = scrollBarThumbWidth + 2 * scrollBarBorderWidth;

//const numeric = new Set(['number', 'integer']);

/**
 * @param {number} count 
 * @returns 
 */
function rangeIterator(count) {
    return Array.from({ length: count }, (_, i) => i);
}


/**
 * @returns {HTMLElement}
 */
function openDialog() {
    let dialog = /** @type{HTMLDialogElement} */ (document.getElementById('gridchenDialog'));
    if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = 'gridchenDialog';
        document.body.appendChild(dialog);
    }
    dialog.textContent = '';
    dialog.showModal();
    return dialog;
}

// /**
//  * @param {ResizeObserverEntry[]} entries
//  */
// function debounceResize(entries) {
//     for (const entry of entries) {
//         const gridChen = /**@type{GridChen}*/(entry.target);
//         if (gridChen._timeOutHandle) {
//             window.clearTimeout(gridChen._timeOutHandle);
//         }

//         gridChen._timeOutHandle = window.setTimeout(() => {
//             gridChen._timeOutHandle = void 0;
//             if (gridChen._onresize) gridChen._onresize();
//             gridChen.reset();
//         }, 100);
//     }
// }

// const ro = new window.ResizeObserver(entry => debounceResize(entry));


/**
 * We export for testability.
 * @implements {GridChenElement}
 */
export class GridChen extends HTMLElement {
    // Identify the element as a form-associated custom element
    static formAssociated = true;

    constructor() {
        super();
        /** @type {MatrixView} */
        this._viewModel;
        /** @type {TransactionManager} */
        this._transactionManager;

        //ro.observe(this);

        // Properties mixed in later
        this.pathPrefix;
        this._timeOutHandle = undefined;
        this._onresize = undefined;
        this.selectedRange = undefined;
        this.select = undefined;
        this.refresh = undefined;
        this.insertEmptyRow = undefined;
        /** @type{(string, KeyboardEventInit) => void} */
        this._keyboard = undefined;
        this._sendKeys = undefined;
        this._click = undefined;
    }

    /**
     * @returns {object}
     */
    get value() {
        return this._viewModel.getModel()
    }

    get patch() {
        return removeNoOps(this.value, this._transactionManager.patch)
    }

    clearPatch() {
        this._transactionManager.clear()
    }

    /**
     * 
     * @param {JSONSchema} schema 
     * @param {any} value 
     * @param {TransactionManager=} tm
     * @param {string=} pathPrefix 
     */
    bind(schema, value, tm, pathPrefix) {
        tm = tm || new TransactionManager();
        const view = createView(schema, value);
        this.resetFromView(view, tm, pathPrefix);
        //undo.register(/** @type{HTMLElement} */(this.shadowRoot.firstChild), tm);
    }

    /**
     * Resets this element based on the specified view.
     * @param {MatrixView} view
     * @param {TransactionManager} transactionManager
     * @param {string=} pathPrefix 
     * @returns {GridChenElement}
     */
    resetFromView(view, transactionManager, pathPrefix) {
        this.pathPrefix = pathPrefix;
        this._viewModel = view;
        this._transactionManager = transactionManager;
        if (this.shadowRoot) {
            this.shadowRoot.removeChild(this.shadowRoot.firstChild);
        } else {
            // First initialize creates shadow dom.
            this.attachShadow({ mode: 'open' });
        }
        // Attention: Possible Layout Thrashing.
        // Default value needed for unit testing and flex layouts.
        // console.log('clientHeight:' + this.clientHeight);
        this._totalHeight = this.clientHeight || 100;
        const container = document.createElement('div');
        container.style.position = 'absolute';  // Needed so that container does not take up any space.
        //container.style.height = this._totalHeight + 'px';  // Only needed to pass target height to createGrid.
        this.shadowRoot.appendChild(container);
        createGrid(container, view, this, transactionManager, pathPrefix || '', this._totalHeight);
        this.style.width = container.style.width;
        return /**@type{GridChenElement}*/(this)
    }

    /**
     * Resets this element with respect to its implicit dependencies, DOM dimensions and data view content.
     * Currently, this is implemented by calling resetFromView().
     */
    reset() {
        // console.log('reset clientHeight:' + this.clientHeight);
        if (this._viewModel && this._totalHeight !== this.clientHeight) {
            this.resetFromView(this._viewModel, this._transactionManager, this.pathPrefix);
        }
    }
}

customElements.define('grid-chen', GridChen);

class ScrollBar {

    /**
     * @param {HTMLElement} domParent
     * @param {number} xOffset the x-offset for the scroll bar.
     * @param {number} height the height of the vertical scroll bar.
     * @param handler
     */
    constructor(domParent, xOffset, height, handler) {
        /*
            We use a range input element to represent the scroll bar.
            Styling emulates a scroll bar for element overflow,
            See http://twiggle-web-design.com/tutorials/Custom-Vertical-Input-Range-CSS3.html
        */
        const offset = (height - scrollBarWidth) / 2;
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            #slider {
                 -webkit-appearance: unset;
                 position: absolute;
                 cursor: pointer;
                 width: ${height - 2 * scrollBarBorderWidth}px !important;
                 transform:translate(${xOffset - offset}px,${offset}px) rotate(90deg);
                 border: ${scrollBarBorderWidth}px solid #888;
                 margin: unset;
                 background-color: inherit;
            }
    
            #slider::-webkit-slider-thumb {
                 -webkit-appearance: none;
                 width: ${scrollBarThumbWidth}px;
                 height: ${scrollBarThumbWidth}px;
                 background-color: #888;
            }
        `;
        domParent.appendChild(styleSheet);

        this.element = document.createElement('input');
        this.element.id = "slider";
        this.element.type = "range";
        this.element.min = '0';
        this.element.value = '0';
        domParent.appendChild(this.element);

        this.element.addEventListener('input', wrap(domParent, () => {
            logger.info('slider oninput');
            handler(Math.round(Number(this.element.value)));
        }));
    }

    /**
     * @param {number} max
     */
    setMax(max) {
        window.console.assert(max > 0, `Invalid max slider value: ${max}`);
        this.element.max = String(max);
    }

    /**
     * @param {number} value
     */
    setValue(value) {
        this.element.value = String(value);
    }
}

class Footer {
    /**
     * @param {ColumnSchema[]} schemas
     */
    constructor(schemas) {
        this.footerElement = document.createElement('div');
        this.schemas = schemas;

        this.footerElement.id = 'footerRow';
        this.footerElement.style.position = 'absolute';

    }

    /**
     * @param {ColumnSchema[]} schemas
     * @returns {Footer | null}
     */
    static mayBeCreate(schemas) {
        for (const columnSchema of schemas) {
            if (columnSchema.total) {
                return new Footer(schemas)
            }
        }

        return null
    }

    /**
     * 
     * @param {HTMLElement} container 
     * @param {number} gridWidth 
     * @param {number} rowHeight 
     * @param {number} innerHeight 
     * @param {number} viewPortRowCount 
     * @param {number[]} columnEnds 
     */
    initialize(container, gridWidth, rowHeight, innerHeight, viewPortRowCount, columnEnds) {
        this.innerHeight = innerHeight;
        this.columnEnds = columnEnds;
        this.footerElement.style.width = gridWidth + 'px';
        this.footerElement.style.height = rowHeight + 'px';
        this.footerElement.style.top = ((1 + viewPortRowCount) * rowHeight) + 'px';
        container.appendChild(this.footerElement);
    }

    /**
     * @param {MatrixView} viewModel
     */
    refresh(viewModel) {
        this.footerElement.textContent = '';
        let totalTitleGenerated = false;
        for (const [colIndex, columnSchema] of this.schemas.entries()) {
            const cell = document.createElement('span');
            const style = cell.style;
            style.position = 'absolute';
            style.left = (colIndex == 0 ? 0 : this.columnEnds[colIndex - 1]) + 'px';
            style.width = columnSchema.width + 'px';
            style.height = this.innerHeight + 'px';
            style.padding = cellPadding + 'px';
            style.border = cellBorderStyle;
            style.overflow = 'hidden';
            // TODO: Move this to viewModel
            if (columnSchema.total) { //} && ['integer', 'number'].indexOf(columnSchema.type) != -1) {
                let sum = 0.;
                let count = 0;
                let countNumber = 0;
                for (let rowIndex = 0; rowIndex < viewModel.rowCount(); rowIndex++) {
                    const v = viewModel.getCell(rowIndex, colIndex);
                    count++;
                    if (typeof v == 'number') {
                        sum += v;
                        countNumber++;
                    }
                }
                let total = ((op) => {
                    switch (op) {
                        case 'avg': return countNumber == 0 ? '#DIV/0!' : sum / countNumber;
                        case 'count': return count;
                        case 'sum': return sum;
                    }
                })(columnSchema.total);
                columnSchema.converter.render(cell, total);
                cell.title = columnSchema.total + ' ' + columnSchema.title;
            } else if (!totalTitleGenerated) {
                totalTitleGenerated = true;
                cell.textContent = 'Total'
            }

            this.footerElement.appendChild(cell);
        }
    }
}


/**
 * @param {HTMLElement} container
 * @param {MatrixView} viewModel
 * @param {GridChen} gridchenElement
 * @param {TransactionManager} tm
 * @param {string} pathPrefix
 * @param {number} totalHeight height of the custom element
 */
function createGrid(container, viewModel, gridchenElement, tm, pathPrefix, totalHeight) {
    const schema = viewModel.schema;

    const schemas = schema.columnSchemas;
    const rowHeight = lineHeight + 2 * cellBorderWidth;
    const innerHeight = rowHeight - 2 * cellPadding - cellBorderWidth;
    let footer = Footer.mayBeCreate(schemas);

    let total = 0;
    const columnEnds = [];
    for (const [index, schema] of schemas.entries()) {
        total += schema.width + cellBorderWidth + 2 * cellPadding;
        columnEnds[index] = total;
    }

    // The number of DOM rows.
    let viewPortRowCount = Math.max(1, Math.floor((totalHeight) / rowHeight) - 1);
    if (footer) viewPortRowCount--;
    const viewPortHeight = rowHeight * viewPortRowCount + cellBorderWidth;
    const gridWidth = columnEnds.at(-1) + cellBorderWidth;
    const styleSheet = document.createElement('style');

    styleSheet.textContent = `
        div {
            /* Do not confuse user with HTML-Selection. We have our own. */
            user-select: none;
            /* Note that text-align is passed to the shadow dom. TODO: Reference?
               Some elements assume left-alignment, for example the slider.
            */
            text-align: left;
        }
        /* Common style to all data cell elements */
        .GRID span, a {
            position: absolute;
            border: ${cellBorderStyle};
            text-overflow: ellipsis;
            overflow: hidden;
            white-space: nowrap;
            height: ${innerHeight}px;
            padding: ${cellPadding}px;
        }
        
        /** Grid row */
        .GRID div {
            position: absolute;
            height: ${rowHeight}px;
        }
        
        .GRID {
            text-align: left;
         }
        
        a:link {
            color: var(--a-link-color);
        }
        
        a:visited {
            color: var(--a-visited-color); 
        }

        /* Important: The selectors string, non-string and error are used exclusively! */
        .string {
            text-align: left;
        }
        .non-string {
            text-align: right;
        }
        .error {
            text-align: left;
            border-color: red;
            z-index: 1;
        }
        
        @keyframes bgFadeOut {
            0% {
                background-color: red;
            }
            100% {
                background-color: transparent;
            }
        }
        
        #headerRow {
            position: absolute;
            text-align: center;
            font-weight: normal;
            background-color: ${headerRowBackgroundColor};
        }

        #info {
            color: inherit;
            background-color: inherit;
            cursor: help;
            font-size: large;
        }
        
        .GRID input, textarea {
            color: ${inputColor};
            background-color: ${inputBackgroundColor};
            position: absolute;
            height: ${innerHeight}px;
            padding: ${cellPadding}px;
            border-width: ${cellBorderWidth}px;
        }

    `;
    container.appendChild(styleSheet);

    // Only honour first columns sortDirection.
    schemas
        .filter(schema => Math.abs(schema.sortDirection) === 1)
        .slice(1).forEach(function (schema) {
            delete schema.sortDirection;
        });

    const headerRow = document.createElement('div');
    headerRow.id = 'headerRow';
    let style = headerRow.style;
    style.width = gridWidth + 'px';
    style.height = rowHeight + 'px';
    container.appendChild(headerRow);

    if (footer) footer.initialize(container, gridWidth, rowHeight, innerHeight, viewPortRowCount, columnEnds);

    /**
     * Rereads the data view content.
     */
    function refresh() {
        rowCount = viewModel.rowCount();
        // TODO: Can we do better, i.e. send event to selection.grid?
        gridAbstraction.rowCount = rowCount;
        setFirstRow(firstRow);
        scrollBar.setMax(Math.max(viewPortRowCount, rowCount - viewPortRowCount));
        if (footer) footer.refresh(viewModel);
    }

    refreshHeaders();
    makeDataLists();

    /**
     * @param {Transaction} trans
     */
    function commitTransaction(trans) {
        // Note: First refresh, then commit!
        refresh();
        trans.commit();
        // gridchenElement.dispatchEvent(new CustomEvent('change', {detail: {patch: trans.patches}}));
    }

    /**
     * For each enum restricted column with index columnIndex,
     * generate a datalist element with id enum<columnIndex>.
     */
    function makeDataLists() {
        // Note we have to loop over all columns to retain the column index.
        for (const [columnIndex, schema] of schemas.entries()) {
            if (!schema.enum) continue;
            const datalist = document.createElement('datalist');
            datalist.id = 'enum' + columnIndex;
            for (const item of schema.enum) {
                datalist.appendChild(document.createElement('option')).value = String(item);
            }
            container.appendChild(datalist)
        }
    }

    function refreshHeaders() {
        headerRow.textContent = '';
        let left = 0;
        for (const [index, columnSchema] of schemas.entries()) {
            const header = document.createElement('span');
            const style = header.style;
            style.position = 'absolute';
            style.left = left + 'px';
            style.width = columnSchema.width + 'px';
            style.height = innerHeight + 'px';
            style.padding = cellPadding + 'px';
            style.border = cellBorderStyle;
            style.overflow = 'hidden';
            header.textContent = columnSchema.title;
            header.title = columnSchema.title;
            if (columnSchema.sortDirection === 1) {
                header.textContent += ' ↑';
            } else if (columnSchema.sortDirection === -1) {
                header.textContent += ' ↓'
            }
            header.addEventListener('click', function () {
                // header.textContent = schema.title + ' ' + (header.textContent.substr(-1)==='↑'?'↓':'↑');
                if (schema.readOnly) {
                    viewModel.sort(index);
                    refresh();
                }
            });
            headerRow.appendChild(header);
            left = columnEnds[index];
        }

        const info = document.createElement('span');
        info.id = 'info';
        info.innerText = '🛈';
        style = info.style;
        style.left = left + 'px';
        style.position = 'absolute';
        info.addEventListener('click', showInfo);
        headerRow.appendChild(info);
    }

    container.style.width = (gridWidth + scrollBarWidth) + 'px';

    const body = document.createElement('div');
    body.style.position = 'absolute';
    body.style.top = rowHeight + 'px';
    body.style.width = '100%';
    body.style.height = (viewPortHeight) + 'px';
    container.appendChild(body);

    /** @type {HTMLElement} */
    let cellParent = document.createElement('div');
    cellParent.className = 'GRID';
    cellParent.style.position = 'absolute';  // Must be absolute otherwise contentEditable=true produces strange behaviour
    cellParent.style.width = gridWidth + 'px';
    cellParent.style.height = viewPortHeight + 'px';
    container.tabIndex = 0;

    const activeCell = {
        /**
         * @param {CellEditMode} mode 
         * @param {string} value 
         */
        openEditor: function (mode, value) {
            // TODO: rowIncrement should depend on scroll direction.
            scrollIntoView(selection.active.rowIndex, selection.active.rowIndex - firstRow);
            const spanStyle = getCell(selection.active).style;
            spanStyle.display = 'none';
            editor.open(mode, value, spanStyle, schemas[selection.active.columnIndex], activeCell.isReadOnly());
        },
        /**
         * @param {string} value 
         */
        enterInputMode: function (value) {
            activeCell.openEditor(edit.INPUT, value);
        },
        enterEditMode: function () {
            let value = viewModel.getCell(selection.active.rowIndex, selection.active.columnIndex);
            if (value == null) {
                value = '';
            } else {
                value = schemas[selection.active.columnIndex].converter.toEditable(value);
            }
            activeCell.openEditor(edit.EDIT, value);
        },
        isReadOnly: function () {
            return isColumnReadOnly(selection.active.columnIndex)
        }
    };

    /**
     *
     * @param {IRange} range
     * @param {boolean} show
     */
    function repaintSelection(range, show) {
        let r = range.offset(-firstRow, 0);
        let rr = r.intersect(new Range(0, 0, viewPortRowCount, colCount));
        if (!rr) return;
        for (let row = rr.rowIndex; row < rr.rowIndex + rr.rowCount; row++) {
            for (let col = rr.columnIndex; col < rr.columnIndex + rr.columnCount; col++) {
                const span = cellMatrix[row][col];
                const style = span.style;
                if (!show) {
                    style.removeProperty('background-color');
                } else {
                    style.backgroundColor = selectionBackgroundColor;
                }
            }
        }
    }

    /**
     * @param {IRange} range 
     * @returns 
     */
    function getCell(range) {
        let r = range.offset(-firstRow, 0);
        if (r.rowIndex < 0 || r.rowIndex >= cellMatrix.length) {
            // Note that active cell must not necessarily in view port.
            return undefined;
        }
        return cellMatrix[r.rowIndex][r.columnIndex];
    }

    /**
     * @param {IRange} range 
     */
    function repaintActiveCell(range) {
        const span = getCell(range);
        if (span) {
            // Note that active cell must not necessarily in view port.
            span.style.backgroundColor = activeCellBackgroundColor;
        }
    }

    cellParent.addEventListener('dblclick', () => {
        logger.info('dblclick');
        activeCell.enterEditMode()
    }
    );

    // Event order on touch devices is
    //   touchstart -> touchend -> mousedown -> mouseup
    // Because we do not have a dblclick event, our strategy is to enter input mode on mousedown if we have touched.
    let isTouching = false;

    cellParent.addEventListener('touchstart', () => {
        logger.info('touchstart');
        isTouching = true;
    });

    cellParent.addEventListener('touchend', () => {
        logger.info('touchend');
    });

    cellParent.addEventListener('mousedown', function (evt) {
        logger.info('mousedown');
        // But we do not want it to propagate as we want to avoid side effects.
        evt.stopPropagation();
        // The evt default is (A) to focus container element, and (B) start selecting text.
        // We want (A), but not (B), so we prevent defaults and focus explicitly.
        evt.preventDefault();
        // We need to prevent scroll, otherwise the evt coordinates do not relate anymore
        // with the target element coordinates. OR move this after call of index()!
        container.focus({ preventScroll: true });

        selection.startSelection(/**@type{MouseEvent}*/(evt), cellParent, indexMapper);

        if (isTouching) {
            activeCell.enterEditMode();
        }
    });

    /** @param {WheelEvent} evt */
    cellParent.addEventListener('wheel', function (evt) {
        logger.info('onmousewheel');
        if ((/** @type {DocumentOrShadowRoot} */(/** @type{Document} */(container.parentNode))).activeElement !== container) return;

        // Do not disable zoom. Both Excel and Browsers zoom on ctrl-wheel.
        if (evt.ctrlKey) return;
        evt.stopPropagation();
        evt.preventDefault();  // Prevents scrolling of any surrounding HTML element.

        window.console.assert(evt.deltaMode === evt.DOM_DELTA_LINE);
        // Excel scrolls about 3 lines per wheel tick.
        let newFirstRow = firstRow + 3 * Math.sign(evt.deltaY);
        logger.info('onmousewheel ' + newFirstRow + ' ' + rowCount);
        if (newFirstRow >= 0 && newFirstRow < rowCount) {
            setFirstRow(newFirstRow);
        }
    });

    /**
     * @param {FocusEvent} evt
     */
    container.addEventListener('blur', wrap(gridchenElement, function (evt) {
        // This is also called by UA if an alert box is shown.
        logger.info('container.blur: ' + evt);
        if (!container.contains(/** @type{HTMLElement} */(/** @type{FocusEvent} */(evt).relatedTarget))) {
            // We are leaving the component.
            selection.hide();
        }
    }));

    container.addEventListener('focus', wrap(gridchenElement, function (evt) {
        // This is also called by UA after user confirms alert box. This may induce bouncing!
        logger.info('container.focus');
        evt.stopPropagation();
        evt.preventDefault();
        selection.show();
    }));

    /** 
     * @param{number} columnIndex
     * @returns {boolean} 
     */
    function isColumnReadOnly(columnIndex) {
        const readOnly = schemas[columnIndex].readOnly;
        return readOnly === undefined ? schema.readOnly : readOnly;
    }

    function isSelectionReadOnly() {
        for (const r of selection.areas) {
            for (let colIndex = r.columnIndex; colIndex < r.columnIndex + r.columnCount; colIndex++) {
                if (isColumnReadOnly(colIndex)) return true
            }
        }
        return false
    }

    function deleteSelection() {
        if (isSelectionReadOnly()) {
            alert('Parts of the cells are locked!');
            return
        }

        const trans = tm.openTransaction(gridchenElement);
        const patch = createPatch([], pathPrefix);
        trans.patches.push(patch);
        const operations = patch.operations;

        for (const r of selection.areas) {
            let rowIndex = r.rowIndex;
            let endRowIndex = Math.min(rowCount, rowIndex + r.rowCount);
            let endColIndex = r.columnIndex + r.columnCount;

            for (; rowIndex < endRowIndex; rowIndex++) {
                for (let colIndex = r.columnIndex; colIndex < endColIndex; colIndex++) {
                    operations.push(...viewModel.setCell(rowIndex, colIndex, null, ''));
                }
            }
        }

        let rowIndex = viewModel.rowCount() - 1;
        while (rowIndex >= 0) {
            const row = viewModel.getRow(rowIndex);
            if (row.some(item => item != null)) {
                break
            }
            operations.push(...viewModel.deleteRow(rowIndex));
            rowIndex--;
        }

        if (rowIndex === -1) {
            // We can ignore this patch, because it is included in the patch from updateHolder().
            // TODO: Do we need removeModel()s patch at all? => No, but there is a unit test to that effect.
            void viewModel.removeModel();
            const patch = viewModel.updateHolder();
            if (patch.operations.length > 0) trans.patches.push(patch);
        }

        commitTransaction(trans);
    }

    function deleteRows() {
        if (schema.readOnly) {
            alert('This grid is locked!');
            return
        }

        const trans = tm.openTransaction(gridchenElement);
        const patch = createPatch([], pathPrefix);
        trans.patches.push(patch);
        const operations = patch.operations;

        for (const r of selection.areas) {
            rangeIterator(r.rowCount).forEach(function () {
                operations.push(...viewModel.deleteRow(r.rowIndex));  // Note: Always the first row
            });
        }

        commitTransaction(trans);
    }

    function insertRow() {
        if (schema.readOnly) {
            alert('This grid is locked!');
            return
        }
        const trans = tm.openTransaction(gridchenElement);
        trans.patches.push(createPatch(viewModel.splice(selection.active.rowIndex), pathPrefix));

        commitTransaction(trans);
    }

    /**
     * @param {boolean} doCut 
     */
    function copySelection(doCut) {
        window.navigator.clipboard.writeText(rangeToTSV(selection.areas[0], '\t', selection.headerSelected))
            .then(() => {
                logger.info('Text copied to clipboard');
                if (doCut) {
                    deleteSelection();
                }
            })
            .catch(err => {
                // This can happen if the user denies clipboard permissions:
                logger.error('Could not copy text: ', err);
            });
    }

    /**
     * @param {KeyboardEvent} evt 
     */
    function keyDownListener(evt) {
        logger.info('container.onkeydown ' + evt.code);

        // Note 1: All handlers call both preventDefault() and stopPropagation().
        //         The reason is documented in the handler code.
        // Note 2: For responsiveness, make sure this code is executed fast.

        if ((evt.code === 'KeyC' || evt.code === 'KeyX') && evt.ctrlKey) {
            evt.preventDefault();
            evt.stopPropagation(); // Prevent text is copied from container.
            if (selection.areas.length > 1) {
                alert('This action is not possible with multi-selections.');
                return
            }
            copySelection(evt.code === 'KeyX');
        } else if (evt.code === 'KeyV' && evt.ctrlKey) {
            evt.preventDefault();
            evt.stopPropagation(); // Prevent that text is pasted into editable container.
            const cond = pastePrecondition();
            if (cond) {
                alert(cond);
                return
            }
            window.navigator.clipboard.readText()
                .then(text => {
                    //log.log('Pasted content: ', text);
                    let matrix = tsvToMatrix(text);
                    if (matrix) {
                        paste(matrix);
                    }
                })
                .catch(err => {
                    logger.error('Failed to read clipboard contents: ', err);
                })
        } else if (evt.code === 'Delete') {
            evt.preventDefault();
            evt.stopPropagation();
            deleteSelection();
        }
        // else if (evt.code === 'F1' && evt.altKey) {
        //     // Alt + F1 creates a modal chart of the data.
        //     evt.preventDefault();
        //     evt.stopPropagation();
        //     plot();
        // } 
        else if (evt.key === '+' && evt.ctrlKey) {
            evt.preventDefault();
            evt.stopPropagation();
            insertRow();
        } else if (evt.key === '-' && evt.ctrlKey) {
            evt.preventDefault();
            evt.stopPropagation();
            deleteRows();
        } else if (evt.code === 'F2') {
            evt.preventDefault();
            evt.stopPropagation();
            activeCell.enterEditMode();
        } else if (evt.key === 'f' && evt.ctrlKey) {
            evt.preventDefault();
            evt.stopPropagation();
            find(window.prompt('Find which substring', lastSearchPattern));
        } else if (evt.key.length === 1 && !evt.ctrlKey && !evt.altKey) {
            // evt.key.length === 1 looks like a bad idea to sniff for character input, but keypress is deprecated.
            if (editor.mode === edit.HIDDEN && !activeCell.isReadOnly()) {
                // We now focus the input element. This element would receive the key as value in interactive mode, but
                // not when called as dispatchEvent() from unit tests!
                // We want to make this unit testable, so we stop the propagation and hand over the key.
                evt.preventDefault();
                evt.stopPropagation();
                activeCell.enterInputMode(evt.key);
            }
        }
    }

    let lastFoundRowIndex = -1;
    let lastSearchPattern = '';

    /**
     * @param {string} s 
     */
    function find(s) {
        lastSearchPattern = s;
        // TODO: Handle viewModel not searchable.
        const [rowIndex, columnIndex] = viewModel.search(lastFoundRowIndex + 1, s);
        if (rowIndex === -1) {
            // Next search from top.
            lastFoundRowIndex = -1;
            return
        }
        lastFoundRowIndex = rowIndex;
        setFirstRow(rowIndex);
        selection.setRange(rowIndex, columnIndex, 1, 1);
    }

    /**
     * @param {Patch} patch
     */
    function applyPatch(patch) {
        if (patch.operations.length == 0) return

        viewModel.applyJSONPatch(patch.operations);
        // TODO: What is this for?
        viewModel.updateHolder();

        let [rowIndex, columnIndex] = viewModel.pathToIndex(patch.operations[0].path);
        // console.log(patch.operations[0], rowIndex, columnIndex)
        selection.setRange(rowIndex, columnIndex, 1, 1);

        // TODO: refresh on transaction level!
        refresh();
    }

    /**
     * @param {JSONPatch} operations
     * @param {string} pathPrefix
     * @returns {Patch}
     */
    function createPatch(operations, pathPrefix) {
        class MyPatch extends Patch {
            apply() {
                applyPatch(this)
            }
        }

        const patch = new MyPatch();
        patch.operations = operations;
        patch.pathPrefix = pathPrefix;

        return patch
    }

    function showInfo() {
        let dialog = openDialog();
        const container = document.createElement('div');
        const header = document.createElement('div');
        header.appendChild(document.createTextNode('-- Press Esc to close dialog -- All Key Bindings conform to Excel Tables --'));
        container.appendChild(header);
        const grid = document.createElement('div');
        container.appendChild(grid);

        /** @type{[string[], string][]} */
        const actions = [
            [['Key'], 'Action'],
            [['Ctrl', 'Z'], 'Undo last transaction'],
            // [['Ctrl', 'Y'], 'Redo, reverse last undo'],
            [['Arrows'], 'Move active cell up/down/left/right (not in edit mode)'],
            [['Tab'], 'Move active cell right (non-rolling)'],
            [['Enter'], 'Move active cell down (non-rolling)'],
            [['Shift', 'Enter'], 'Move active cell up (non-rolling)'],
            [['Shift', 'Tab'], 'Move active cell left (non-rolling)'],
            [['SHIFT', 'Arrows'], 'Select a range of cells'],
            [['Ctrl', 'Space'], 'Select entire column'],
            [['Shift', 'Space'], 'Select entire row'],
            [['Shift', 'MouseClick'], 'Expand selection'],
            [['Ctrl', 'MouseClick'], 'Multi-select cells'],
            [['Ctrl', '-'], 'Delete selected row'],
            [['Ctrl', '+'], 'Insert row before selection'],
            [['Alt', 'Enter'], 'In edit mode, insert newline'],
            [['Page Down'], 'Move one page down'],
            [['Page Up'], 'Move one page up'],
            [['Ctrl', 'A'], 'Select all grid cells (same as Ctrl+A in a Excel List Object)'],
            [['Ctrl', 'A', 'Ctrl', 'A'], 'Select the entire grid including header (same as Ctrl+A Ctrl+A in a Excel List Object)'],
            [['ESC'], 'Cancel edit or input mode'],
            [['Delete'], 'Remove selected cells contents'],
            [['Ctrl', 'C'], 'Copy selected cells to clipboard'],
            [['Ctrl', 'V'], 'Paste clipboard into selected cells'],
            [['Ctrl', 'X'], 'Cut'],
            [['F2'], 'Enter edit mode; In input or edit mode, toggle between input and edit.'],
            [['Alt', 'F1'], 'Open a modal chart of the selection.'],
            [['Backspace'], 'In input or edit mode, deletes one character to the left'],
            [['Delete'], 'In input or edit mode, deletes one character to the right'],
            [['End'], 'In input or edit mode, move to the end of the text'],
            [['Home'], 'In input or edit mode, move to the beginning of the text']];
        for (const action of actions) {
            const key = document.createElement('span');
            // key.style.textAlign = 'right';
            let keys = action[0];
            while (keys.length) {
                let k = keys.shift();
                let kbd = document.createElement('kbd');
                kbd.textContent = k;
                key.appendChild(kbd);
                if (keys.length) {
                    key.appendChild(document.createTextNode(' + '));
                }

            }
            // key.textContent = action[0];
            grid.appendChild(key);
            const desc = document.createElement('span');
            desc.textContent = action[1];
            grid.appendChild(desc);
        }

        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'auto auto';
        grid.style.columnGap = '5px';
        dialog.appendChild(container);
    }

    // function plot() {
    //     let dialog = openDialog();
    //     dialog.style.width = '80%';

    //     /** @type{Array<number>} */
    //     const columnIndices = [];
    //     for (const r of selection.areas) {
    //         for (let count = 0; count < r.columnCount; count++) {
    //             columnIndices.push(r.columnIndex + count);
    //         }
    //     }

    //     if (columnIndices.length < 2) {
    //         dialog.textContent = `🤮 Please select 2 columns or more, you only selected column ${columnIndices[0]}`;
    //         return
    //     }

    //     /** @type{ColumnSchema[]}*/
    //     let columnSchemas = [];
    //     /** @type{number[][]}*/
    //     const columns = [];
    //     for (const columnIndex of columnIndices) {
    //         columnSchemas.push(schemas[columnIndex]);
    //         columns.push(viewModel.getColumn(columnIndex));
    //     }

    //     // Note: We completely erase dialogs content because some frameworks (plotly for example) will cache information
    //     // in the HTML element.
    //     dialog.textContent = '';
    //     const graphElement = dialog.appendChild(document.createElement('div'));
    //     /** @type {PlotEventDetail} */
    //     let detail = Object.assign({
    //         graphElement: graphElement,
    //         title: schema.title,
    //         schemas: columnSchemas,
    //         columns: columns
    //     });
    //     gridchenElement.dispatchEvent(new CustomEvent('plot', {detail: detail}));
    //     const evt = new CustomEvent('plot', {detail: detail});
    //     renderPlot(detail.graphElement, detail.title, detail.schemas, detail.columns);
    // }

    /**
     * @param {number} rowIndex 
     * @param {number} rowIncrement 
     */
    function scrollIntoView(rowIndex, rowIncrement) {
        if (firstRow === 0 && rowIncrement < 0) {
            return;
        }

        const viewRow = rowIndex - firstRow;
        if (viewRow < 0 || viewRow >= viewPortRowCount) {
            setFirstRow(Math.max(0, firstRow + rowIncrement));
        }
    }

    // Note that the slider must before the cells (we avoid using z-order)
    // so that the textarea-resize handle is in front of the slider.
    let scrollBar = new ScrollBar(body, gridWidth, viewPortHeight, setFirstRow);

    body.appendChild(cellParent);

    let colCount = schemas.length;

    let firstRow = 0;
    /** @type{number} */
    let rowCount = 0;
    const indexMapper = new IndexToPixelMapper(cellParent, rowHeight, columnEnds);

    /**
     * @param {string} value
     */
    function commitCellEdit(value) {
        logger.info('commitCellEdit');
        getCell(selection.active).style.display = 'inline-block';

        if (!activeCell.isReadOnly()) {
            const rowIndex = selection.active.rowIndex;
            const colIndex = selection.active.columnIndex;
            let parsedValue;
            if (value === '') {
                parsedValue = new ParsedValue('', null);
            } else {
                parsedValue = schemas[colIndex].converter.fromEditable(value);
            }

            const model = viewModel.getModel();
            if (!parsedValue.validation) {

            }
            const operations = viewModel.setCell(rowIndex, colIndex, parsedValue.value, parsedValue.validation);

            const trans = tm.openTransaction(gridchenElement);

            if (model !== viewModel.getModel()) {
                let patch = viewModel.updateHolder();
                if (patch.operations.length > 0) trans.patches.push(patch);
            } else {
                trans.patches.push(createPatch(operations, pathPrefix));
            }

            commitTransaction(trans);
        }

        container.focus({ preventScroll: true });
    }

    /** @type {HTMLElement[][]} */
    let cellMatrix = Array(viewPortRowCount);
    let pageIncrement = Math.max(1, viewPortRowCount);

    /**
     * @param {number} firstRow_ 
     */
    function setFirstRow(firstRow_) {
        firstRow = firstRow_;
        indexMapper.firstRow = firstRow;
        refreshHeaders();
        selection.hide();
        scrollBar.setValue(firstRow);

        updateViewportRows(getRangeData(
            new Range(firstRow, 0, viewPortRowCount, colCount)));

        selection.show();
    }

    /**
     * @param {number} vpRowIndex 
     * @param {number} colIndex 
     */
    function createCell(vpRowIndex, colIndex) {
        const schema = schemas[colIndex];
        const elem = schema.converter.createElement();

        cellMatrix[vpRowIndex][colIndex] = elem;
        let style = elem.style;
        style.top = (vpRowIndex * rowHeight) + 'px';
        style.left = (colIndex ? columnEnds[colIndex - 1] : 0) + 'px';
        style.width = schemas[colIndex].width + 'px';
        cellParent.appendChild(elem);
    }

    // Elements for row highlighting
    const animationRows = [];

    /**
     * 
     * @param {number} vpRowIndex 
     * @returns {HTMLElement}
     */
    function createRow(vpRowIndex) {
        const rowElement = document.createElement('div');
        let style = rowElement.style;
        style.top = (vpRowIndex * rowHeight) + 'px';
        style.left = '0px';
        style.width = columnEnds.at(-1) + 'px';
        cellParent.appendChild(rowElement);
        return rowElement
    }

    /**
     * @param {IRange} range
     * @returns {any[][]}
     */
    function getRangeData(range) {
        let matrix = Array(range.rowCount);
        for (let i = 0, rowIndex = range.rowIndex; rowIndex < range.rowIndex + range.rowCount; i++, rowIndex++) {
            matrix[i] = Array(range.columnCount);
            if (rowIndex >= rowCount) continue;
            for (let j = 0, colIndex = range.columnIndex; colIndex < range.columnIndex + range.columnCount; colIndex++, j++) {
                matrix[i][j] = viewModel.getCell(rowIndex, colIndex);
            }
        }
        return matrix
    }

    /**
     * TODO: Move this to matrixview.js
     * @param {IRange} r
     * @param {string} sep
     * @param {boolean} withHeaders
     * @returns {string}
     */
    function rangeToTSV(r, sep, withHeaders) {
        const rowMatrix = getRangeData(r);
        let tsvRows = Array(rowMatrix.length);
        for (const [i, row] of rowMatrix.entries()) {
            tsvRows[i] = row.map(function (value, j) {
                let schema = schemas[r.columnIndex + j];
                if (value == null) {
                    return null;
                }
                value = schema.converter.toTSV(value).trim();
                if (value.includes('\t') || value.includes('\n')) {
                    value = '"' + value + '"';
                }
                return value;
            }).join(sep);  // Note that a=[null, 3].join(',') is ',3', which is what we want.
        }
        if (withHeaders) {
            tsvRows.unshift(schemas.map(schema => schema.title).join(sep));
        }
        return tsvRows.join('\r\n')
    }

    function toTSV() {
        const range = new Range(0, 0, rowCount, colCount);
        return rangeToTSV(range, '\t', true)
    }

    /**
     * @param {number} topRowIndex
     * @param {number} topColIndex
     * @param {Array<Array<string|undefined>>} matrix
     * @returns {JSONPatch}
     */
    function pasteSingle(topRowIndex, topColIndex, matrix) {
        let rowIndex = topRowIndex;
        let endRowIndex = rowIndex + matrix.length;
        let endColIndex = Math.min(schemas.length, topColIndex + matrix[0].length);
        /** @type{JSONPatch} */
        let patch = [];

        for (let i = 0; rowIndex < endRowIndex; i++, rowIndex++) {
            let colIndex = topColIndex;

            for (let j = 0; colIndex < endColIndex; colIndex++, j++) {
                let s = matrix[i][j];
                let parsedValue = schemas[colIndex].converter.fromEditable(s.trim());
                patch.push(...viewModel.setCell(rowIndex, colIndex, parsedValue.value, parsedValue.validation));
            }
        }

        return patch;
    }

    /**
     * @returns {string}
     */
    function pastePrecondition() {
        if (selection.areas.length > 1) {
            return 'This action is not possible with multi-selections.'
        }

        if (isSelectionReadOnly()) {
            return 'Parts of the cells are locked!'
        }
        return ''
    }

    /**
     * If paste target selection is multiple of source row matrix, then tile target with source,
     * otherwise just paste source
     * @param {Array<Array<string>>} matrix
     */
    function paste(matrix) {
        const r = selection.areas[0];

        if (!matrix[0].length) {
            alert('You have nothing to paste')
        }

        const trans = tm.openTransaction(gridchenElement);
        const patch = createPatch([], pathPrefix);
        trans.patches.push(patch);
        const operations = patch.operations;

        const sourceRows = matrix.length;
        const sourceColumns = matrix[0].length;
        const targetRows = r.rowCount;
        const targetColumns = r.columnCount;
        if (targetRows % sourceRows || targetColumns % sourceColumns) {
            operations.push(...pasteSingle(r.rowIndex, r.columnIndex, matrix));
            // TODO: Reshape selection
        } else {
            // Tile target with source.
            for (let i = 0; i < Math.trunc(targetRows / sourceRows); i++) {
                for (let j = 0; j < Math.trunc(targetColumns / sourceColumns); j++) {
                    operations.push(...pasteSingle(r.rowIndex + i * sourceRows, r.columnIndex + j * sourceColumns, matrix));
                }
            }
        }

        commitTransaction(trans);
    }

    /**
     * @param {any[][]} matrix 
     */
    function updateViewportRows(matrix) {
        const now = Date.now() / 1000;
        for (let index = 0; index < viewPortRowCount; index++) {
            let elemRow = cellMatrix[index];
            const rowElement = animationRows[index];
            let row = matrix[index];
            let customStyle = viewModel.getRowStyles ? viewModel.getRowStyles()[firstRow + index] : null;

            if (customStyle && customStyle.createAt && customStyle.fadeOutDuration) {
                // Design: We use animation, not transition, because you cannot transition out (fade away)
                // a css property. To insure that the animation is restarted, we remove the animation and then re-apply
                // it AFTER (with setTimeout) this task.
                rowElement.style.removeProperty('animation-name');
                rowElement.style.removeProperty('animation-duration');
                rowElement.style.removeProperty('animation-delay');
                const remainingSeconds = (customStyle.createAt + customStyle.fadeOutDuration - now);
                if (remainingSeconds > 0) {
                    window.setTimeout(() => {
                        rowElement.style.animationName = 'bgFadeOut';
                        rowElement.style.animationDuration = remainingSeconds + 's';
                        // Always negative, meaning skip first part of animation.
                        rowElement.style.animationDelay = (customStyle.createAt - now) + 's';
                    }, 10);
                } else {
                    // Purge the expired style information.
                    viewModel.getRowStyles()[firstRow + index] = undefined;
                }
            }

            for (let colIndex = 0; colIndex < colCount; colIndex++) {
                let elem = elemRow[colIndex];
                elem.removeAttribute('class');
                let value = (row ? row[colIndex] : null);
                if (value == null) { // JavaScript hack: checks also for undefined
                    elem.textContent = '';
                    continue;
                }
                schemas[colIndex].converter.render(elem, value);
            }
        }
    }

    for (let vpRowIndex = 0; vpRowIndex < viewPortRowCount; vpRowIndex++) {
        animationRows.push(createRow(vpRowIndex));
        cellMatrix[vpRowIndex] = Array(colCount);
        for (let colIndex = 0; colIndex < colCount; colIndex++) {
            createCell(vpRowIndex, colIndex);
        }
    }

    /** @type{GridSelectionAbstraction} */
    const gridAbstraction = {
        container,
        rowCount, // Will be updated on refresh().
        colCount,
        pageIncrement,
        scrollIntoView,
        repaintActiveCell
    };
    let selection = createSelection(repaintSelection, gridAbstraction);
    selection.setRange(0, 0, 1, 1);

    container.addEventListener('selectionChanged', function () {
        logger.info('selectionChanged');
        headerRow.style.backgroundColor = selection.headerSelected ? headerRowSelectedBackgroundColor : headerRowBackgroundColor;
    });

    // Important: add in this order!
    container.addEventListener('keydown', (evt) => selection.keyDownHandler(evt));
    container.addEventListener('keydown', keyDownListener);

    const editor = edit.createEditor(cellParent, commitCellEdit, selection, lineHeight);

    firstRow = 0;
    refresh();

    /**
     * Returns the selection as a rectangle.
     */
    Object.defineProperty(gridchenElement, 'selectedRange',
        {
            get: () => ({
                rowIndex: selection.rowIndex, columnIndex: selection.columnIndex,
                rowCount: selection.rowCount, columnCount: selection.columnCount
            })
        }
    );

    /**
     * @param {IRange} range
     */
    gridchenElement.select = function (range) {
        container.focus();
        selection.setRange(range.rowIndex, range.columnIndex, range.rowCount, range.columnCount);
    };

    // TODO: Move this to matrixview module.
    gridchenElement['_toTSV'] = toTSV;

    /**
     * Hidden API for unit testing.
     * Dispatches a mousedown&mouseup event in the middle of the specified cell.
     * @param{number} rowIndex
     * @param{number} columnIndex
     */
    gridchenElement._click = function (rowIndex, columnIndex) {
        const pixelCoords = indexMapper.cellIndexToPixelCoords(rowIndex, columnIndex);
        cellParent.dispatchEvent(new MouseEvent('mousedown', pixelCoords));
        cellParent.dispatchEvent(new MouseEvent('mouseup', pixelCoords));
    };

    /***
     * @param{string} keys
     */
    gridchenElement._sendKeys = function (keys) {
        if (editor.mode !== edit.HIDDEN) {
            editor._sendKeys(keys);
        } else if (!activeCell.isReadOnly()) {
            activeCell.enterInputMode(keys);
        }
    };

    /**
     * Hidden API for unit testing.
     * Dispatches the specified keyboard event.
     * @param{string} typeArg
     * @param{KeyboardEventInit} eventInitDict
     */
    gridchenElement._keyboard = function (typeArg, eventInitDict) {
        if (editor.mode !== edit.HIDDEN) {
            editor._keyboard(typeArg, eventInitDict);
        } else {
            container.dispatchEvent(new KeyboardEvent(typeArg, eventInitDict));
        }
    };



    Object.defineProperty(gridchenElement, '_textContent',
        { get: () => cellParent.textContent, configurable: true }
    );

    gridchenElement['refresh'] = refresh;

    // TODO: Move this to MatrixView.
    gridchenElement['insertEmptyRow'] = function (rowIndex, options) {
        options = Object.assign({ fadeOutDuration: 10000 }, options || {});
        viewModel.splice(rowIndex);
        if (viewModel.getRowStyles) {
            viewModel.getRowStyles()[rowIndex] = {
                createAt: Date.now() / 1000,
                fadeOutDuration: options.fadeOutDuration
            };
        }
    };
}

/**
 * Transforms a tsv-formatted text to a matrix of strings.
 * @param {string} text
 * @returns {string[][]}
 */
export function tsvToMatrix(text) {
    let qs = [];
    if (text.includes('"')) {
        [text, qs] = normalizeQuotes(text);
    }

    let lines = text.split(/\r?\n/);
    // We always expect a line separator, so we expect at least two lines.
    // An empty clipboard is encoded as '\n', which yields [['']]
    if (lines.at(-1) === '') {
        lines.pop();
    }

    if (!lines.length) {
        // Note that this should not happen.
        return [];
    }

    let matrix = Array(lines.length);
    let minRowLength = Number.POSITIVE_INFINITY;
    let maxRowLength = Number.NEGATIVE_INFINITY;
    for (const [i, line] of lines.entries()) {
        let row = line.split('\t');
        if (qs.length) {
            row = row.map(function (cell) {
                if (cell === String.fromCharCode(0)) {
                    cell = qs.shift();
                }
                return cell;
            });
        }
        minRowLength = Math.min(minRowLength, row.length);
        maxRowLength = Math.max(maxRowLength, row.length);
        matrix[i] = row
    }

    if (minRowLength !== maxRowLength) {
        // TODO: Why? Just fill with empty values.
        alert('Pasted text must be rectangular.');
        return null;
    }

    return matrix;
}

/**
 * @param {string} text 
 * @returns {[string, string[]]}
 */
function normalizeQuotes(text) {
    text = text + '@';
    // Chrome understands s-flag: /(".*?"[^"])/s
    // Firefox does not. So we use the [\s\S] idiom instead
    const a = text.split(/("[\s\S]*?"[^"])/);
    const qs = [];
    for (let i = 1; i < a.length; i += 2) {
        let s = a[i];
        a[i] = String.fromCharCode(0) + s.at(-1);
        s = s.substring(1, s.length - 2);
        s = s.replace(/""/g, '"');
        qs.push(s);
    }

    text = a.join('');
    return [text.substring(0, text.length - 1), qs]
}

