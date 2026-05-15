/**
 * Navigation Component
 *
 * Marks the current page's nav link as active and initialises shared
 * features (aria-toggle sync, PWA update polling, theme toggle).
 *
 * The navigation markup uses <nav class="tabs"><a>...</a></nav> in the
 * new themed design. Links are matched against window.location.pathname.
 */

import { initAriaToggleSync } from '../utils/aria-toggle-sync.js';
import { initPwaAutoUpdate } from '../utils/pwa-updater.js';
import { initThemeToggle } from './theme-toggle.js';

export class Navigation {
  static initialize() {
    this.updateActiveLink();
    initAriaToggleSync();
    initPwaAutoUpdate();
    initThemeToggle();
  }

  static updateActiveLink() {
    const currentPath = window.location.pathname;
    const links = document.querySelectorAll('nav.tabs a, .navigation__link');

    links.forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;

      const isActive =
        (href === '/' && (currentPath === '/' || currentPath === '/index.html')) ||
        (href !== '/' && currentPath.includes(href.replace('.html', '')));

      if (isActive) {
        link.classList.add('active');
        link.classList.add('navigation__link--active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.classList.remove('navigation__link--active');
        link.removeAttribute('aria-current');
      }
    });
  }
}
