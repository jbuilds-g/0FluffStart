const CACHE_NAME = "0fluffstart-cache-v1.7.0";

const CORE_APP_SHELL = [
  "./",
  "./index.html",
  "./pwa-manifest.json",
  "./icon.png",

  "./css/core.css",
  "./css/base.css",
  "./css/cursor.css",
  "./css/layout.css",
  "./css/links.css",
  "./css/mobile.css",
  "./css/modal.css",
  "./css/search.css",
  "./css/themes.css",
  "./css/utilities.css",
  "./css/variables.css",

  "./js/main.js",
  "./js/store.js",
  "./js/ui.js",
  "./js/search.js",
  "./js/suggestions.js",
  "./js/links.js",
  "./js/storage.js",
  "./js/restore-point.js",
  "./js/cursor.js",
  "./js/material-you-engine.js",
  "./js/utils.js",
  "./js/version.js",
];

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
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

self.addEventListener("fetch", (event) => {
  if (!event.request.url.startsWith("http")) return;

  const requestUrl = new URL(event.request.url);
  const isCoreAsset = CORE_APP_SHELL.some((asset) => {
    const assetUrl = new URL(asset, self.location.origin);
    return assetUrl.pathname === requestUrl.pathname;
  });

  if (isCoreAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request);
      }),
    );
  }
});
