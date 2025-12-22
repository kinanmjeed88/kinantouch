
// PWA DISABLED
// This script forces the service worker to unregister itself if it still exists on a client.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', () => {
  self.registration.unregister()
    .then(() => {
      return self.clients.matchAll();
    })
    .then((clients) => {
      clients.forEach(client => client.navigate(client.url));
    });
});
