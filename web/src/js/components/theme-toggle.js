/**
 * Theme Toggle Component
 *
 * Swaps the active theme between Dark (data-theme="lane") and Light
 * (data-theme="track") by updating the data-theme attribute on <html>
 * and persisting the choice to localStorage.
 *
 * The internal attribute values ("lane" / "track") are kept for stylesheet
 * compatibility; the user-facing labels are "Dark" and "Light".
 *
 * The pre-paint script in each page's <head> reads localStorage and sets
 * the attribute before any CSS is applied, so the toggle here only needs
 * to react to user clicks during the page lifetime.
 */

const STORAGE_KEY = 'athleticsUtils.theme';
const THEME_LANE = 'lane';
const THEME_TRACK = 'track';
const DEFAULT_THEME = THEME_LANE;

/** Return the saved theme, the system preference, or the default. */
export function getCurrentTheme() {
  const root = document.documentElement;
  const fromAttr = root.getAttribute('data-theme');
  if (fromAttr === THEME_LANE || fromAttr === THEME_TRACK) return fromAttr;
  return DEFAULT_THEME;
}

function setTheme(theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  try { localStorage.setItem(STORAGE_KEY, theme); } catch (_) { /* storage may be unavailable */ }
  updateThemeColorMeta(theme);
  updateToggleButtonState(theme);
}

function updateThemeColorMeta(theme) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  meta.setAttribute('content', theme === THEME_LANE ? '#0a0c11' : '#f4efe6');
}

function updateToggleButtonState(theme) {
  const buttons = document.querySelectorAll('[data-theme-toggle]');
  buttons.forEach(btn => {
    const labelEl = btn.querySelector('[data-theme-toggle-label]');
    // Button text shows the theme the user will switch TO, not the current one.
    if (labelEl) {
      labelEl.textContent = theme === THEME_LANE ? 'Light' : 'Dark';
    }
    const description = theme === THEME_LANE ? 'Switch to Light theme' : 'Switch to Dark theme';
    btn.setAttribute('aria-label', description);
    btn.setAttribute('title', description);
  });
}

export function toggleTheme() {
  const next = getCurrentTheme() === THEME_LANE ? THEME_TRACK : THEME_LANE;
  setTheme(next);
}

export function initThemeToggle() {
  // Ensure attr is set even if pre-paint script missed (e.g. older bookmarks)
  if (!document.documentElement.hasAttribute('data-theme')) {
    let saved = DEFAULT_THEME;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === THEME_LANE || stored === THEME_TRACK) saved = stored;
    } catch (_) { /* ignore */ }
    document.documentElement.setAttribute('data-theme', saved);
  }

  updateThemeColorMeta(getCurrentTheme());
  updateToggleButtonState(getCurrentTheme());

  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    if (btn.dataset.themeToggleBound === 'true') return;
    btn.dataset.themeToggleBound = 'true';
    btn.addEventListener('click', toggleTheme);
  });
}
