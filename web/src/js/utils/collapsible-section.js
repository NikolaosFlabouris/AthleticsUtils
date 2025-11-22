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

  // Set initial state
  if (isCollapsed) {
    contentElement.classList.add('result-card__collapsible-content--collapsed');
    icon.classList.add('result-card__collapse-icon--collapsed');
    titleElement.setAttribute('aria-expanded', 'false');
  } else {
    titleElement.setAttribute('aria-expanded', 'true');
  }

  // Add click handler
  titleElement.addEventListener('click', () => {
    const nowCollapsed = contentElement.classList.toggle('result-card__collapsible-content--collapsed');
    icon.classList.toggle('result-card__collapse-icon--collapsed');
    titleElement.setAttribute('aria-expanded', nowCollapsed ? 'false' : 'true');

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
