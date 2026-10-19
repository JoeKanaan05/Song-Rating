/*
 * Service worker: makes the site installable and usable offline.
 *
 * - Site files (HTML/CSS/JS/icons): network first, so edits show up straight
 *   away; falls back to the cached copy when offline or the server is down.
 * - Album artwork from Apple's servers: cache first, since covers never change.
 * - iTunes search requests aren't touched; searching needs a connection.
 *
 * Bump CACHE_VERSION when you add or rename files in SITE_FILES.
 */

const CACHE_VERSION = "v1";
const SITE_CACHE = `site-${CACHE_VERSION}`;
const ART_CACHE = "artwork";
const MAX_ARTWORK = 300;
const NETWORK_TIMEOUT_MS = 3000;

const SITE_FILES = [
  "./",
  "index.html",
  "albums.html",
  "album.html",
  "song.html",
  "add.html",
  "about.html",
  "manifest.webmanifest",
  "css/base.css",
  "css/layout.css",
  "css/components.css",
  "js/store.js",
  "js/api.js",
  "js/utils.js",
  "js/components.js",
  "js/pages/home.js",
  "js/pages/albums.js",
  "js/pages/album.js",
  "js/pages/song.js",
  "js/pages/add.js",
  "assets/favicon.svg",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SITE_CACHE).then((cache) => cache.addAll(SITE_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SITE_CACHE && key !== ART_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
  } else if (request.destination === "image" && url.hostname.endsWith(".mzstatic.com")) {
    event.respondWith(cacheFirst(request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(SITE_CACHE);
  try {
    const response = await withTimeout(fetch(request), NETWORK_TIMEOUT_MS);
    if (response.ok) cache.put(stripQuery(request), response.clone());
    return response;
  } catch (err) {
    // Pages read everything from the query string in JS, so album.html?id=x
    // can be served from the cached album.html.
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(ART_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    await cache.put(request, response.clone());
    trimCache(cache, MAX_ARTWORK);
  }
  return response;
}

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
}

function stripQuery(request) {
  const url = new URL(request.url);
  url.search = "";
  return url.href;
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Network timeout")), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}
