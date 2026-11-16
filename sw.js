
const CACHE_NAME = "skawad-ai-v2";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./chat.html",
    "./pengumuman.html",
    "./style.css",
    "./data.js",
    "./knowledge.js",
    "./chatbot.js",
    "./akademik.html",
    "./tahun2.html",
    "./bm-tahun2.html",
    "./manifest.json",
    "./icons/icon-192.png",
    "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(FILES_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name.startsWith("skawad-ai-") && name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;
    // Only explicitly public files receive offline handling. Never cache admin.html.
    const publicURLs = FILES_TO_CACHE.map(path => new URL(path, self.location.href).href);
    if (!publicURLs.includes(event.request.url)) return;

    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.open(CACHE_NAME).then(cache => cache.match(event.request));
        })
    );
});
