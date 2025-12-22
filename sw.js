// Service Worker Removed
// This script ensures any existing service worker is unregistered
self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', () => {
    self.registration.unregister();
});
