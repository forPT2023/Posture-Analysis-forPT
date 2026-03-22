// Service Worker - Posture Analysis PWA (完全オフライン対応版)
const CACHE_NAME = 'posture-analysis-v13.13.3-offline';

const urlsToCache = [
    '/',
    '/index.html',
    '/css/style.css',
    '/css/camera-guide.css',
    '/css/image-crop.css',        // ✨ 追加（不足分）
    '/js/main.js',
    '/js/camera-guide.js',
    '/js/landmark-editor.js',
    '/js/image-crop.js',           // ✨ 追加（不足分）
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/apple-touch-icon.png',
    // ✨ ローカルライブラリ（オフライン対応）
    '/libs/mediapipe/pose.js',
    '/libs/mediapipe/camera_utils.js',
    '/libs/mediapipe/drawing_utils.js',
    '/libs/html2canvas.min.js',
    '/libs/jspdf.umd.min.js',
];

// インストール時
self.addEventListener('install', (event) => {
    console.log('✅ Service Worker: インストール中...');
    self.skipWaiting(); // 即座にアクティブ化
    
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('✅ Service Worker: キャッシュ作成');
            return cache.addAll(urlsToCache);
        })
    );
});

// アクティベート時
self.addEventListener('activate', (event) => {
    console.log('✅ Service Worker: アクティベート中...');
    event.waitUntil(
        clients.claim().then(() => {
            return caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('🗑️ 古いキャッシュ削除:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            });
        })
    );
});

// フェッチ時
self.addEventListener('fetch', (event) => {
    event.respondWith(
        (async () => {
            const url = new URL(event.request.url);
            
            // 外部CDN（MediaPipe等）は常にネットワーク優先
            if (url.origin !== self.location.origin) {
                try {
                    const response = await fetch(event.request);
                    return response;
                } catch (error) {
                    console.log('🌐 外部リソース取得失敗（オフライン）:', url.href);
                    return new Response('オフライン: 外部リソースを取得できません', { status: 503 });
                }
            }
            
            // 自サイトのリソース: Cache First戦略
            try {
                // まずキャッシュを確認
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) {
                    console.log('💾 キャッシュから取得:', url.pathname);
                    
                    // バックグラウンドでキャッシュを更新
                    fetch(event.request).then(response => {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseClone);
                        });
                    }).catch(() => {
                        // ネットワークエラーは無視（キャッシュを使用中）
                    });
                    
                    return cachedResponse;
                }
                
                // キャッシュにない場合はネットワークから取得
                console.log('🌐 ネットワークから取得:', url.pathname);
                const response = await fetch(event.request);
                
                // 成功したらキャッシュに保存
                const responseClone = response.clone();
                const cache = await caches.open(CACHE_NAME);
                cache.put(event.request, responseClone);
                
                return response;
            } catch (error) {
                // ネットワークもキャッシュも失敗
                console.log('❌ 取得失敗（オフライン）:', url.pathname);
                
                // HTMLリクエストの場合はオフラインページを返す
                if (event.request.destination === 'document') {
                    return caches.match('/index.html');
                }
                
                return new Response('オフラインです', { status: 503 });
            }
        })()
    );
});

// オンライン/オフライン状態の監視
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// バックグラウンド同期（将来の拡張用）
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        console.log('🔄 バックグラウンド同期開始');
        // 将来的にデータ同期機能を追加可能
    }
});

console.log('🎉 Service Worker v13.13.3-offline 読み込み完了（完全オフライン対応）');
