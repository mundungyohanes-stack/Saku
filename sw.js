const CACHE_NAME = "saku-cache-v19";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const isSameOrigin = event.request.url.startsWith(self.location.origin);

      const networkFetch = fetch(event.request)
        .then((response) => {
          if (isSameOrigin && response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);

      // Semua request (app-shell sendiri maupun aset eksternal): network-first,
      // biar update HTML/JS langsung kepakai tanpa perlu naikkan versi
      // CACHE_NAME manual. Kalau offline, baru fallback ke cache.
      return networkFetch;
    })
  );
});
