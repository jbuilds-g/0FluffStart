const CACHE_NAME = "0fluffstart-cache-v1.4.6";

const CORE_APP_SHELL = [
  "./",
  "./index.html",
  "./pwa-manifest.json",
  "./css/core.css",
  "./css/modal.css",
  "./css/search.css",
  "./js/main.js",
  "./icon.png",
];

// Listen for immediate update activation messages from active clients
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// 1. INSTALL: Cache minimal App Shell, then skip waiting
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_APP_SHELL))
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

// 3. FETCH: Network-First for App Shell, Stale-While-Revalidate + Dynamic Cache for All Other Assets
self.addEventListener("fetch", (event) => {
  if (!event.request.url.startsWith("http")) return;

  const requestUrl = new URL(event.request.url);
  const isCoreAsset = CORE_APP_SHELL.some((asset) => {
    const assetUrl = new URL(asset, self.location.origin);
    return assetUrl.pathname === requestUrl.pathname;
  });

  if (isCoreAsset) {
    // Network-First Strategy for App Shell
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
    // Stale-While-Revalidate Strategy for Dynamic JS Modules, CSS, and SVG Assets
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (
              networkResponse &&
              networkResponse.status === 200 &&
              (networkResponse.type === "basic" ||
                networkResponse.type === "cors")
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
