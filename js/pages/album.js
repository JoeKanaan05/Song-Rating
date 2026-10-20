/* Single album page with full tracklist: album.html?id=<album id> */

whenReady(() => {
  const container = document.getElementById("album-detail");
  const album = findAlbum(getQueryParam("id"));

  if (!album) {
    document.title = `Not found · ${SITE_NAME}`;
    container.innerHTML = `
      <div class="empty-state">
        <h1>Album not found</h1>
        <p><a href="albums.html">Browse all albums →</a></p>
      </div>`;
    return;
  }

  document.title = `${album.title} by ${album.artist} · ${SITE_NAME}`;
  const stats = albumStats(album);

  const tracks = album.tracks
    .map((track, i) => trackRowHTML(album, track, i + 1))
    .join("");

  const review = album.review
    ? `<article class="review">
         <h2>About this album</h2>
         ${album.review
           .split(/\n\s*\n/)
           .map((p) => `<p>${escapeHTML(p)}</p>`)
           .join("")}
       </article>`
    : "";

  container.innerHTML = `
    <a href="albums.html" class="back-link">← All albums</a>
    <div class="detail-hero">
      ${coverHTML(album, "lg")}
      <div class="detail-hero-info">
        <p class="eyebrow">Album · ${escapeHTML(album.genre)} · ${album.year}</p>
        <h1>${escapeHTML(album.title)}</h1>
        <p class="detail-hero-artist">${escapeHTML(album.artist)}</p>
        ${progressHTML(stats.ratedCount, stats.trackCount)}
      </div>
      <div class="detail-hero-score">
        ${ratingBadgeHTML(stats.average, "lg")}
        <span class="score-label">${stats.average == null ? "not rated yet" : "album average"}</span>
      </div>
    </div>

    <section class="tracklist">
      <div class="tracklist-head">
        <span>#</span><span>Title</span><span>Length</span><span>Score</span>
      </div>
      ${tracks}
    </section>

    ${review}

    <div class="danger-zone">
      <button id="remove-album" class="button button-danger">Remove album</button>
    </div>`;

  document.getElementById("remove-album").addEventListener("click", async () => {
    const message = stats.ratedCount
      ? `Remove "${album.title}" and your ${stats.ratedCount} rating(s) for it?`
      : `Remove "${album.title}"?`;
    if (!confirm(message)) return;
    try {
      await removeAlbum(album.id);
      navigate("albums.html");
    } catch (err) {
      alert(`Could not save: ${err.message}`);
    }
  });
});
