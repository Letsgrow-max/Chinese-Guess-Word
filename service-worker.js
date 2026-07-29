const CACHE_NAME = 'guess-word-cache-v2'; // Updated to v2
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json'
];

// Install Event - Cache assets and force update
self.addEventListener('install', event => {
    self.skipWaiting(); // Forces the waiting service worker to become the active service worker.
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Opened cache v2');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Activate Event - Clean up old caches and take control
self.addEventListener('activate', event => {
    event.waitUntil(clients.claim()); // Take control of all open pages immediately
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch Event - Network First for levels, Cache First for everything else
self.addEventListener('fetch', event => {
    // We want levels.json to ALWAYS pull the freshest data if online, so users get new levels immediately.
    if (event.request.url.includes('levels.json')) {
        event.respondWith(
            fetch(event.request)
                .then(networkResponse => {
                    // Optionally cache the new levels.json for offline use
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                })
                .catch(() => {
                    // If offline, fallback to cached levels
                    return caches.match(event.request);
                })
        );
    } else {
        // Standard cache-first strategy for UI files (HTML, CSS, JS)
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request);
            })
        );
    }
});
