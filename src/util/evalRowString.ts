import { DbRow } from '../worker/db/types';

const pColRegex = /#[A-Z0-9_]+#/gim;

/**
 * Regex catches #COL_NAME# and replaces them with their values by of the passed row object
 *
 * @param rowStr String that could contain references to cols in the row object
 * @param row rowObject
 * @returns {string} String with page item references replaced with their values
 */
export default function evalRowString(rowStr: string, row: DbRow) {
  if (typeof row !== 'object') {
    throw new Error('[evalRowString]: Row must be an object');
  }

  window.apex.debug.trace('[evalRowString]:', { rowStr, row });

  const result = rowStr.replace(pColRegex, (match) => {
    const colName = match.toUpperCase().replace(/#/g, '');

    if (colName in row) {
      return row[colName].toString();
    } else {
      window.apex.debug.warn(
        `[evalRowString]: Column "${colName}" not found in row object`,
      );
      return match;
    }
  });

  window.apex.debug.trace('[evalRowString] res:', result);

  return result;
}
