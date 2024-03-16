const pItemRegex = /:(P[0-9]+_[A-Z0-9_]+)/gim;

/**
 * Regex catches :P1_ITEM, :P2_ITEM, etc. and replaces them with their values by calling apex.item(pItemName).getValue()
 *
 * @param str Any string that could contain page item references like :P1_ITEM
 * @returns {string} String with page item references replaced with their values
 */
export default function evalPageItems(str: string) {
  let m;
  let cpy = str;

  // rome-ignore lint/suspicious/noAssignInExpressions: <explanation>
  while ((m = pItemRegex.exec(cpy)) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (m.index === pItemRegex.lastIndex) {
      pItemRegex.lastIndex++;
    }

    const match = m[0];
    const pItemName = m[1];

    const value = window.apex.item(pItemName).getValue();
    window.apex.debug.trace(`_getRows: Replacing ${match} with "${value}"`);
    if (value === null || value === undefined || value === '') {
      cpy = cpy.replace(match, 'null');
      return;
    }
    cpy = cpy.replace(match, value);
  }

  return cpy;
}
