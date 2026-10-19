/* Albums page: search, genre filter, sort. */

whenReady(() => {
  const searchInput = document.getElementById("search");
  const genreSelect = document.getElementById("genre");
  const sortSelect = document.getElementById("sort");
  const grid = document.getElementById("albums-grid");
  const count = document.getElementById("result-count");

  const genres = [...new Set(ALBUMS.map((a) => a.genre))].sort();
  genreSelect.innerHTML += genres
    .map((g) => `<option value="${escapeHTML(g)}">${escapeHTML(g)}</option>`)
    .join("");

  function update() {
    const query = searchInput.value.trim().toLowerCase();
    const genre = genreSelect.value;

    const filtered = ALBUMS.filter((album) => {
      const matchesGenre = !genre || album.genre === genre;
      const haystack = [album.title, album.artist, ...album.tracks.map((t) => t.title)]
        .join(" ")
        .toLowerCase();
      return matchesGenre && haystack.includes(query);
    });

    const sorted = sortAlbums(filtered, sortSelect.value);
    count.textContent = `${sorted.length} of ${ALBUMS.length} albums`;
    grid.innerHTML = sorted.length
      ? sorted.map(albumCardHTML).join("")
      : ALBUMS.length
      ? `<p class="empty-state">No albums match your filters.</p>`
      : `<div class="empty-state">
           <p>No albums yet.</p>
           <a href="add.html" class="button button-primary">+ Add new</a>
         </div>`;
  }

  [searchInput, genreSelect, sortSelect].forEach((el) =>
    el.addEventListener("input", update)
  );
  update();

  /* Backup: ratings live only in this browser, so offer a file export/import. */
  const importInput = document.getElementById("import-file");
  document.getElementById("export-button").addEventListener("click", exportAlbums);
  document.getElementById("import-button").addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", async () => {
    const file = importInput.files[0];
    if (!file) return;
    if (ALBUMS.length && !confirm("Importing replaces all ratings saved in this browser. Continue?")) {
      importInput.value = "";
      return;
    }
    try {
      await importAlbums(file);
      window.location.reload();
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    }
    importInput.value = "";
  });
});
