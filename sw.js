// rome-ignore lint/correctness/noUnusedVariables: <explanation>
const swHooks = {
  /*
  FUNCTION_VARIABLE_DECLARATION: ({ apex })                         => { console.log('FUNCTION_VARIABLE_DECLARATION', { apex }); },
  EVENT_INSTALL:                 ({ apex, event })                  => { console.log('EVENT_INSTALL', { apex, event }); },
  EVENT_INSTALL_BEFORE:          ({ apex, event })                  => { console.log('EVENT_INSTALL_BEFORE', { apex, event }); },
  EVENT_INSTALL_AFTER:           ({ apex, event })                  => { console.log('EVENT_INSTALL_AFTER', { apex, event }); },
  EVENT_ACTIVATE:                ({ apex, event })                  => { console.log('EVENT_ACTIVATE', { apex, event }); },
  EVENT_ACTIVATE_BEFORE:         ({ apex, event })                  => { console.log('EVENT_ACTIVATE_BEFORE', { apex, event }); },
  EVENT_ACTIVATE_AFTER:          ({ apex, event })                  => { console.log('EVENT_ACTIVATE_AFTER', { apex, event }); },
  */
  EVENT_FETCH: ({ apex, event }) => {
    //console.log('EVENT_FETCH', { apex, event });
    event.respondWith(fetchSW({ apex, event }));
  },
  /*
  EVENT_FETCH_BEFORE:            ({ apex, event })                  => { console.log('EVENT_FETCH_BEFORE', { apex, event }); },
  EVENT_FETCH_CACHE_DEFINITION:  ({ apex, event, cacheName })       => { console.log('EVENT_FETCH_CACHE_DEFINITION', { apex, event, cacheName }); },
  EVENT_FETCH_CACHE_RESPONSE:    ({ apex, event, cache, response }) => { console.log('EVENT_FETCH_CACHE_RESPONSE', { apex, event, cache, response }); },
  EVENT_FETCH_NETWORK_RESP_SUC:  ({ apex, event, response })        => { console.log('EVENT_FETCH_NETWORK_RESP_SUC', { apex, event, response }); },
  EVENT_FETCH_NETWORK_RESP_ERR:  ({ apex, event, error })           => { console.log('EVENT_FETCH_NETWORK_RESP_ERR', { apex, event, error }); },
  EVENT_FETCH_OFFLINE_PAGE:      ({ apex, event, offlinePage })     => { console.log('EVENT_FETCH_OFFLINE_PAGE', { apex, event, offlinePage }); },
  EVENT_FETCH_NETWORK_FALLBACK:  ({ apex, event })                  => { console.log('EVENT_FETCH_NETWORK_FALLBACK', { apex, event }); },
  EVENT_SYNC:                    ({ apex, event })                  => { console.log('EVENT_SYNC', { apex, event }); },
  EVENT_PUSH:                    ({ apex, event })                  => { console.log('EVENT_PUSH', { apex, event }); },
  EVENT_NOTIFICATIONCLICK:       ({ apex, event })                  => { console.log('EVENT_NOTIFICATIONCLICK', { apex, event }); },
  EVENT_NOTIFICATIONCLOSE:       ({ apex, event })                  => { console.log('EVENT_NOTIFICATIONCLOSE', { apex, event }); },
  EVENT_CANMAKEPAYMENT:          ({ apex, event })                  => { console.log('EVENT_CANMAKEPAYMENT', { apex, event }); },
  EVENT_PAYMENTREQUEST:          ({ apex, event })                  => { console.log('EVENT_PAYMENTREQUEST', { apex, event }); },
  */
};

/**
 * @function fetchSW
 * Intercepts resources, caches resources, serves resources
 **/
async function fetchSW({ apex, event }) {
  let cacheName;

  if (
    event.request?.url &&
    event.request.url.indexOf(apex.sw.CORE_CACHE_MATCHER) >= 0
  ) {
    cacheName = apex.sw.CORE_CACHE_NAME;
  } else if (
    event.request?.url &&
    event.request.url.indexOf(apex.sw.APP_CACHE_MATCHER) >= 0
  ) {
    const fileVersion = event.request.url
      .split(apex.sw.APP_CACHE_MATCHER)
      .pop()
      .split('/')[0];
    cacheName = apex.sw.APP_CACHE_PREFIX + fileVersion;
    apex.sw.cleanAppCaches(cacheName);
  } else if (event?.request?.url?.indexOf('/files/plugin/') >= 0) {
    cacheName = 'page-plugin-cache';
    apex.sw.cleanAppCaches(cacheName);
  }

  /*
  if (!cacheName) {
    console.log('no cacheName for', event?.request?.url, event);
  }
  */

  // "Cache Definition" hook starts

  // "Cache Definition" hook ends

  let cache;

  // Try to get from the cache first
  if (cacheName) {
    cache = await caches.open(cacheName);
    const response = await cache.match(event.request);

    // "Cache Response" hook starts

    // "Cache Response" hook ends

    if (response) {
      return response;
    }
  }

  // Then get from network
  try {
    const response = await fetch(event.request);

    // "Network Response Success" hook starts

    // "Network Response Success" hook ends

    // Clone response to put in cache
    if (response.ok && cacheName) {
      try {
        const resClone = response.clone();
        cache.put(event.request, resClone);
      } catch (error) {
        console.warn(error);
      }
    }

    // Return ressource from network
    return response;
  } catch (_error) {
    // console.log(`fetch error for ${event.request.url}`, error, event.request);

    // "Network Response Error" hook starts

    // "Network Response Error" hook ends

    // console.log('request mode', event?.request?.mode);

    if (event.request.mode === 'navigate' && 1 === 2) {
      // console.log('request mode is navigate');
      const offlinePage = 'APEX.PWA.OFFLINE';

      // "Offline Page" hook starts

      // "Offline Page" hook ends

      return new Response(offlinePage, {
        headers: { 'Content-Type': 'text/html' },
      });
    } else {
      const cacheResponse = await caches.match(event.request, {
        ignoreSearch: true,
      });
      if (cacheResponse) {
        console.log(`cacheResponse found for ${event.request.url}`);
        return cacheResponse;
      } else {
        console.log(`no chacheResponse found for ${event.request.url}`);
        return new Response();
      }

      // "Network Fallback" hook starts

      // "Network Fallback" hook ends
    }
  }
}
