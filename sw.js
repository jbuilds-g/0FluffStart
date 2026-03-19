// sw.js - v1.3.2 PWA Cache

const CACHE_NAME = '0fluff-cache-v1.3.2';
const ASSETS = [
    './',
    './index.html',
    './core.css',
    './0flufThemes.css',
    './modules.css',
    './settings.css',
    './state.js',
    './utilities.js',
    './ui-logic.js',
    './icon.png'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (e) => {
    // Exclude external API calls (like search suggestions) from the offline cache
    if (!e.request.url.startsWith('http')) return;
    
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request))
    );
});
