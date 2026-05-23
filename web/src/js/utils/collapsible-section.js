/**
 * Collapsible Section Utility
 * Creates collapsible sections with session storage to remember state
 */

/**
 * Make a result card section collapsible
 * @param {HTMLElement} titleElement - The title element to make clickable
 * @param {HTMLElement} contentElement - The content element to show/hide
 * @param {string} storageKey - Unique key for session storage
 * @param {boolean} defaultCollapsed - Whether to start collapsed (default: true)
 */
let collapsibleIdCounter = 0;

export function makeCollapsible(titleElement, contentElement, storageKey, defaultCollapsed = true) {
  // Get stored state or use default
  const storedState = sessionStorage.getItem(storageKey);
  const isCollapsed = storedState !== null ? storedState === 'true' : defaultCollapsed;

  // Create collapse icon
  const icon = document.createElement('span');
  icon.className = 'result-card__collapse-icon';
  icon.textContent = '▼';
  icon.setAttribute('aria-hidden', 'true');

  // Add collapsible class to title
  titleElement.classList.add('result-card__title--collapsible');
  titleElement.insertBefore(icon, titleElement.firstChild);

  // Wrap content in collapsible wrapper
  contentElement.classList.add('result-card__collapsible-content');

  // Pair the title (acting as a button) with the panel it controls. Ensure
  // the content has an id so aria-controls can reference it; assistive tech
  // can then jump from the trigger straight to the revealed panel.
  if (!contentElement.id) {
    contentElement.id = `collapsible-content-${++collapsibleIdCounter}`;
  }
  titleElement.setAttribute('aria-controls', contentElement.id);

  // Set initial state
  if (isCollapsed) {
    contentElement.classList.add('result-card__collapsible-content--collapsed');
    icon.classList.add('result-card__collapse-icon--collapsed');
    titleElement.setAttribute('aria-expanded', 'false');
    contentElement.setAttribute('aria-hidden', 'true');
  } else {
    titleElement.setAttribute('aria-expanded', 'true');
    contentElement.setAttribute('aria-hidden', 'false');
  }

  // Add click handler
  titleElement.addEventListener('click', () => {
    const nowCollapsed = contentElement.classList.toggle('result-card__collapsible-content--collapsed');
    icon.classList.toggle('result-card__collapse-icon--collapsed');
    titleElement.setAttribute('aria-expanded', nowCollapsed ? 'false' : 'true');
    contentElement.setAttribute('aria-hidden', nowCollapsed ? 'true' : 'false');

    // Save state to session storage
    sessionStorage.setItem(storageKey, nowCollapsed.toString());
  });

  // Add keyboard accessibility
  titleElement.setAttribute('role', 'button');
  titleElement.setAttribute('tabindex', '0');
  titleElement.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      titleElement.click();
    }
  });
}
