// Service Worker with Expiry Date
const CACHE_NAME = 'posture-analysis-v13.10.1';
const EXPIRY_DATE = new Date('2035-12-31T23:59:59').getTime(); // ← 有効期限（10年先）

const urlsToCache = [
    '/',
    '/index.html',
    '/css/style.css',
    '/css/camera-guide.css',
    '/js/main.js',
    '/js/camera-guide.js',
    '/js/landmark-editor.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/apple-touch-icon.png',
    // 外部CDNは常にオンライン取得（最新版を使用）
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

// フェッチ時（有効期限チェック）
self.addEventListener('fetch', (event) => {
    event.respondWith(
        (async () => {
            const now = new Date().getTime();
            
            // 有効期限チェック（デバッグ情報付き）
            console.log('⏰ 有効期限チェック:', {
                現在時刻: new Date(now).toLocaleString('ja-JP'),
                有効期限: new Date(EXPIRY_DATE).toLocaleString('ja-JP'),
                状態: now > EXPIRY_DATE ? '期限切れ' : '有効'
            });
            
            if (now > EXPIRY_DATE) {
                console.error('❌ 有効期限切れ: キャッシュを削除');
                
                // すべてのキャッシュを削除
                await caches.delete(CACHE_NAME);
                
                // エラーページを返す
                return new Response(
                    `<!DOCTYPE html>
                    <html lang="ja">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>有効期限切れ</title>
                        <style>
                            body {
                                font-family: sans-serif;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                min-height: 100vh;
                                margin: 0;
                                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            }
                            .container {
                                background: white;
                                padding: 40px;
                                border-radius: 20px;
                                text-align: center;
                                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                                max-width: 500px;
                            }
                            h1 { color: #F44336; margin-bottom: 20px; }
                            p { color: #666; line-height: 1.6; }
                            .emoji { font-size: 4rem; margin-bottom: 20px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="emoji">⏰</div>
                            <h1>有効期限が切れました</h1>
                            <p>このアプリの提供期間は終了しました。</p>
                            <p style="font-size: 0.9rem; color: #999; margin-top: 30px;">
                                有効期限: ${new Date(EXPIRY_DATE).toLocaleDateString('ja-JP')}
                            </p>
                        </div>
                    </body>
                    </html>`,
                    {
                        headers: { 'Content-Type': 'text/html; charset=utf-8' }
                    }
                );
            }
            
            // 有効期限内の場合は通常の動作
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

console.log('🎉 Service Worker v13.10.0 読み込み完了');
