/*
 * Theme pre-paint bootstrap.
 *
 * Injected as an inline <script> in <head> of every HTML page by the
 * `themeBootstrap` plugin in vite.config.js. Must stay inline so the
 * data-theme attribute is set BEFORE the browser paints — otherwise
 * every navigation flashes the wrong theme for one frame.
 *
 * Policy (highest priority wins):
 *   1. Explicit user choice from localStorage (set by theme-toggle.js
 *      when the user clicks the toggle).
 *   2. Operating-system preference via `prefers-color-scheme`.
 *   3. Static fallback: track (light) — chosen because the site's
 *      editorial brand is the light theme.
 *
 * This file is intentionally written in ES5-compatible style: it runs
 * before any module loader and on very old browsers that might land
 * here. It is plain JS, not a module — Vite reads it as a string and
 * splices it into <head> verbatim.
 *
 * The constants below MUST stay in sync with the matching constants in
 * `components/theme-toggle.js` (STORAGE_KEY, THEME_LANE, THEME_TRACK,
 * the theme-color hex values). Both files import the same logical
 * policy; if one drifts the toggle button can lie about the current
 * state. There is a comment in theme-toggle.js pointing back here.
 */
(function () {
  try {
    var STORAGE_KEY = 'athleticsUtils.theme';
    var THEME_LANE = 'lane';   // dark theme
    var THEME_TRACK = 'track'; // light theme
    var DEFAULT_THEME = THEME_TRACK;

    var saved = localStorage.getItem(STORAGE_KEY);
    var theme;
    if (saved === THEME_LANE || saved === THEME_TRACK) {
      theme = saved;
    } else if (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      theme = THEME_LANE;
    } else {
      theme = DEFAULT_THEME;
    }

    document.documentElement.setAttribute('data-theme', theme);

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute(
        'content',
        theme === THEME_LANE ? '#0a0c11' : '#f4efe6'
      );
    }
  } catch (e) {
    // localStorage / matchMedia can throw in obscure contexts (private
    // mode, sandboxed iframes). Fall through to the static default so
    // the page still renders, just without honouring user preference.
    document.documentElement.setAttribute('data-theme', 'track');
  }
})();
