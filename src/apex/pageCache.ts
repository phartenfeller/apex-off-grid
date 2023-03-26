async function cachePage(apex: any) {
  const url = window.location.href;
  const response = await fetch(url);

  // if valid response
  if (!response.ok) {
    apex.debug.warn('fetch to cache page error', response);
  }
  // open page cache
  const cache = await caches.open('page-plugin-cache');
  // check if url is existing
  const cacheResponse = await cache.match(url, { ignoreSearch: true });
  // if page existing in cache
  if (cacheResponse) {
    // recache after 30 mins
    if (
      Date.now() >
      Date.parse(cacheResponse.headers.get('date')) + 1000 * 60 * 30
    ) {
      // remove old entry
      await cache.delete(url, { ignoreSearch: true });
    } else {
      // if not expired, return
      return;
    }
  }
  await cache.put(url, response);
  apex.debug.info('cached', url);
}

export default cachePage;
