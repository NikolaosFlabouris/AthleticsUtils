/**
 * Aria Toggle Sync
 *
 * Mirrors the `.mode-toggle__option--active` / `.gender-toggle__option--active`
 * CSS class onto the `aria-pressed` attribute for all toggle-style buttons.
 *
 * The calculators change active state in many places across their code, and
 * keeping every touchpoint in sync with the ARIA state by hand is error-prone.
 * This observer watches class changes on the existing toggle buttons and
 * updates the attribute automatically — source of truth stays the CSS class.
 */

const TOGGLE_BUTTON_SELECTOR = '.mode-toggle__option, .gender-toggle__option';
const ACTIVE_CLASS_NAMES = [
  'mode-toggle__option--active',
  'gender-toggle__option--active'
];

function isActive(el) {
  return ACTIVE_CLASS_NAMES.some(cls => el.classList.contains(cls));
}

function syncButton(el) {
  el.setAttribute('aria-pressed', isActive(el) ? 'true' : 'false');
}

let initialized = false;

export function initAriaToggleSync() {
  if (initialized) return;
  initialized = true;

  // Set initial state for all buttons currently in the DOM.
  document.querySelectorAll(TOGGLE_BUTTON_SELECTOR).forEach(syncButton);

  // Observe future class changes and new buttons.
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        if (mutation.target.matches?.(TOGGLE_BUTTON_SELECTOR)) {
          syncButton(mutation.target);
        }
      } else if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          if (node.matches?.(TOGGLE_BUTTON_SELECTOR)) {
            syncButton(node);
          }
          node.querySelectorAll?.(TOGGLE_BUTTON_SELECTOR).forEach(syncButton);
        });
      }
    }
  });

  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class']
  });
}
