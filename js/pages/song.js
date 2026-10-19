/* Single song page: song.html?album=<album id>&track=<track number> */

whenReady(() => {
  const container = document.getElementById("song-detail");
  const album = findAlbum(getQueryParam("album"));
  const number = Number(getQueryParam("track"));
  const track = album && album.tracks[number - 1];

  if (!track) {
    document.title = `Not found · ${SITE_NAME}`;
    container.innerHTML = `
      <div class="empty-state">
        <h1>Song not found</h1>
        <p><a href="albums.html">Browse all albums →</a></p>
      </div>`;
    return;
  }

  document.title = `${track.title} by ${album.artist} · ${SITE_NAME}`;
  const rated = isRated(track);

  const tags = (track.tags || [])
    .map((t) => `<span class="tag">${escapeHTML(t)}</span>`)
    .join("");

  const review = track.review
    ? track.review
        .split(/\n\s*\n/)
        .map((p) => `<p>${escapeHTML(p)}</p>`)
        .join("")
    : `<p class="muted">No review written yet.</p>`;

  const prev = album.tracks[number - 2];
  const next = album.tracks[number];
  const trackNav = `
    <nav class="track-nav">
      ${prev ? `<a href="${songURL(album.id, number - 1)}">← ${escapeHTML(prev.title)}</a>` : "<span></span>"}
      ${next ? `<a href="${songURL(album.id, number + 1)}">${escapeHTML(next.title)} →</a>` : "<span></span>"}
    </nav>`;

  container.innerHTML = `
    <a href="${albumURL(album.id)}" class="back-link">← ${escapeHTML(album.title)}</a>
    <div class="detail-hero">
      ${coverHTML(album, "lg")}
      <div class="detail-hero-info">
        <p class="eyebrow">Track ${number} of ${album.tracks.length}${track.duration ? ` · ${escapeHTML(track.duration)}` : ""}</p>
        <h1>${escapeHTML(track.title)}</h1>
        <p class="detail-hero-artist">${escapeHTML(album.artist)}</p>
        <p class="detail-hero-sub">from <a href="${albumURL(album.id)}"><em>${escapeHTML(album.title)}</em></a> (${album.year})</p>
        <div class="tags">${tags}</div>
      </div>
      <div class="detail-hero-score">
        ${ratingBadgeHTML(rated ? track.rating : null, "lg")}
        <span class="score-label">${rated ? "out of 10" : "not rated yet"}</span>
        <a href="add.html?album=${encodeURIComponent(album.id)}&track=${number}"
           class="button${rated ? "" : " button-primary"}">${rated ? "Edit rating" : "Rate this song"}</a>
      </div>
    </div>
    <article class="review">
      <h2>Review</h2>
      ${review}
      ${rated && track.dateRated ? `<p class="review-date">Rated ${formatDate(track.dateRated)}</p>` : ""}
    </article>
    ${trackNav}`;
});
