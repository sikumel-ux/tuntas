const CACHE_NAME = 'tuntas-admin-v1';
const ASSETS_TO_CACHE = [
  '/a/index.html',
  '/a/admin.css',
  '/a/admin.js',
  '/a/logo.png',
  '/a/depan.png'
];

// Install Service Worker & Cache Aset Utama
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching aset PWA...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Aktivasi & Hapus Cache Lama jika ada update
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Menghapus cache PWA lama...');
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Strategi Fetch: Network First, Fallback to Cache (Agar Data Realtime Firebase selalu utama)
self.addEventListener('fetch', event => {
  // Lewati request database Firebase agar tidak dicache statis
  if (event.request.url.includes('firebasedatabase.app')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
