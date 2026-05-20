const CACHE_NAME = 'checkin-app-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/pages/checkin.html',
  '/pages/stars.html',
  '/pages/rank.html',
  '/pages/mine.html',
  '/pages/css/style.css',
  '/pages/js/app.js',
  '/manifest.json'
];

// 安装：缓存所有静态资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 激活：清除旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 请求：缓存优先，网络回退
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // 离线且无缓存时返回首页
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
    })
  );
});
