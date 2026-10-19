/*
 * Music catalog lookups using Apple's free iTunes Search API (no key needed).
 * Docs: https://performance-partners.apple.com/search-api
 *
 * Requests use JSONP (a <script> tag with a callback) so they work even when
 * the site is opened straight from disk, where normal fetch() is blocked.
 */

const ITUNES_BASE = "https://itunes.apple.com";
let jsonpCounter = 0;

function jsonp(url, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const callbackName = `__itunesCallback${jsonpCounter++}`;
    const script = document.createElement("script");

    const cleanup = () => {
      delete window[callbackName];
      script.remove();
      clearTimeout(timer);
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("The music catalog took too long to respond."));
    }, timeoutMs);

    window[callbackName] = (data) => {
      cleanup();
      resolve(data);
    };
    script.onerror = () => {
      cleanup();
      reject(new Error("Could not reach the music catalog. Check your connection."));
    };
    script.src = `${url}&callback=${callbackName}`;
    document.head.appendChild(script);
  });
}

function largeArtwork(url) {
  return url ? url.replace(/\/\d+x\d+bb\./, "/600x600bb.") : "";
}

function formatDuration(ms) {
  if (!ms) return "";
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

/* Search songs by any mix of title / artist / album. */
async function searchSongs(term) {
  const url = `${ITUNES_BASE}/search?media=music&entity=song&limit=25&term=${encodeURIComponent(term)}`;
  const data = await jsonp(url);
  return data.results
    .filter((r) => r.wrapperType === "track" && r.collectionId)
    .map((r) => ({
      trackId: r.trackId,
      albumSourceId: r.collectionId,
      title: r.trackName,
      artist: r.artistName,
      album: r.collectionName,
      year: (r.releaseDate || "").slice(0, 4),
      cover: largeArtwork(r.artworkUrl100),
      duration: formatDuration(r.trackTimeMillis),
    }));
}

/* Full album with its complete tracklist, in the shape used by store.js. */
async function fetchAlbum(collectionId) {
  const url = `${ITUNES_BASE}/lookup?entity=song&limit=200&id=${collectionId}`;
  const data = await jsonp(url);
  const info = data.results.find((r) => r.wrapperType === "collection");
  if (!info) throw new Error("Album not found in the catalog.");

  const tracks = data.results
    .filter((r) => r.wrapperType === "track")
    .sort((a, b) => a.discNumber - b.discNumber || a.trackNumber - b.trackNumber)
    .map((r) => ({
      title: r.trackName,
      duration: formatDuration(r.trackTimeMillis),
      sourceId: r.trackId,
    }));

  return {
    id: `itunes-${info.collectionId}`,
    source: "itunes",
    sourceId: info.collectionId,
    title: info.collectionName,
    artist: info.artistName,
    year: Number((info.releaseDate || "").slice(0, 4)) || "",
    genre: info.primaryGenreName || "",
    cover: largeArtwork(info.artworkUrl100),
    tracks,
  };
}
