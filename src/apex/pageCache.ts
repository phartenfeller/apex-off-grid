export async function cachePageByUrl(url: string ) {
  const response = await fetch(url);

  // if valid response
  if (!response.ok) {
    window.apex.debug.warn('fetch to cache page error', response);
  }
  // open page cache
  const cache = await caches.open('page-plugin-cache');
  // check if url is existing
  const cacheResponse = await cache.match(url, { ignoreSearch: true });
  // if page existing in cache
  if (cacheResponse) {
    // delete old cache page
    await cache.delete(url, { ignoreSearch: true });
  }
  await cache.put(url, response);
  window.apex.debug.info('cached', url);
}

export async function cacheCurrentPage() {
  const url = window.location.href;
  await cachePageByUrl(url);
}

/**
 * Does unfortunately not work with new page syntax. It will be cached under the previous syntax and will not match when the page is called with the new syntax.
 * @param pageIds  Array of page ids to cache
 */
export async function cachAppPagesOldSyntax(pageIds: number[]) {
  const url = window.location.href;

  // check if /ords/ is in url
  if (!url.includes('/ords/')) {
    window.apex.debug.warn('Did not find /ords/ in url, skipping cache page');
    return;
  }

  // get part of url till /ords/
  const baseUrl = url.split('/ords/')[0];
  const session = window.apex.env.APP_SESSION;
  const appId = window.apex.env.APP_ID;

  if (!session || !appId) {
    window.apex.debug.warn('No session or appId found, skipping cache page');
    return;
  }

  const urls = pageIds.map((pageId) => {
    return `${baseUrl}/ords/f?p=${appId}:${pageId}:${session}::NO::`;
  });

  // split urls into chunks of 3
  const chunkSize = 3;
  const urlChunks = [];
  for (let i = 0; i < urls.length; i += chunkSize) {
    urlChunks.push(urls.slice(i, i + chunkSize));
  }

  // cache pages parallel by chunks
  for (const chunk of urlChunks) {
    await Promise.all(chunk.map((url) => cachePageByUrl(url)));
  };
}


/**
 * Fetches APEX pages by page URL name and caches them so the service worker can serve them when offline.
 * @param pageNames Array of page names to cache
 */
export async function cachAppPages(pageNames: string[]) {
  const url = window.location.href;
  const split = url.split('/');

  // check if /ords/ is in url
  if (split[3] !== 'ords') {
    window.apex.debug.warn('Did not find /ords/ in url, skipping cache page', split);
    return;
  } else if (split.length !== 8) {
    window.apex.debug.warn('Url does not have 8 parts, skipping cache page', split);
    return;
  }

  const session = window.apex.env.APP_SESSION;

  if (!session) {
    window.apex.debug.warn('No session found, skipping cache page');
    return;
  }

  const urls = pageNames.map((pName) => {
    const splitCpy = [...split];
    splitCpy[7] = `${pName}?session=${session}`;
    return splitCpy.join('/');
  });

  // split urls into chunks of 3
  const chunkSize = 3;
  const urlChunks = [];
  for (let i = 0; i < urls.length; i += chunkSize) {
    urlChunks.push(urls.slice(i, i + chunkSize));
  }

  // cache pages parallel by chunks
  for (const chunk of urlChunks) {
    await Promise.all(chunk.map((url) => cachePageByUrl(url)));
  };
}
