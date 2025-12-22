
// SERVICE WORKER DISABLED
// This script unregisters any existing service workers to prevent 404 caching issues.
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