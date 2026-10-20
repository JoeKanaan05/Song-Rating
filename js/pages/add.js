/*
 * Add New page.
 *   add.html                      search the catalog, pick a song, rate it
 *   add.html?q=<term>             same, with the search pre-filled
 *   add.html?album=<id>&track=<n> rate / edit a track that's already saved
 */

whenReady(() => {
  const searchView = document.getElementById("search-view");
  const rateView = document.getElementById("rate-view");
  const searchInput = document.getElementById("search");
  const status = document.getElementById("search-status");
  const results = document.getElementById("search-results");
  const rateContent = document.getElementById("rate-content");
  const backLink = document.getElementById("back-to-search");

  let lastResults = [];
  let searchTimer;
  let searchId = 0;

  /* ---------- Search ---------- */

  async function runSearch(term) {
    if (!searchInput.isConnected) return; // left the page before the timer fired
    const id = ++searchId;
    history.replaceState(null, "", term ? `add.html?q=${encodeURIComponent(term)}` : "add.html");

    if (term.length < 2) {
      showSuggestions();
      return;
    }

    status.textContent = "Searching…";
    try {
      const songs = await searchSongs(term);
      if (id !== searchId) return; // a newer search has started
      lastResults = songs;
      status.textContent = songs.length ? "" : "No songs found. Try a different spelling.";
      results.innerHTML = songs.map(searchResultHTML).join("");
    } catch (err) {
      if (id === searchId) status.textContent = err.message;
    }
  }

  function savedTrackFor(result) {
    const album = findAlbum(`itunes-${result.albumSourceId}`);
    return album && album.tracks.find((t) => t.sourceId === result.trackId);
  }

  function searchResultHTML(result, index) {
    const saved = savedTrackFor(result);
    const badge = saved && isRated(saved) ? ratingBadgeHTML(saved.rating, "sm") : "";
    return `
      <button class="song-row search-result" data-index="${index}">
        ${coverHTML({ title: result.album, artist: result.artist, cover: result.cover }, "sm")}
        <div class="song-row-body">
          <span class="song-title">${escapeHTML(result.title)}</span>
          <span class="song-artist">${escapeHTML(result.artist)} · ${escapeHTML(result.album)}${result.year ? ` · ${result.year}` : ""}</span>
        </div>
        ${badge || `<span class="add-hint">+ Rate</span>`}
      </button>`;
  }

  /* ---------- Suggestions (shown while the search box is empty) ---------- */

  /* Unrated songs from your best-rated albums that you've started rating. */
  function finishRatingSuggestions(limit = 6, perAlbum = 2) {
    const picks = [];
    ALBUMS.map((album) => ({ album, stats: albumStats(album) }))
      .filter(({ stats }) => stats.ratedCount > 0 && stats.ratedCount < stats.trackCount)
      .sort((a, b) => b.stats.average - a.stats.average)
      .forEach(({ album }) => {
        album.tracks
          .map((track, i) => ({ album, track, number: i + 1 }))
          .filter(({ track }) => !isRated(track))
          .slice(0, perAlbum)
          .forEach((pick) => picks.push(pick));
      });
    return picks.slice(0, limit);
  }

  /* Your highest-rated artists, by average song score. */
  function topArtists(limit = 3) {
    const scores = new Map();
    allSongs()
      .filter(isRated)
      .forEach((song) => {
        const entry = scores.get(song.album.artist) || { total: 0, count: 0 };
        entry.total += song.rating;
        entry.count += 1;
        scores.set(song.album.artist, entry);
      });
    return [...scores]
      .sort(([, a], [, b]) => b.total / b.count - a.total / a.count || b.count - a.count)
      .slice(0, limit)
      .map(([artist]) => artist);
  }

  function finishRatingHTML({ album, track, number }) {
    return `
      <a class="song-row" href="add.html?album=${encodeURIComponent(album.id)}&track=${number}">
        ${coverHTML(album, "sm")}
        <div class="song-row-body">
          <span class="song-title">${escapeHTML(track.title)}</span>
          <span class="song-artist">${escapeHTML(album.artist)} · ${escapeHTML(album.title)}</span>
        </div>
        <span class="add-hint">Rate</span>
      </a>`;
  }

  async function showSuggestions() {
    const id = ++searchId;
    status.textContent = "";
    lastResults = [];

    const finish = finishRatingSuggestions();
    const finishHTML = finish.length
      ? `<p class="list-label">Finish rating</p>${finish.map(finishRatingHTML).join("")}`
      : "";
    results.innerHTML = finishHTML;

    const artists = topArtists();
    const groups = await Promise.all(artists.map((name) => songsByArtist(name).catch(() => [])));
    if (id !== searchId) return; // the user started typing

    const seenTitles = new Set();
    const artistHTML = artists
      .map((artist, i) => {
        const songs = groups[i]
          .filter((song) => {
            const key = song.title.toLowerCase();
            if (savedTrackFor(song) || seenTitles.has(key)) return false;
            seenTitles.add(key);
            return true;
          })
          .slice(0, 4);
        if (!songs.length) return "";
        const rows = songs.map((song) => {
          lastResults.push(song);
          return searchResultHTML(song, lastResults.length - 1);
        });
        return `<p class="list-label">More from ${escapeHTML(artist)}</p>${rows.join("")}`;
      })
      .join("");
    results.innerHTML = finishHTML + artistHTML;
  }

  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => runSearch(searchInput.value.trim()), 350);
  });

  results.addEventListener("click", async (event) => {
    const button = event.target.closest(".search-result");
    if (!button) return;
    const result = lastResults[Number(button.dataset.index)];

    status.textContent = "Loading album…";
    try {
      const fetched = await fetchAlbum(result.albumSourceId);
      // Keep existing ratings if this album was already saved.
      const album = findAlbum(fetched.id) || fetched;
      let index = album.tracks.findIndex((t) => t.sourceId === result.trackId);
      if (index === -1) index = album.tracks.findIndex((t) => t.title === result.title);
      status.textContent = "";
      showRateView(album, Math.max(index, 0) + 1, true);
    } catch (err) {
      status.textContent = err.message;
    }
  });

  backLink.addEventListener("click", (event) => {
    event.preventDefault();
    rateView.hidden = true;
    searchView.hidden = false;
    searchInput.focus();
  });

  /* ---------- Rate ---------- */

  function showRateView(album, number, fromSearch) {
    searchView.hidden = true;
    rateView.hidden = false;
    backLink.hidden = !fromSearch;
    renderRateForm(album, number);
    window.scrollTo(0, 0);
  }

  function renderRateForm(album, number) {
    const track = album.tracks[number - 1];
    const rated = isRated(track);
    const startRating = rated ? track.rating : 7;

    const trackOptions = album.tracks
      .map(
        (t, i) =>
          `<option value="${i + 1}"${i + 1 === number ? " selected" : ""}>${i + 1}. ${escapeHTML(t.title)}${isRated(t) ? ` (${formatRating(t.rating)})` : ""}</option>`
      )
      .join("");

    rateContent.innerHTML = `
      <div class="detail-hero">
        ${coverHTML(album, "lg")}
        <div class="detail-hero-info">
          <p class="eyebrow">Track ${number} of ${album.tracks.length}${track.duration ? ` · ${escapeHTML(track.duration)}` : ""}</p>
          <h1>${escapeHTML(track.title)}</h1>
          <p class="detail-hero-artist">${escapeHTML(album.artist)}</p>
          <p class="detail-hero-sub">from <em>${escapeHTML(album.title)}</em>${album.year ? ` (${album.year})` : ""}</p>
        </div>
      </div>

      <form id="rate-form" class="rate-form">
        <label class="field">
          <span class="field-label">Song</span>
          <select id="track-select">${trackOptions}</select>
        </label>

        <div class="field">
          <span class="field-label">Score</span>
          <div class="score-input">
            <input id="rating-range" type="range" min="0" max="10" step="0.1" value="${startRating}" aria-label="Score">
            <input id="rating-number" type="number" min="0" max="10" step="0.1" value="${formatRating(startRating)}" aria-label="Score out of 10">
            <span id="rating-preview">${ratingBadgeHTML(startRating, "md")}</span>
          </div>
        </div>

        <label class="field">
          <span class="field-label">Review</span>
          <textarea id="review" rows="6" placeholder="What works, what doesn't, and why it earned its score.">${escapeHTML(track.review || "")}</textarea>
        </label>

        <label class="field">
          <span class="field-label">Tags <span class="muted">(comma separated, optional)</span></span>
          <input id="tags" type="text" value="${escapeHTML((track.tags || []).join(", "))}" placeholder="favorite, late night">
        </label>

        <div class="form-actions">
          <button type="submit" class="button button-primary">${rated ? "Update rating" : "Save rating"}</button>
          ${rated ? `<button type="button" id="remove-rating" class="button button-danger">Remove rating</button>` : ""}
        </div>
      </form>`;

    const range = document.getElementById("rating-range");
    const numberInput = document.getElementById("rating-number");
    const preview = document.getElementById("rating-preview");

    function setRating(value) {
      const clamped = Math.min(10, Math.max(0, Number(value) || 0));
      range.value = clamped;
      preview.innerHTML = ratingBadgeHTML(clamped, "md");
      return clamped;
    }
    range.addEventListener("input", () => {
      numberInput.value = formatRating(setRating(range.value));
    });
    numberInput.addEventListener("input", () => setRating(numberInput.value));

    document.getElementById("track-select").addEventListener("change", (event) => {
      renderRateForm(album, Number(event.target.value));
    });

    const form = document.getElementById("rate-form");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitButton = form.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.textContent = "Saving…";
      try {
        const stored = await upsertAlbum(album);
        await rateTrack(stored.id, number, {
          rating: Math.round(setRating(numberInput.value) * 10) / 10,
          review: document.getElementById("review").value.trim(),
          tags: document
            .getElementById("tags")
            .value.split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        });
        navigate(songURL(stored.id, number));
      } catch (err) {
        alert(`Could not save: ${err.message}`);
        submitButton.disabled = false;
        submitButton.textContent = rated ? "Update rating" : "Save rating";
      }
    });

    const removeButton = document.getElementById("remove-rating");
    if (removeButton) {
      removeButton.addEventListener("click", async () => {
        if (!confirm(`Remove your rating for "${track.title}"?`)) return;
        try {
          await clearTrackRating(album.id, number);
          navigate(songURL(album.id, number));
        } catch (err) {
          alert(`Could not save: ${err.message}`);
        }
      });
    }
  }

  /* ---------- Start ---------- */

  const albumParam = getQueryParam("album");
  const trackParam = Number(getQueryParam("track"));
  const savedAlbum = albumParam && findAlbum(albumParam);

  if (savedAlbum && savedAlbum.tracks[trackParam - 1]) {
    showRateView(savedAlbum, trackParam, false);
  } else {
    const q = getQueryParam("q");
    if (q) {
      searchInput.value = q;
      runSearch(q);
    } else {
      showSuggestions();
    }
  }
});
