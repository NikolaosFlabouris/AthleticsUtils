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
 *
 * Also adds arrow-key navigation between sibling options in the same
 * role="group" container. Enter/Space still activate (default button
 * behaviour) — arrows only move focus, matching the WAI-ARIA Authoring
 * Practices for toggle-button groups.
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

  // Arrow-key navigation between sibling options in the same role="group".
  // Delegated on body so dynamically-rendered toggles (e.g. the time
  // calculator's per-row operator) are covered without per-instance wiring.
  document.body.addEventListener('keydown', (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.matches?.(TOGGLE_BUTTON_SELECTOR)) return;

    const group = target.closest('[role="group"]');
    if (!group) return;
    const options = Array.from(group.querySelectorAll(TOGGLE_BUTTON_SELECTOR))
      .filter(opt => !opt.disabled);
    if (options.length < 2) return;
    const index = options.indexOf(target);
    if (index === -1) return;

    let nextIndex = -1;
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (index + 1) % options.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (index - 1 + options.length) % options.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = options.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    options[nextIndex].focus();
  });
}
