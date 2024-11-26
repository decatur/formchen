/** @import { JSONPatchOperation } from "./types.js" */

/**
 * Applies a JSON Patch operation.
 * @param {{'':object}} holder
 * @param {JSONPatchOperation} operation
 */
export function applyJSONPatchOperation(holder, operation) {
    const op = operation.op;
    const path = operation.path.split('/');
  
    while (path.length > 1) {
      holder = holder[path.shift()];
    }
    const index = path[0];
  
    if (op === 'replace') {
      holder[index] = operation.value;
    } else if (op === 'add') {
      if (Array.isArray(holder)) {
        (/**@type{object[]}*/(holder)).splice(parseInt(index), 0, operation.value);
      } else {
        holder[index] = operation.value;
      }
    } else if (op === 'remove') {
      if (Array.isArray(holder)) {
        (/**@type{object[]}*/(holder)).splice(parseInt(index), 1);
      } else {
        delete holder[index];
      }
    }
  }