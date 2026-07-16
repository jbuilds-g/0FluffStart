const CACHE_NAME = "0fluff-v36";

const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./core.css",
  "./state.js",
  "./utilities.js",
  "./ui-logic.js",
  "./icon.png",
];

// 1. INSTALL: Cache new files and forcefully skip the waiting phase
self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }),
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

// 3. FETCH: Serve from the clean, active cache
self.addEventListener("fetch", (event) => {
  if (!event.request.url.startsWith("http")) return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    }),
  );
});
