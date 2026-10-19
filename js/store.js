/*
 * Saves and loads your albums and ratings in this browser's storage
 * (localStorage), so each device keeps its own ratings. Use Export backup /
 * Import on the Albums page to move them between devices.
 *
 * Album shape:
 *   { id, source, sourceId, title, artist, year, genre, cover, review?,
 *     tracks: [{ title, duration, sourceId, rating?, dateRated?, tags?, review? }] }
 */

const STORAGE_KEY = "songRatings.albums";

/* Every other script reads from ALBUMS. */
const ALBUMS = [];

function loadAlbums() {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  if (Array.isArray(saved)) ALBUMS.push(...saved);
  // Ask the browser not to clear our storage when space runs low.
  navigator.storage?.persist?.().catch(() => {});
}

const storeReady = Promise.resolve().then(loadAlbums).catch((err) => {
  console.error("Could not load ratings:", err);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showStorageWarning);
  } else {
    showStorageWarning();
  }
  throw err;
});

/* Runs a page's setup once the page has loaded and the ratings are in. */
function whenReady(setup) {
  document.addEventListener("DOMContentLoaded", () => {
    storeReady.then(setup, () => {});
  });
}

function showStorageWarning() {
  const banner = document.createElement("div");
  banner.className = "storage-warning";
  banner.innerHTML = `
    <strong>Can't load your ratings.</strong>
    This browser is blocking site storage (private browsing or blocked
    cookies/site data). Allow it for this site, then reload.`;
  document.body.prepend(banner);
}

/* Async so callers don't change if storage moves somewhere slower later. */
async function saveAlbums() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ALBUMS));
  } catch (err) {
    throw new Error(`This browser wouldn't save your ratings (${err.name}).`);
  }
}

/* Adds the album if it's new. Returns the stored copy (keeps existing ratings). */
async function upsertAlbum(album) {
  const existing = ALBUMS.find((a) => a.id === album.id);
  if (existing) return existing;
  ALBUMS.push(album);
  await saveAlbums();
  return album;
}

async function removeAlbum(albumId) {
  const index = ALBUMS.findIndex((a) => a.id === albumId);
  if (index !== -1) {
    ALBUMS.splice(index, 1);
    await saveAlbums();
  }
}

async function rateTrack(albumId, trackNumber, { rating, review, tags }) {
  const track = ALBUMS.find((a) => a.id === albumId).tracks[trackNumber - 1];
  track.rating = rating;
  track.review = review;
  track.tags = tags;
  track.dateRated = new Date().toISOString().slice(0, 10);
  await saveAlbums();
}

async function clearTrackRating(albumId, trackNumber) {
  const track = ALBUMS.find((a) => a.id === albumId).tracks[trackNumber - 1];
  delete track.rating;
  delete track.review;
  delete track.tags;
  delete track.dateRated;
  await saveAlbums();
}

function exportAlbums() {
  const blob = new Blob([JSON.stringify(ALBUMS, null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `song-ratings-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

/* Replaces all saved data with the contents of a previously exported file. */
async function importAlbums(file) {
  const data = JSON.parse(await file.text());
  if (!Array.isArray(data)) throw new Error("File is not a Song Ratings export.");
  ALBUMS.splice(0, ALBUMS.length, ...data);
  await saveAlbums();
}
