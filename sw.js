const CACHE_NAME = '0fluff-v17';

const ASSETS = [
    './',
    './index.html',
    './manifest.json'
    './core.css',
    './0flufThemes.css',
    './modules.css',
    './settings.css',
    './state.js',
    './utilities.js',
    './ui-logic.js',
    './icon.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (event) => {
    if (!event.request.url.startsWith('http')) return;
    
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
