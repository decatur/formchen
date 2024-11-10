/**
 * Author: Wolfgang Kühn 2019-2024
 * Source located at https://github.com/decatur/formchen
 *
 * Module implementing edit and display (for read-only cells) capabilities for cell values.
 */

/** @import { Selection, CellEditMode } from "../private-types" */

import { logger } from "../utils.js";

export const HIDDEN = /** @type{CellEditMode.HIDDEN} */ ('hidden');
export const INPUT = /** @type{CellEditMode.INPUT} */ ('input');
export const EDIT = /** @type{CellEditMode.EDIT} */ ('edit');

/**
 * @param {HTMLElement} container
 * @param {function} commitCellEdit
 * @param {Selection} selection
 * @param {number} lineHeight
 * @returns {Editor}
 */
export function createEditor(container, commitCellEdit, selection, lineHeight) {
    /** @type{CellEditMode} */
    let currentMode = HIDDEN;
    let currentSchema = undefined;
    /** @type{boolean} */
    let currentReadOnly;

    /** @type{HTMLInputElement} */
    const input = document.createElement('input');
    input.id = 'editor';
    input.style.display = 'none';

    /** @type{HTMLTextAreaElement} */
    const textarea = document.createElement('textarea');
    textarea.id = 'textarea';
    textarea.style.display = 'none';

    input.addEventListener('keydown', keydownHandler);
    textarea.addEventListener('keydown', keydownHandler);

    // Clicking editor should invoke default: move the caret. It should not delegate to ancestors.
    input.addEventListener('mousedown', (evt) => evt.stopPropagation());
    textarea.addEventListener('mousedown', (evt) => evt.stopPropagation());

    container.appendChild(input);
    container.appendChild(textarea);

    function hide() {
        currentMode = HIDDEN;
        setValue('');
        if (input.style.display !== 'none') {
            input.style.display = 'none';
        } else {
            textarea.style.display = 'none';
        }
    }

    function commit() {
        const value = getValue().trim();
        // Very nasty side effect: We need first to hide editor, then call commitCellEdit().
        // The reason is duplicate commits involving JavaScript breakpoints in commitCellEdit() and
        // then triggering blurHandler when pressing the resume button.
        hide();
        commitCellEdit(value);
    }

    /**
     * @param {string} top 
     * @param {string} left 
     * @param {string} width 
     */
    function showInput(top, left, width) {
        const style = input.style;
        style.top = top;
        style.left = left;
        style.width = (parseInt(width) + lineHeight) + 'px';  // Account for the resize handle, which is about 20px
        //style.height = innerHeight;
        if (currentSchema.enum) {
            input.setAttribute('list', 'enum' + selection.active.columnIndex);
        } else {
            input.removeAttribute('list');
        }

        if (currentSchema.type === 'number') {
            input.setAttribute('type', 'number');
        } else if (currentSchema.type === 'integer') {
            input.setAttribute('type', 'number');
            input.setAttribute('step', '1');
        } else {
            input.removeAttribute('type');
        }

        input.readOnly = currentReadOnly;  // Must not use disabled!

        style.display = 'inline-block';
        // focus on input element, which will then receive this keyboard event.
        // Note: focus after display!
        // Note: It is ok to scroll on focus here.
        input.focus();
        input.addEventListener('blur', blurHandler);
    }

    function showTextArea() {
        const style = input.style;
        style.display = 'none';
        input.removeEventListener('blur', blurHandler);
        textarea.style.left = style.left;
        textarea.style.top = style.top;
        textarea.style.width = style.width;
        textarea.style.display = 'inline-block';

        textarea.readOnly = currentReadOnly;  // Must not use disabled!

        textarea.value = input.value;
        textarea.focus();
        textarea.addEventListener('blur', blurHandler);
    }

    /**
     * @param {string} value
     */
    function setValue(value) {
        if (input.style.display !== 'none') {
            input.dataset.undoValue = input.value = value;
            if (value.includes('\n')) {
                showTextArea();
                textarea.value = value;
            }
        } else {
            textarea.value = value;
        }
    }

    function getValue() {
        if (input.style.display !== 'none') {
            return input.value;
        } else {
            return textarea.value;
        }
    }

    /**
     * @param {KeyboardEvent} evt
     */
    function keydownHandler(evt) {
        logger.info('editor.onkeydown: ' + evt.code);
        if (!(evt.target instanceof HTMLElement)) return
        // Clicking editor should invoke default: move caret. It should not delegate to containers action.
        //evt.stopPropagation();
        //console.log(`keydownHandler ${evt.target.tagName}`)

        if (evt.code === 'ArrowLeft' && currentMode === INPUT) {
            evt.preventDefault();
            evt.stopPropagation();
            commit();
            selection.move(0, -1);
        } else if (evt.code === 'ArrowRight' && currentMode === INPUT) {
            evt.preventDefault();
            evt.stopPropagation();
            commit();
            selection.move(0, 1);
        } else if (evt.code === 'ArrowUp' && currentMode === INPUT) {
            evt.preventDefault();
            evt.stopPropagation();
            commit();
            selection.move(-1, 0);
        } else if (evt.code === 'ArrowDown' && currentMode === INPUT) {
            evt.preventDefault();
            evt.stopPropagation();
            commit();
            selection.move(1, 0);
        } else if (['Enter', 'NumpadEnter'].includes(evt.code) && evt.altKey) {
            evt.preventDefault();
            evt.stopPropagation();
            if (input.style.display !== 'none') {
                showTextArea();
                textarea.value += '\n';
            } else {
                textarea.setRangeText('\n', textarea.selectionStart, textarea.selectionEnd, 'end');
            }
        } else if (['Enter', 'NumpadEnter'].includes(evt.code)) {
            evt.preventDefault();
            evt.stopPropagation();
            commit();
            selection.move(evt.shiftKey ? -1 : 1, 0);
        } else if (evt.code === 'Tab') {
            evt.preventDefault();
            evt.stopPropagation();
            commit();
            selection.move(0, evt.shiftKey ? -1 : 1);
        } else if (evt.code === 'Escape') {
            // Leave edit mode.
            evt.preventDefault();
            evt.stopPropagation();
            commit();
        } else if (evt.key === 'z' && evt.ctrlKey) {
            evt.preventDefault();
            if (input.value != input.dataset.undoValue) {
                input.dataset.redoValue = input.value;
                input.value = input.dataset.undoValue;
                evt.stopPropagation();
            }
        } else if (evt.key === 'y' && evt.ctrlKey) {
            evt.preventDefault();
            if (input.dataset.redoValue) {
                input.value = input.dataset.redoValue;
                delete input.dataset.redoValue;
                evt.stopPropagation();
            }
        }
    }

    function blurHandler(evt) {
        logger.info('editor.onblur');
        if (currentMode !== HIDDEN) {
            commit();
        }

        if (!container.contains(evt.relatedTarget)) {
            container.blur();
            selection.hide();
        }
    }

    /**
     * Stateless and closed class pattern.
     */
    class Editor {
        constructor() {
        }

        /** @returns {CellEditMode} */
        get mode() {
            return currentMode
        }

        /**
         * @param {CellEditMode} mode
         * @param value
         * @param {CSSStyleDeclaration} spanStyle
         * @param {object} schema
         * @param {boolean} readOnly
         */
        open(mode, value, spanStyle, schema, readOnly) {
            currentMode = mode;
            currentSchema = schema;
            currentReadOnly = readOnly;
            showInput(spanStyle.top, spanStyle.left, spanStyle.width);
            setValue(value);
        }


        _keyboard(typeArg, eventInitDict) {
            let targetElem;
            if (input.style.display !== 'none') {
                targetElem = input;
            } else if (textarea.style.display !== 'none') {
                targetElem = textarea;
            } else {
                throw Error('Event send to editor but editor does not show.');
            }
            targetElem.dispatchEvent(new KeyboardEvent(typeArg, eventInitDict));
        }

        /**
         * @param {string} keys 
         */
        _sendKeys(keys) {
            if (input.style.display !== 'none') {
                input.value += keys;
            } else if (textarea.style.display !== 'none') {
                textarea.value += keys;
            } else {
                throw Error('Send keys to editor but editor does not show.');
            }
        }
    }

    return new Editor();
}