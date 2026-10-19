/*
 * Reusable UI pieces. Header and footer are injected on every page so
 * navigation only has to be edited in one place.
 */

const SITE_NAME = "Song Ratings";

const NAV_LINKS = [
  { href: "index.html", label: "Home" },
  { href: "albums.html", label: "Albums" },
  { href: "about.html", label: "About" },
];

function renderHeader() {
  const current = window.location.pathname.split("/").pop() || "index.html";
  const links = NAV_LINKS.map(
    (link) =>
      `<a href="${link.href}" class="nav-link${
        link.href === current ? " active" : ""
      }">${link.label}</a>`
  ).join("");

  document.getElementById("site-header").innerHTML = `
    <div class="container header-inner">
      <a href="index.html" class="logo">
        <span class="logo-mark">♪</span>
        <span class="logo-text">${SITE_NAME}</span>
      </a>
      <nav class="nav">
        ${links}
        <a href="add.html" class="button button-primary nav-add${
          current === "add.html" ? " active" : ""
        }">+ Add new</a>
      </nav>
    </div>`;
}

function renderFooter() {
  const rated = allSongs().filter(isRated).length;
  document.getElementById("site-footer").innerHTML = `
    <div class="container footer-inner">
      <span>© ${new Date().getFullYear()} ${SITE_NAME}</span>
      <span>${ALBUMS.length} albums · ${rated} songs rated</span>
    </div>`;
}

function coverHTML(album, size = "md") {
  if (album.cover) {
    return `<img class="cover cover-${size}" src="${escapeHTML(album.cover)}"
              alt="Cover art for ${escapeHTML(album.title)}" loading="lazy">`;
  }
  const hue = hueFromString(album.title + album.artist);
  return `<div class="cover cover-${size} cover-placeholder"
              style="--hue:${hue}" aria-hidden="true">
            <span>${escapeHTML(album.title.charAt(0))}</span>
          </div>`;
}

/* Pass null for unrated. */
function ratingBadgeHTML(rating, size = "md") {
  const label = rating == null ? "–" : formatRating(rating);
  const title = rating == null ? ' title="Not rated yet"' : "";
  return `<span class="rating-badge rating-${size} tier-${ratingTier(rating)}"${title}>${label}</span>`;
}

function progressHTML(ratedCount, trackCount) {
  const pct = trackCount ? Math.round((ratedCount / trackCount) * 100) : 0;
  return `
    <div class="progress" title="${ratedCount} of ${trackCount} tracks rated">
      <div class="progress-bar"><span style="width:${pct}%"></span></div>
      <span class="progress-label">${ratedCount}/${trackCount} rated</span>
    </div>`;
}

function albumCardHTML(album) {
  const stats = albumStats(album);
  return `
    <a class="album-card" href="${albumURL(album.id)}">
      ${coverHTML(album)}
      <div class="album-card-body">
        <h3 class="album-title">${escapeHTML(album.title)}</h3>
        <p class="album-artist">${escapeHTML(album.artist)}</p>
        ${progressHTML(stats.ratedCount, stats.trackCount)}
      </div>
      ${ratingBadgeHTML(stats.average)}
    </a>`;
}

/* One line of an album's tracklist. */
function trackRowHTML(album, track, number) {
  return `
    <a class="track-row${isRated(track) ? "" : " unrated"}" href="${songURL(album.id, number)}">
      <span class="track-number">${number}</span>
      <span class="track-title">${escapeHTML(track.title)}</span>
      <span class="track-duration">${escapeHTML(track.duration || "")}</span>
      ${ratingBadgeHTML(isRated(track) ? track.rating : null, "sm")}
    </a>`;
}

/* A song from allSongs() in a ranked list (e.g. Top Rated). */
function songRowHTML(song, rank) {
  return `
    <a class="song-row" href="${songURL(song.album.id, song.number)}">
      <span class="song-rank">${rank}</span>
      ${coverHTML(song.album, "sm")}
      <div class="song-row-body">
        <span class="song-title">${escapeHTML(song.title)}</span>
        <span class="song-artist">${escapeHTML(song.album.artist)}</span>
      </div>
      ${ratingBadgeHTML(song.rating, "sm")}
    </a>`;
}

document.addEventListener("DOMContentLoaded", renderHeader);
whenReady(renderFooter);
