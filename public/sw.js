// Placeholder service worker for EasyBiz PWA shell.
// Caches and offline queueing will be added in later stages.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Intentionally a no-op for now. Future iterations will cache shell assets
  // and queue writes while offline.
});
