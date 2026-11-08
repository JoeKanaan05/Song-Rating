/*
 * Light / dark theme. Loaded in <head>, before the page paints, so the right
 * theme is on from the first frame (no flash). Same rules as the Notes site:
 * a saved choice wins, otherwise the system setting; if the system setting
 * changes while the site is open, the site follows it (and remembers that).
 *
 * The theme is the saved-theme attribute on <html>; css/base.css swaps the
 * colour tokens on it. The toggle button is wired up in js/ui.js.
 */

const THEME_KEY = "songRatings.theme";

/* Browser chrome colour (tab bar, status bar) per theme: the page colour. */
const THEME_COLORS = { light: "#e4f4f6", dark: "#16171a" };

function applyTheme(theme, { save = false } = {}) {
  document.documentElement.setAttribute("saved-theme", theme);
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) => meta.setAttribute("content", THEME_COLORS[theme]));
  if (save) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Storage blocked: the theme still applies, it just isn't remembered.
    }
  }
}

(() => {
  let saved = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch {
    // Storage blocked: fall back to the system setting.
  }
  const system = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  applyTheme(saved === "light" || saved === "dark" ? saved : system);
})();
