const CACHE_NAME = 'insinerator-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/admin.html',
    '/css/style.css',
    '/js/main.js',
    '/js/firebase-config.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});
