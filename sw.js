const CACHE_NAME = "0fluff-v66";

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

// 3. FETCH: Network-First with Cache-Bypass Fallback for Core Assets
self.addEventListener("fetch", (event) => {
  if (!event.request.url.startsWith("http")) return;

  // Force cache-bypassing fetch for CSS and JS files to prevent layout/logic decoupling
  const isCoreAsset = event.request.url.match(/\.(js|css)$/i);

  event.respondWith(
    fetch(event.request, isCoreAsset ? { cache: "reload" } : {})
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
});
