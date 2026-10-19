/*
 * Saves and loads your albums and ratings through the local server
 * (server.py), which writes them to data/ratings.json.
 *
 * Album shape:
 *   { id, source, sourceId, title, artist, year, genre, cover, review?,
 *     tracks: [{ title, duration, sourceId, rating?, dateRated?, tags?, review? }] }
 */

const API_URL = "/api/albums";
const LEGACY_STORAGE_KEY = "songRatings.albums";

/* Filled in once the server responds; every other script reads from ALBUMS. */
const ALBUMS = [];

async function loadAlbums() {
  if (window.location.protocol === "file:") {
    throw new Error("The site was opened as a file.");
  }
  const response = await fetch(API_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`Server error ${response.status}`);
  ALBUMS.push(...(await response.json()));
  await migrateFromLocalStorage();
}

/* One-time move of ratings saved by the older browser-storage version. */
async function migrateFromLocalStorage() {
  let legacy;
  try {
    legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
  } catch {
    return;
  }
  if (!Array.isArray(legacy) || !legacy.length) return;

  legacy
    .filter((album) => !ALBUMS.some((a) => a.id === album.id))
    .forEach((album) => ALBUMS.push(album));
  await saveAlbums();
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

const storeReady = loadAlbums().catch((err) => {
  console.error("Could not load ratings:", err);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showServerWarning);
  } else {
    showServerWarning();
  }
  throw err;
});

/* Runs a page's setup once the page has loaded and the ratings are in. */
function whenReady(setup) {
  document.addEventListener("DOMContentLoaded", () => {
    storeReady.then(setup, () => {});
  });
}

function showServerWarning() {
  const banner = document.createElement("div");
  banner.className = "server-warning";
  banner.innerHTML = `
    <strong>Can't reach your ratings.</strong>
    Start the server from the project folder with
    <code>python3 server.py</code>, then open
    <a href="http://localhost:8000">http://localhost:8000</a>.`;
  document.body.prepend(banner);
}

async function saveAlbums() {
  const response = await fetch(API_URL, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ALBUMS),
  });
  if (!response.ok) {
    const { error } = await response.json().catch(() => ({}));
    throw new Error(error || `Save failed (server error ${response.status})`);
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
