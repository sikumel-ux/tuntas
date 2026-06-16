const CACHE_NAME = 'tuntas-warga-v1';
const ASSETS_TO_CACHE = [
  'index.html',
  'users.css',
  'users.js',
  'logo.png',
  'default.png'
];

// Tahap Install: Membuat Cache aset utama
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Menyimpan aset static ke cache...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Tahap Aktivasi: Membersihkan cache lama jika ada update
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Menghapus cache lama...');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Strategi Fetch: Ambil dari jaringan dulu, kalau offline ambil dari cache (Network First)
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
