/*
 * Sidebar behaviour, ported from the Notes site (Quartz's darkmode, explorer
 * and search plugins, plus its uiBehaviour.ts):
 *   1. the light / dark toggle (applyTheme() is in js/theme.js);
 *   2. the phone menu drawer;
 *   3. the search sheet: searches your saved songs and albums, with a row
 *      that hands the search over to the catalog on the Add page;
 *   4. phone-only search extras: the Cancel button, keeping the sheet's
 *      contents above the keyboard, and stopping drags from panning the page.
 * Markup: renderHeader() in js/components.js. Styles: css/layout.css.
 *
 * Avoid cancelable (non-passive) scroll/touch listeners: they make the browser
 * wait for script on every scroll. The one exception is the search sheet's
 * touch guard, which only does anything while the sheet is open on a phone.
 */

(() => {
  const root = document.documentElement;
  const phone = window.matchMedia("(max-width: 800px)");

  // Turn transitions on (css/base.css keeps them off until now). Reading a
  // style first makes the browser apply the stylesheets with transitions
  // still off, so nothing fades in on load.
  void getComputedStyle(root).backgroundColor;
  root.classList.add("ui-ready");

  /* ---------- 1. Light / dark toggle ---------- */

  document.querySelector(".darkmode").addEventListener("click", () => {
    applyTheme(root.getAttribute("saved-theme") === "dark" ? "light" : "dark", { save: true });
  });

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (event) => {
    applyTheme(event.matches ? "dark" : "light", { save: true });
  });

  /* ---------- 2. Phone menu drawer ---------- */

  const explorer = document.querySelector(".explorer");
  const menuButton = explorer.querySelector(".mobile-explorer");

  function setMenuOpen(open) {
    explorer.classList.toggle("collapsed", !open);
    menuButton.setAttribute("aria-expanded", String(open));
    root.classList.toggle("mobile-no-scroll", open);
  }

  const menuIsOpen = () => !explorer.classList.contains("collapsed");

  menuButton.addEventListener("click", () => setMenuOpen(!menuIsOpen()));

  // Choosing a page closes the menu; js/nav.js swaps the page in underneath.
  explorer.querySelector(".explorer-content").addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenuOpen(false);
  });

  /* ---------- 3. Search sheet ---------- */

  const MAX_RESULTS = 30;
  const searchButton = document.querySelector(".search-button");
  const sheet = document.querySelector(".search-container");
  const field = sheet.querySelector(".search-bar");
  const layout = sheet.querySelector(".search-layout");
  const results = sheet.querySelector(".results-container");
  let focusIndex = -1;

  const searchIsOpen = () => sheet.classList.contains("active");

  function openSearch() {
    if (searchIsOpen()) return;
    setMenuOpen(false);
    sheet.classList.add("active");
    field.focus(); // during the tap, so iPhones open the keyboard
    syncSheetToViewport();
  }

  function closeSearch({ restoreFocus = false } = {}) {
    if (!searchIsOpen()) return;
    sheet.classList.remove("active");
    field.value = "";
    field.blur();
    showResults("");
    syncSheetToViewport();
    if (restoreFocus) searchButton.focus({ preventScroll: true });
  }

  /* Accents and case don't matter: "beyonce" finds "Beyoncé". */
  function normalize(text) {
    return String(text || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();
  }

  function scoreFor(match) {
    if (match.type === "album") return albumStats(match.album).average ?? -1;
    return isRated(match.track) ? match.track.rating : -1;
  }

  /* Every word has to appear in the title, artist or album. Titles that start
     with the search come first, then titles containing it, then albums before
     songs, then the highest rated. */
  function searchLibrary(query) {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const phrase = words.join(" ");
    const matches = [];

    const consider = (match, title, ...rest) => {
      const haystack = normalize([title, ...rest].join(" "));
      if (!words.every((word) => haystack.includes(word))) return;
      const t = normalize(title);
      const rank = t.startsWith(phrase) ? 3 : t.includes(phrase) ? 2 : words.every((w) => t.includes(w)) ? 1 : 0;
      matches.push({ ...match, rank });
    };

    for (const album of ALBUMS) {
      consider({ type: "album", album }, album.title, album.artist);
      album.tracks.forEach((track, i) => {
        consider({ type: "song", album, track, number: i + 1 }, track.title, album.artist, album.title);
      });
    }

    return matches
      .sort(
        (a, b) =>
          b.rank - a.rank ||
          (b.type === "album") - (a.type === "album") ||
          scoreFor(b) - scoreFor(a)
      )
      .slice(0, MAX_RESULTS);
  }

  /* Escaped text with the searched words wrapped in .highlight. */
  function highlightHTML(text, words) {
    const lower = text.toLowerCase();
    if (lower.length !== text.length) return escapeHTML(text); // can't map positions back
    const marked = new Array(text.length).fill(false);
    for (const word of words) {
      for (let i = lower.indexOf(word); i !== -1; i = lower.indexOf(word, i + word.length)) {
        marked.fill(true, i, i + word.length);
      }
    }
    let html = "";
    let start = 0;
    for (let i = 1; i <= text.length; i++) {
      if (i === text.length || marked[i] !== marked[start]) {
        const part = escapeHTML(text.slice(start, i));
        html += marked[start] ? `<span class="highlight">${part}</span>` : part;
        start = i;
      }
    }
    return html;
  }

  function resultCardHTML(match, words) {
    const { album } = match;
    const artist = escapeHTML(album.artist);
    if (match.type === "album") {
      return `
        <a class="result-card" href="${albumURL(album.id)}">
          ${coverHTML(album, "xs")}
          <div class="result-body">
            <h3>${highlightHTML(album.title, words)}</h3>
            <p>Album · ${artist}${album.year ? ` · ${album.year}` : ""}</p>
          </div>
          ${ratingBadgeHTML(albumStats(album).average, "sm")}
        </a>`;
    }
    return `
      <a class="result-card" href="${songURL(album.id, match.number)}">
        ${coverHTML(album, "xs")}
        <div class="result-body">
          <h3>${highlightHTML(match.track.title, words)}</h3>
          <p>Song · ${artist} · ${escapeHTML(album.title)}</p>
        </div>
        ${ratingBadgeHTML(isRated(match.track) ? match.track.rating : null, "sm")}
      </a>`;
  }

  function showResults(query) {
    const term = query.trim();
    layout.classList.toggle("display-results", Boolean(term));
    if (!term) {
      results.innerHTML = "";
      focusIndex = -1;
      return;
    }

    const words = normalize(term).split(/\s+/).filter(Boolean);
    const matches = searchLibrary(term);
    const found = matches.length
      ? matches.map((match) => resultCardHTML(match, words)).join("")
      : `<div class="result-card no-match">
           <div class="result-body">
             <h3>No results.</h3>
             <p>Nothing in your library matches “${escapeHTML(term)}”.</p>
           </div>
         </div>`;
    const catalog = `
      <a class="result-card" href="add.html?q=${encodeURIComponent(term)}">
        <span class="result-icon" aria-hidden="true">+</span>
        <div class="result-body">
          <h3>Find “${escapeHTML(term)}” in the catalog</h3>
          <p>Rate a song that isn't in your library yet</p>
        </div>
      </a>`;

    results.innerHTML = found + catalog;
    results.scrollTop = 0;
    setFocus(0);
  }

  const resultLinks = () => [...results.querySelectorAll("a.result-card")];

  /* The highlighted result: Enter opens it, arrows move it, hover sets it. */
  function setFocus(index) {
    const links = resultLinks();
    focusIndex = Math.max(-1, Math.min(index, links.length - 1));
    links.forEach((link, i) => link.classList.toggle("focus", i === focusIndex));
    links[focusIndex]?.scrollIntoView({ block: "nearest" });
  }

  searchButton.addEventListener("click", openSearch);
  field.addEventListener("input", () => showResults(field.value));

  field.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setFocus(focusIndex + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setFocus(Math.max(focusIndex - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      (resultLinks()[focusIndex] || resultLinks()[0])?.click();
    }
  });

  results.addEventListener("mouseover", (event) => {
    const link = event.target.closest("a.result-card");
    if (link) setFocus(resultLinks().indexOf(link));
  });

  // Opening a result closes the sheet; js/nav.js handles the navigation.
  results.addEventListener("click", (event) => {
    if (event.target.closest("a.result-card")) closeSearch();
  });

  // A click on the bare backdrop closes the sheet.
  sheet.addEventListener("click", (event) => {
    if (event.target === sheet) closeSearch();
  });

  sheet.querySelector(".search-cancel").addEventListener("click", (event) => {
    event.stopPropagation();
    closeSearch();
  });

  /* ---------- Keyboard, back button, resizing ---------- */

  document.addEventListener("keydown", (event) => {
    // Autofill can fire keydown events without a key.
    if ((event.key || "").toLowerCase() === "k" && (event.metaKey || event.ctrlKey) && !event.shiftKey) {
      event.preventDefault();
      if (searchIsOpen()) closeSearch({ restoreFocus: true });
      else openSearch();
    } else if (event.key === "Escape") {
      if (searchIsOpen()) {
        event.preventDefault();
        closeSearch({ restoreFocus: true });
      } else if (menuIsOpen()) {
        setMenuOpen(false);
        menuButton.focus({ preventScroll: true });
      }
    }
  });

  window.addEventListener("popstate", () => {
    closeSearch();
    setMenuOpen(false);
  });

  phone.addEventListener("change", () => {
    setMenuOpen(false);
    syncSheetToViewport();
  });

  /* ---------- 4. Phone search sheet ---------- */

  // With the keyboard up, iOS shrinks the visible area (the visual viewport)
  // without shrinking the page, and can slide it. The sheet covers the whole
  // page; these insets keep its contents inside the visible part: --vv-top is
  // how far the view has slid down, --kb how much is hidden at the bottom.
  const vv = window.visualViewport;
  let fitting = false;

  function fitToViewport() {
    if (!fitting || !vv) return;
    const hiddenBelow = Math.max(0, window.innerHeight - vv.offsetTop - vv.height);
    sheet.style.setProperty("--vv-top", `${vv.offsetTop}px`);
    sheet.style.setProperty("--kb", `${hiddenBelow}px`);
  }

  function syncSheetToViewport() {
    fitting = searchIsOpen() && phone.matches;
    if (fitting) {
      fitToViewport();
    } else {
      sheet.style.removeProperty("--vv-top");
      sheet.style.removeProperty("--kb");
    }
  }

  if (vv) {
    vv.addEventListener("resize", fitToViewport);
    vv.addEventListener("scroll", fitToViewport);
  }

  // Touch guard. While the keyboard is up, iOS lets a drag pan the page
  // underneath even with overflow: hidden and touch-action: none, which drags
  // the search field off screen. So cancel any drag on the open sheet, except
  // where something should move:
  //   - inside the results, while they can still scroll that way (and then the
  //     keyboard is dismissed, like iOS apps do);
  //   - on the search field when it has text (moving the cursor / selecting).
  const canScroll = (list, dy) =>
    list.scrollHeight > list.clientHeight + 1 &&
    (dy < 0 ? list.scrollTop > 0 : list.scrollTop + list.clientHeight < list.scrollHeight - 1);

  let startX = 0;
  let startY = 0;

  sheet.addEventListener(
    "touchstart",
    (event) => {
      startX = event.touches[0].clientX;
      startY = event.touches[0].clientY;
    },
    { passive: true }
  );

  sheet.addEventListener(
    "touchmove",
    (event) => {
      if (!fitting || !event.cancelable) return;
      const target = event.target instanceof Element ? event.target : sheet;
      if (target === field && field.value) return;
      const dx = startX - event.touches[0].clientX;
      const dy = startY - event.touches[0].clientY;
      const list = target.closest(".results-container");
      if (list && Math.abs(dy) >= Math.abs(dx) && canScroll(list, dy)) {
        if (document.activeElement === field) field.blur();
        return;
      }
      event.preventDefault();
    },
    { passive: false }
  );
})();
