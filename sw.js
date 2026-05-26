// ED Journey Monitor — Service Worker
// Versi cache: update angka ini setiap kali ada perubahan file
const CACHE_NAME = 'ed-monitor-v2';

const ASSETS = [
  './ed_journey_monitor_dashboard.html',
  './ed_history.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800;900&display=swap'
];

// ─── INSTALL: cache semua aset ────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache file lokal dulu, font Google bisa gagal jika offline saat install
      return cache.addAll([
        './ed_journey_monitor_dashboard.html',
        './ed_history.html',
        './ed_notifikasi.html',
        './manifest.json'
      ]).then(() => {
        // Font di-cache terpisah (opsional, tidak blocking)
        return cache.add('https://fonts.googleapis.com/css2?family=Inter:wght@500;600;700;800;900&display=swap').catch(() => {});
      });
    }).then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE: hapus cache lama ──────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── FETCH: cache-first untuk aset lokal, network-first untuk lainnya ────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Aset lokal → cache first
  if (url.origin === self.location.origin || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          // Simpan ke cache kalau response OK
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached); // fallback ke cache kalau offline
      })
    );
    return;
  }

  // Request lain → jalankan normal
  event.respondWith(fetch(event.request).catch(() => new Response('Offline', { status: 503 })));
});
