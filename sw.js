const CACHE_NAME = "saku-cache-v32";
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

  // Navigasi halaman: network-first, fallback ke index.html cache (full offline, tanpa file tambahan)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match("./index.html");
          return cachedPage || caches.match("./");
        })
    );
    return;
  }

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
