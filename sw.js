/*
 * Service worker: makes the site installable, instant, and usable offline.
 *
 * - Site files (HTML/CSS/JS/icons): served straight from the cache, so
 *   switching pages doesn't wait on the Pi. The pre-commit hook changes
 *   CACHE_VERSION on every commit; when the browser sees the new sw.js it
 *   downloads a fresh copy of SITE_FILES and drops the old cache.
 * - Album artwork from Apple's servers: cache first, since covers never change.
 * - iTunes search (direct, or through the Pi's /itunes/ proxy) is never
 *   cached; searching needs a connection.
 *
 * Add new or renamed files to SITE_FILES.
 */

const CACHE_VERSION = "1792493423";
const SITE_CACHE = `site-${CACHE_VERSION}`;
const ART_CACHE = "artwork";
const MAX_ARTWORK = 300;
const ITUNES_PROXY_PATH = new URL("itunes/", self.registration.scope).pathname;

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
  "js/nav.js",
  "js/pages/home.js",
  "js/pages/albums.js",
  "js/pages/album.js",
  "js/pages/song.js",
  "js/pages/add.js",
  "assets/icon.svg",
  "assets/icons/favicon.ico",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/icons/icon-maskable-512.png",
  "assets/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SITE_CACHE)
      // "reload" skips the browser's HTTP cache so the new version is fetched.
      .then((cache) => cache.addAll(SITE_FILES.map((url) => new Request(url, { cache: "reload" }))))
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
    if (url.pathname.startsWith(ITUNES_PROXY_PATH)) return;
    event.respondWith(siteFile(request));
  } else if (request.destination === "image" && url.hostname.endsWith(".mzstatic.com")) {
    event.respondWith(cacheFirst(request));
  }
});

async function siteFile(request) {
  const cache = await caches.open(SITE_CACHE);
  // Pages read everything from the query string in JS, so album.html?id=x
  // is served from the cached album.html.
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) cache.put(stripQuery(request), response.clone());
  return response;
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
