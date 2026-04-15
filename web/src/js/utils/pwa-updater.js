/**
 * PWA auto-update utility.
 *
 * The site is configured with `registerType: 'autoUpdate'` + `skipWaiting` +
 * `clientsClaim` in vite.config.js, so whenever a new service worker finishes
 * installing it activates immediately and takes over existing tabs. The catch
 * is that the browser only *discovers* a new service worker when:
 *   - the page navigates / reloads, or
 *   - something explicitly calls `registration.update()`.
 *
 * Without a nudge, an installed PWA that stays open for days will happily
 * keep serving yesterday's JS forever. This module plugs the gap:
 *
 *   1. When the tab becomes visible (including on PWA cold-launch resume from
 *      bfcache), trigger a manual update check.
 *   2. Poll `registration.update()` on a 60-minute interval for sessions that
 *      stay in the foreground.
 *   3. When a new worker finishes installing (and we already have a controller
 *      — i.e. this is an update, not a first-time install), show a small
 *      non-blocking toast that lets the user reload on their own terms.
 *
 * The toast is intentionally opt-in because the calculators accept multi-step
 * input and a forced mid-session reload would lose work.
 */

const UPDATE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
let toastElement = null;

/**
 * Initialise the PWA update flow. Safe to call on every page — it's a no-op
 * in browsers without service worker support and in development (Vite serves
 * no SW for `npm run dev`).
 */
export function initPwaAutoUpdate() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.ready
    .then(registration => {
      watchForUpdates(registration);
      schedulePeriodicChecks(registration);
      checkOnVisibility(registration);
    })
    .catch(() => {
      // Registration failed or blocked — nothing we can do.
    });
}

function watchForUpdates(registration) {
  const maybePrompt = worker => {
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        // There is already a controlling worker, so this "installed" worker
        // is an *update*, not a first-time install. Surface the toast.
        showUpdateToast();
      }
    });
  };

  // A worker may already be waiting from a previous tab lifecycle.
  if (registration.waiting && navigator.serviceWorker.controller) {
    showUpdateToast();
  }

  // Watch for updates discovered after we registered.
  registration.addEventListener('updatefound', () => {
    maybePrompt(registration.installing);
  });
}

function schedulePeriodicChecks(registration) {
  const tick = () => {
    registration.update().catch(() => {});
  };
  window.setInterval(tick, UPDATE_INTERVAL_MS);
}

function checkOnVisibility(registration) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      registration.update().catch(() => {});
    }
  });
}

function showUpdateToast() {
  if (toastElement) return; // Already shown

  const toast = document.createElement('div');
  toast.className = 'pwa-update-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <span class="pwa-update-toast__message">A new version is available.</span>
    <button type="button" class="pwa-update-toast__action">Refresh</button>
    <button type="button" class="pwa-update-toast__dismiss" aria-label="Dismiss update notification">&times;</button>
  `;

  toast.querySelector('.pwa-update-toast__action').addEventListener('click', () => {
    window.location.reload();
  });
  toast.querySelector('.pwa-update-toast__dismiss').addEventListener('click', () => {
    toast.remove();
    toastElement = null;
  });

  document.body.appendChild(toast);
  toastElement = toast;
}
