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
    // delete old cache page
    await cache.delete(url, { ignoreSearch: true });
  }
  await cache.put(url, response);
  apex.debug.info('cached', url);
}

export default cachePage;
