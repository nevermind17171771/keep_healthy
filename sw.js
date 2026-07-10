// Workout Tracker — Service Worker
// 전략: index.html은 네트워크 우선(항상 최신), 실패 시에만 캐시(오프라인 대응)

const CACHE_NAME = 'workout-v2';  // 배포할 때마다 버전 올리면 강제 갱신됨
const ASSETS = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
];

// 설치: 핵심 파일 캐싱 + 즉시 활성화
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

// 활성화: 오래된 캐시 전부 삭제
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 요청 처리:
// - HTML(네비게이션): 네트워크 우선 → 최신 버전 즉시 반영, 오프라인이면 캐시
// - 그 외(CDN 등): 캐시 우선 → 속도
self.addEventListener('fetch', e => {
  const isHTML = e.request.mode === 'navigate' ||
    (e.request.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(cached =>
        cached || fetch(e.request).then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, copy));
          return res;
        })
      )
    );
  }
});
