/*
 * Reusable UI pieces. The sidebar and footer are injected on every page so
 * navigation only has to be edited in one place. The sidebar's behaviour
 * (theme toggle, phone menu, search sheet) is in js/ui.js.
 */

const SITE_NAME = "Song Ratings";

/* The pages: a list in the desktop sidebar, a tab bar on phones. */
const NAV_LINKS = [
  { href: "index.html", label: "Home", tab: "Home", icon: '<path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z"/>' },
  { href: "albums.html", label: "Albums", tab: "Albums", icon: '<rect x="3" y="7" width="14" height="14" rx="2.5"/><path d="M7 3.5h11a2.5 2.5 0 0 1 2.5 2.5v11"/>' },
  { href: "add.html", label: "Add new", tab: "Add", icon: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>' },
  { href: "about.html", label: "About", tab: "About", icon: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.01"/>' },
];

/* Which page a URL belongs to: album and song pages live under Albums. */
function sectionFor(pathname) {
  const page = pathname.split("/").pop() || "index.html";
  return page === "album.html" || page === "song.html" ? "albums.html" : page;
}

/* Marks a page as current (the current page by default): the pill in the
   sidebar, and the tab with the lens behind it on phones. */
function setActiveNav(current = sectionFor(window.location.pathname)) {
  document.querySelectorAll(".nav-link, .tab").forEach((link) => {
    const active = link.getAttribute("href") === current;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  const capsule = document.querySelector(".tab-capsule");
  if (capsule) {
    const index = NAV_LINKS.findIndex((link) => link.href === current);
    capsule.classList.toggle("no-active", index === -1);
    if (index !== -1) capsule.style.setProperty("--tab-index", index);
  }
}

/* Icons from the Notes site (Quartz search, darkmode and explorer). */
const SEARCH_ICON = `
  <svg role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19.9 19.7" aria-hidden="true">
    <g class="search-path" fill="none">
      <path stroke-linecap="square" d="M18.5 18.3l-5.4-5.4"/>
      <circle cx="8" cy="8" r="7"/>
    </g>
  </svg>`;

const SUN_ICON = `
  <svg class="dayIcon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 35 35" aria-hidden="true">
    <path d="M6,17.5C6,16.672,5.328,16,4.5,16h-3C0.672,16,0,16.672,0,17.5S0.672,19,1.5,19h3C5.328,19,6,18.328,6,17.5z M7.5,26c-0.414,0-0.789,0.168-1.061,0.439l-2,2C4.168,28.711,4,29.086,4,29.5C4,30.328,4.671,31,5.5,31c0.414,0,0.789-0.168,1.06-0.44l2-2C8.832,28.289,9,27.914,9,27.5C9,26.672,8.329,26,7.5,26z M17.5,6C18.329,6,19,5.328,19,4.5v-3C19,0.672,18.329,0,17.5,0S16,0.672,16,1.5v3C16,5.328,16.671,6,17.5,6z M27.5,9c0.414,0,0.789-0.168,1.06-0.439l2-2C30.832,6.289,31,5.914,31,5.5C31,4.672,30.329,4,29.5,4c-0.414,0-0.789,0.168-1.061,0.44l-2,2C26.168,6.711,26,7.086,26,7.5C26,8.328,26.671,9,27.5,9z M6.439,8.561C6.711,8.832,7.086,9,7.5,9C8.328,9,9,8.328,9,7.5c0-0.414-0.168-0.789-0.439-1.061l-2-2C6.289,4.168,5.914,4,5.5,4C4.672,4,4,4.672,4,5.5c0,0.414,0.168,0.789,0.439,1.06L6.439,8.561z M33.5,16h-3c-0.828,0-1.5,0.672-1.5,1.5s0.672,1.5,1.5,1.5h3c0.828,0,1.5-0.672,1.5-1.5S34.328,16,33.5,16z M28.561,26.439C28.289,26.168,27.914,26,27.5,26c-0.828,0-1.5,0.672-1.5,1.5c0,0.414,0.168,0.789,0.439,1.06l2,2C28.711,30.832,29.086,31,29.5,31c0.828,0,1.5-0.672,1.5-1.5c0-0.414-0.168-0.789-0.439-1.061L28.561,26.439z M17.5,29c-0.829,0-1.5,0.672-1.5,1.5v3c0,0.828,0.671,1.5,1.5,1.5s1.5-0.672,1.5-1.5v-3C19,29.672,18.329,29,17.5,29z M17.5,7C11.71,7,7,11.71,7,17.5S11.71,28,17.5,28S28,23.29,28,17.5S23.29,7,17.5,7z M17.5,25c-4.136,0-7.5-3.364-7.5-7.5c0-4.136,3.364-7.5,7.5-7.5c4.136,0,7.5,3.364,7.5,7.5C25,21.636,21.636,25,17.5,25z"/>
  </svg>`;

const MOON_ICON = `
  <svg class="nightIcon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true">
    <path d="M96.76,66.458c-0.853-0.852-2.15-1.064-3.23-0.534c-6.063,2.991-12.858,4.571-19.655,4.571C62.022,70.495,50.88,65.88,42.5,57.5C29.043,44.043,25.658,23.536,34.076,6.47c0.532-1.08,0.318-2.379-0.534-3.23c-0.851-0.852-2.15-1.064-3.23-0.534c-4.918,2.427-9.375,5.619-13.246,9.491c-9.447,9.447-14.65,22.008-14.65,35.369c0,13.36,5.203,25.921,14.65,35.368s22.008,14.65,35.368,14.65c13.361,0,25.921-5.203,35.369-14.65c3.872-3.871,7.064-8.328,9.491-13.246C97.826,68.608,97.611,67.309,96.76,66.458z"/>
  </svg>`;

/* The sidebar: title · [search pill][theme] · page list. On phones only the
   theme button stays (top right of the page) and the tab bar takes over:
   the pages in a glass capsule, plus a round search button. */
function renderHeader() {
  const links = NAV_LINKS.map(
    (link) => `<li><a href="${link.href}" class="nav-link">${link.label}</a></li>`
  ).join("");

  const tabs = NAV_LINKS.map(
    (link) => `
      <a href="${link.href}" class="tab">
        <svg viewBox="0 0 24 24" aria-hidden="true">${link.icon}</svg>
        <span>${link.tab}</span>
      </a>`
  ).join("");

  document.getElementById("site-header").innerHTML = `
    <div class="page-title"><a href="index.html">${SITE_NAME}</a></div>

    <div class="toolbar">
      <div class="search">
        <button type="button" class="search-button" aria-label="Search your songs"
                aria-haspopup="dialog" aria-keyshortcuts="Meta+K Control+K">
          ${SEARCH_ICON}
          <p>Search</p>
        </button>
        <div class="search-container" role="dialog" aria-modal="true" aria-label="Search your songs">
          <div class="search-space">
            <input class="search-bar" type="text" placeholder="Search songs, albums, artists"
                   aria-label="Search songs, albums and artists" autocomplete="off"
                   enterkeyhint="search" autocapitalize="off" autocorrect="off" spellcheck="false">
            <div class="search-layout">
              <div class="results-container"></div>
            </div>
          </div>
          <button type="button" class="search-cancel">Cancel</button>
        </div>
      </div>
      <button type="button" class="darkmode" aria-label="Switch between light and dark mode">
        ${SUN_ICON}${MOON_ICON}
      </button>
    </div>

    <nav class="explorer" aria-label="Main">
      <h2 class="explorer-title">Browse</h2>
      <div class="explorer-content">
        <ul class="explorer-ul">${links}</ul>
      </div>
    </nav>

    <nav class="tab-bar" aria-label="Tabs">
      <div class="tab-capsule">
        <span class="tab-lens" aria-hidden="true"></span>
        ${tabs}
      </div>
      <button type="button" class="tab-search" aria-label="Search your songs" aria-haspopup="dialog">
        ${SEARCH_ICON}
      </button>
    </nav>`;

  setActiveNav();
}

function renderFooter() {
  const rated = allSongs().filter(isRated).length;
  document.getElementById("site-footer").innerHTML = `
    <div class="footer-inner">
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

/* Lets the site be installed as an app and work offline (see sw.js). */
function registerServiceWorker() {
  if ("serviceWorker" in navigator && window.isSecureContext) {
    navigator.serviceWorker.register("sw.js").catch((err) => {
      console.warn("Service worker not registered:", err);
    });
  }
}

/* Feel like an app: no pinch-zoom (iOS Safari ignores user-scalable=no). */
function blockPinchZoom() {
  document.addEventListener("gesturestart", (event) => event.preventDefault());
}

/* Like iOS search screens: scrolling the results closes the keyboard. */
function dismissKeyboardOnScroll() {
  document.addEventListener(
    "touchmove",
    () => {
      const field = document.activeElement;
      if (field && field.matches('input[type="search"]')) field.blur();
    },
    { passive: true }
  );
}

// Scripts load at the end of <body>, so the header can render right away
// instead of popping in after the page has painted.
renderHeader();
blockPinchZoom();
dismissKeyboardOnScroll();
whenReady(renderFooter);
window.addEventListener("load", registerServiceWorker);
