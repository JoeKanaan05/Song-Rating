/*
 * In-app navigation. Tapping a link swaps the page's <main> instead of
 * loading a whole new page, so switching tabs is instant like a native app.
 * The header, tab bar and shared scripts stay put; the new page's script runs
 * again. Anything unexpected falls back to a normal page load.
 */

const pageCache = new Map();

/* Pages read their query string in JS, so album.html?id=x is just album.html. */
function fetchPage(url) {
  const key = url.pathname;
  if (!pageCache.has(key)) {
    const request = fetch(key).then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    });
    request.catch(() => pageCache.delete(key));
    pageCache.set(key, request);
  }
  return pageCache.get(key);
}

function isAppLink(link, event) {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (link.target || link.hasAttribute("download")) return false;

  const url = new URL(link.href);
  if (url.origin !== window.location.origin) return false;
  if (!/(\.html|\/)$/.test(url.pathname)) return false;
  // Same page, different #hash: let the browser scroll.
  const samePage = url.pathname === window.location.pathname && url.search === window.location.search;
  return !(samePage && url.hash);
}

/* Runs the new page's scripts: shared ones only if not loaded yet, the page
   script (js/pages/*) every time. */
async function runPageScripts(doc) {
  document.querySelectorAll('script[src^="js/pages/"]').forEach((el) => el.remove());
  const loaded = new Set(
    [...document.querySelectorAll("script[src]")].map((el) => el.getAttribute("src"))
  );

  for (const el of doc.querySelectorAll("script[src]")) {
    const src = el.getAttribute("src");
    if (loaded.has(src) && !src.startsWith("js/pages/")) continue;
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Could not load ${src}`));
      document.body.appendChild(script);
    });
  }
}

async function navigate(href, { push = true } = {}) {
  const url = new URL(href, window.location.href);
  try {
    const doc = new DOMParser().parseFromString(await fetchPage(url), "text/html");
    const main = doc.querySelector("main");
    if (!main) throw new Error("Page has no <main>");

    if (push) {
      history.replaceState({ ...history.state, scrollY: window.scrollY }, "");
      history.pushState({ scrollY: 0 }, "", url.href);
    }
    document.title = doc.title;
    document.querySelector("main").replaceWith(document.adoptNode(main));
    setActiveNav();
    await runPageScripts(doc);
    renderFooter();
    window.scrollTo(0, push ? 0 : history.state?.scrollY || 0);
  } catch (err) {
    console.warn("Falling back to a full page load:", err);
    window.location.href = url.href;
  }
}

function setupAppNavigation() {
  // Opened straight from disk: fetch() can't read local files, so use normal links.
  if (window.location.protocol === "file:") return;

  history.scrollRestoration = "manual";

  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href]");
    if (!link || !isAppLink(link, event)) return;
    event.preventDefault();
    navigate(link.href);
  });

  window.addEventListener("popstate", () => navigate(window.location.href, { push: false }));

  // Load the other pages in the background so the first tap is instant too.
  setTimeout(() => {
    ["index.html", "albums.html", "album.html", "song.html", "add.html", "about.html"].forEach(
      (page) => fetchPage(new URL(page, window.location.href)).catch(() => {})
    );
  }, 1000);
}

setupAppNavigation();
