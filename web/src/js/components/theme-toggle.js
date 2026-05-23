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
 * The pre-paint bootstrap (web/src/js/theme-bootstrap.inline.js, injected
 * into <head> by the themeBootstrap Vite plugin) reads the same storage
 * key, applies the same policy (localStorage → prefers-color-scheme →
 * default), and sets data-theme before CSS resolves. This module mirrors
 * that policy so toggle clicks during the page lifetime stay coherent.
 *
 * IMPORTANT: the constants and policy below must stay in sync with the
 * bootstrap. If you change one, change the other.
 */

const STORAGE_KEY = 'athleticsUtils.theme';
const THEME_LANE = 'lane';   // dark
const THEME_TRACK = 'track'; // light
const DEFAULT_THEME = THEME_TRACK;

/** OS-level dark-mode preference, if the browser exposes it. */
function osPrefersDark() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

/**
 * Resolve which theme to apply when no explicit storage value exists:
 * follow the OS preference, falling back to the static default. The
 * bootstrap uses the same order — keep them in sync.
 */
function resolveImplicitTheme() {
  return osPrefersDark() ? THEME_LANE : DEFAULT_THEME;
}

/** Return the active theme, reading the data-theme attribute first. */
export function getCurrentTheme() {
  const root = document.documentElement;
  const fromAttr = root.getAttribute('data-theme');
  if (fromAttr === THEME_LANE || fromAttr === THEME_TRACK) return fromAttr;
  return resolveImplicitTheme();
}

/**
 * Apply a theme to the DOM (attribute + meta + button labels). Does NOT
 * persist — use this when the change comes from the OS following its own
 * preference. Calling persist on every OS change would pin the user's
 * choice to whatever the OS happens to be at that moment, blocking
 * future OS-following.
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeColorMeta(theme);
  updateToggleButtonState(theme);
}

/**
 * Apply + persist. Use when the user explicitly chose a theme (clicking
 * the toggle). After this, the OS-preference listener no longer
 * overrides their pick.
 */
function setTheme(theme) {
  applyTheme(theme);
  try { localStorage.setItem(STORAGE_KEY, theme); } catch (_) { /* storage may be unavailable */ }
}

function updateThemeColorMeta(theme) {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  meta.setAttribute('content', theme === THEME_LANE ? '#0a0c11' : '#f4efe6');
}

function updateToggleButtonState(theme) {
  const buttons = document.querySelectorAll('[data-theme-toggle]');
  const currentLabel = theme === THEME_LANE ? 'Dark' : 'Light';
  const nextLabel = theme === THEME_LANE ? 'Light' : 'Dark';
  buttons.forEach(btn => {
    const labelEl = btn.querySelector('[data-theme-toggle-label]');
    // Button text shows the theme the user will switch TO, not the current one.
    if (labelEl) {
      labelEl.textContent = nextLabel;
    }
    // aria-label spells out BOTH the current theme and the action — the
    // visible label ("Light" / "Dark") alone is ambiguous out of context.
    const description = `Theme: ${currentLabel}. Switch to ${nextLabel} theme.`;
    btn.setAttribute('aria-label', description);
    btn.setAttribute('title', `Switch to ${nextLabel} theme`);
    // Pair this with aria-pressed so AT can announce the current state on
    // re-focus without re-parsing the label. Pressed = light/track theme.
    btn.setAttribute('aria-pressed', theme === THEME_TRACK ? 'true' : 'false');
  });
}

export function toggleTheme() {
  const next = getCurrentTheme() === THEME_LANE ? THEME_TRACK : THEME_LANE;
  setTheme(next);
}

export function initThemeToggle() {
  // Safety net: if the pre-paint bootstrap didn't run (e.g. CSP blocked
  // the inline script, or an older cached HTML without the marker), apply
  // the same policy from here so the page isn't left themeless.
  if (!document.documentElement.hasAttribute('data-theme')) {
    let resolved = resolveImplicitTheme();
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === THEME_LANE || stored === THEME_TRACK) resolved = stored;
    } catch (_) { /* ignore */ }
    document.documentElement.setAttribute('data-theme', resolved);
  }

  updateThemeColorMeta(getCurrentTheme());
  updateToggleButtonState(getCurrentTheme());

  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    if (btn.dataset.themeToggleBound === 'true') return;
    btn.dataset.themeToggleBound = 'true';
    btn.addEventListener('click', toggleTheme);
  });

  // Reactively follow the OS preference for users who haven't pinned a
  // choice via the toggle. Once they've explicitly toggled (localStorage
  // is set), we stop following the OS so their pick wins.
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e) => {
      let userPinned = false;
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        userPinned = stored === THEME_LANE || stored === THEME_TRACK;
      } catch (_) { /* ignore */ }
      if (userPinned) return;
      applyTheme(e.matches ? THEME_LANE : THEME_TRACK);
    };
    // Older Safari uses addListener; modern browsers use addEventListener.
    if (mql.addEventListener) mql.addEventListener('change', listener);
    else if (mql.addListener) mql.addListener(listener);
  }
}
