/* Albums page: search, genre filter, sort. */

whenReady(() => {
  const searchInput = document.getElementById("search");
  const genreSelect = document.getElementById("genre");
  const sortSelect = document.getElementById("sort");
  const grid = document.getElementById("albums-grid");
  const count = document.getElementById("result-count");
  const loadMore = document.getElementById("load-more");

  /* Albums are shown 20 at a time so the covers don't all download at once. */
  const PAGE_SIZE = 20;
  let sorted = [];
  let shown = 0;

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

    sorted = sortAlbums(filtered, sortSelect.value);
    shown = Math.min(PAGE_SIZE, sorted.length);
    count.textContent = `${sorted.length} of ${ALBUMS.length} albums`;
    loadMore.hidden = shown >= sorted.length;
    grid.innerHTML = sorted.length
      ? sorted.slice(0, shown).map(albumCardHTML).join("")
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

  loadMore.addEventListener("click", () => {
    const next = sorted.slice(shown, shown + PAGE_SIZE);
    grid.insertAdjacentHTML("beforeend", next.map(albumCardHTML).join(""));
    shown += next.length;
    loadMore.hidden = shown >= sorted.length;
  });

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
