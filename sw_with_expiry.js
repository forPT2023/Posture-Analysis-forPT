// This file is deprecated and replaced by sw.js
// Please use /sw.js instead
console.log('⚠️ sw_with_expiry.js is deprecated. Redirecting to sw.js...');

// Unregister this old service worker
self.addEventListener('install', () => {
    console.log('🗑️ Old Service Worker detected. Unregistering...');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('🔄 Activating cleanup...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName.includes('posture-analysis')) {
                        console.log('🗑️ Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('✅ Please reload the page to use the new Service Worker at /sw.js');
            // 新しいService Workerを登録するよう促す
            return self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SW_DEPRECATED',
                        message: 'このService Workerは廃止されました。新しいバージョン（/sw.js）を使用してください。ページを再読み込みしてください。'
                    });
                });
            });
        })
    );
});

// Fetch requests are redirected to network
self.addEventListener('fetch', (event) => {
    event.respondWith(fetch(event.request));
});
