/* Small helpers shared by every page. */

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

function formatDate(isoDate) {
  const date = new Date(isoDate + "T00:00:00");
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatRating(rating) {
  return Number(rating).toFixed(1);
}

function isRated(track) {
  return typeof track.rating === "number";
}

/* Maps a rating to a tier used for colour-coding (see .tier-* in components.css). */
function ratingTier(rating) {
  if (rating == null) return "none";
  if (rating >= 9) return "great";
  if (rating >= 7) return "good";
  if (rating >= 5) return "okay";
  return "bad";
}

function averageRating(tracks) {
  const rated = tracks.filter(isRated);
  if (!rated.length) return null;
  return rated.reduce((sum, t) => sum + t.rating, 0) / rated.length;
}

/* Album helpers */

function findAlbum(id) {
  return ALBUMS.find((a) => a.id === id);
}

function albumStats(album) {
  const rated = album.tracks.filter(isRated);
  const lastRated = rated
    .map((t) => t.dateRated || "")
    .sort()
    .pop();
  return {
    average: averageRating(album.tracks),
    ratedCount: rated.length,
    trackCount: album.tracks.length,
    lastRated: lastRated || "",
  };
}

function songURL(albumId, trackNumber) {
  return `song.html?album=${encodeURIComponent(albumId)}&track=${trackNumber}`;
}

function albumURL(albumId) {
  return `album.html?id=${encodeURIComponent(albumId)}`;
}

/* Every track from every album, each with its album and track number attached. */
function allSongs() {
  return ALBUMS.flatMap((album) =>
    album.tracks.map((track, i) => ({ ...track, album, number: i + 1 }))
  );
}

const ALBUM_SORTERS = {
  recent: (a, b) => albumStats(b).lastRated.localeCompare(albumStats(a).lastRated),
  "rating-desc": (a, b) => (albumStats(b).average ?? -1) - (albumStats(a).average ?? -1),
  "rating-asc": (a, b) => (albumStats(a).average ?? 11) - (albumStats(b).average ?? 11),
  "title-asc": (a, b) => a.title.localeCompare(b.title),
  "artist-asc": (a, b) => a.artist.localeCompare(b.artist),
  "year-desc": (a, b) => b.year - a.year,
};

function sortAlbums(albums, sortKey) {
  return [...albums].sort(ALBUM_SORTERS[sortKey] || ALBUM_SORTERS.recent);
}

/* Deterministic hue from a string, used for placeholder covers. */
function hueFromString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) % 360;
  }
  return hash;
}
