const pItemRegex = /:(P[0-9]+_[A-Z0-9_]+)/gim;

/**
 * Regex catches :P1_ITEM, :P2_ITEM, etc. and replaces them with their values by calling apex.item(pItemName).getValue()
 *
 * @param str Any string that could contain page item references like :P1_ITEM
 * @returns {string} String with page item references replaced with their values
 */
export default function evalPageItems(str: string) {
  const result = str.replace(pItemRegex, (_m, pageItemName) => {
    if (!(pageItemName in window.apex.items)) {
      window.apex.debug.warn(
        `[evalPageItems]: Page Item "${pageItemName}" not found on page`,
      );
      return 'null';
    }

    let value = window.apex.item(pageItemName).getValue();
    if (value === null || value === undefined || value === '') {
      value = 'null';
    }
    window.apex.debug.trace(`[evalPageItems]: ${pageItemName} = "${value}"`);

    return value;
  });

  return result;
}
