/* Home page: stats, recently rated albums, top-rated songs. */

whenReady(() => {
  const songs = allSongs();
  const rated = songs.filter(isRated);
  const average = averageRating(songs);

  document.getElementById("stats").innerHTML = `
    <div class="stat"><span class="stat-value">${ALBUMS.length}</span><span class="stat-label">Albums</span></div>
    <div class="stat"><span class="stat-value">${rated.length}/${songs.length}</span><span class="stat-label">Songs rated</span></div>
    <div class="stat"><span class="stat-value">${average == null ? "–" : formatRating(average)}</span><span class="stat-label">Average score</span></div>`;

  const recent = sortAlbums(ALBUMS, "recent").slice(0, 6);
  document.getElementById("recent-grid").innerHTML = recent.length
    ? recent.map(albumCardHTML).join("")
    : `<div class="empty-state">
         <p>No albums yet. Search for a song to rate your first one.</p>
         <a href="add.html" class="button button-primary">+ Add new</a>
       </div>`;

  const top = [...rated].sort((a, b) => b.rating - a.rating).slice(0, 10);
  document.getElementById("top-list").innerHTML = top.length
    ? top.map((song, i) => songRowHTML(song, i + 1)).join("")
    : `<p class="muted">No songs rated yet.</p>`;
});
