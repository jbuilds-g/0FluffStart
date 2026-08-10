const CACHE_NAME = "0fluff-v92";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./pwa-manifest.json",
  "./core.css",
  "./main.js",
  "./store.js",
  "./utils.js",
  "./storage.js",
  "./links.js",
  "./ui.js",
  "./suggestions.js",
  "./material-you-engine.js",
  "./icon.png",
];

// Listen for immediate update activation messages from active clients
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// 1. INSTALL: Cache new files, then skip waiting once caching succeeds
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

// 2. ACTIVATE: Nuke the old caches and immediately take control
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            // If the cache name doesn't match our current version, delete it
            if (cache !== CACHE_NAME) {
              console.log("Service Worker: Purging old cache ->", cache);
              return caches.delete(cache);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// 3. FETCH: Hybrid Strategy (Network-First for Core Assets, Stale-While-Revalidate for Others)
self.addEventListener("fetch", (event) => {
  if (!event.request.url.startsWith("http")) return;

  const requestUrl = new URL(event.request.url);
  const isCoreAsset = ASSETS.some((asset) => {
    const assetUrl = new URL(asset, self.location.origin);
    return assetUrl.pathname === requestUrl.pathname;
  });

  if (isCoreAsset) {
    // Network-First Strategy for Core Application Assets
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === "basic"
          ) {
            const responseToCache = networkResponse.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request)),
    );
  } else {
    // Stale-While-Revalidate Strategy for Non-Core Requests
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              networkResponse.type === "basic"
            ) {
              const responseToCache = networkResponse.clone();
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(event.request, responseToCache));
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      }),
    );
  }
});
