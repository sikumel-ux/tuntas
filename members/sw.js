const CACHE_NAME = 'tuntas-cache-v1';
const assetsToCache = [
  './',
  './index.html',
  './script.js',
  './manifest.json',
  './logo-192.png',
  './logo-512.png'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('PWA: Mengarsipkan aset ke dalam cache...');
      return cache.addAll(assetsToCache);
    })
  );
});

// Aktifkan Service Worker & bersihkan cache lama
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('PWA: Menghapus cache lama...');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Fetch data dari cache jika offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    }).catch(() => {
      // Opsi fallback jika koneksi internet mati total dan aset tidak ada di cache
    })
  );
});
