const CACHE_NAME = 'smart-class-pro-v2.2-cache';

// File lokal utama yang wajib di-cache saat pertama kali diinstal
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    // Tambahkan nama file icon logo di bawah ini jika ada di folder lokal
    // './icon-192x192.png',
    // './icon-512x512.png'
];

// Event Install: Menyimpan file statis ke dalam cache
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[Service Worker] Caching Static Assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
});

// Event Activate: Membersihkan cache versi lama jika ada pembaruan aplikasi
self.addEventListener('activate', event => {
    self.clients.claim();
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Menghapus cache lama:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// Event Fetch: Strategi "Cache First, fall back to Network" dengan "Dynamic Caching"
self.addEventListener('fetch', event => {
    // Abaikan request yang bukan GET (seperti POST, PUT)
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            // 1. Jika ada di cache, langsung gunakan cache (sangat cepat & bisa offline)
            if (cachedResponse) {
                return cachedResponse;
            }

            // 2. Jika tidak ada di cache, ambil dari internet (Network)
            return fetch(event.request).then(networkResponse => {
                // Pastikan responsnya valid
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors' && networkResponse.type !== 'opaque') {
                    return networkResponse;
                }

                // 3. Simpan library CDN/eksternal ke dalam cache secara dinamis agar bisa offline nanti
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    // Hindari caching request dari chrome-extension atau skema yang tidak didukung
                    if (event.request.url.startsWith('http')) {
                        cache.put(event.request, responseToCache);
                    }
                });

                return networkResponse;
            }).catch(error => {
                console.log('[Service Worker] Fetch gagal, mode offline aktif.', error);
                // Jika offline dan me-request HTML, kembalikan ke index.html
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
