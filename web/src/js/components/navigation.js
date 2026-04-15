/**
 * Navigation Component
 * Handles active state and navigation rendering with icons
 */

import { createIcon } from './icon.js';
import { initAriaToggleSync } from '../utils/aria-toggle-sync.js';

export class Navigation {
  static initialize() {
    this.updateActiveLink();
    this.addNavigationIcons();
    initAriaToggleSync();
  }

  static updateActiveLink() {
    const currentPath = window.location.pathname;
    const links = document.querySelectorAll('.navigation__link');

    links.forEach(link => {
      const href = link.getAttribute('href');

      // Check if current path matches link
      const isActive =
        (href === '/' && (currentPath === '/' || currentPath === '/index.html')) ||
        (href !== '/' && currentPath.includes(href.replace('.html', '')));

      if (isActive) {
        link.classList.add('navigation__link--active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('navigation__link--active');
        link.removeAttribute('aria-current');
      }
    });
  }

  static addNavigationIcons() {
    // Map navigation paths to icon names
    const iconMap = {
      '/': 'home',
      '/index.html': 'home',
      '/calculators/pace.html': 'timer',
      '/calculators/score.html': 'trophy',
      '/calculators/combined-events.html': 'layers'
    };

    const links = document.querySelectorAll('.navigation__link');

    links.forEach(link => {
      const href = link.getAttribute('href');
      const iconName = iconMap[href];

      if (iconName) {
        // Check if icon already added (avoid duplicates)
        if (!link.querySelector('.icon')) {
          const icon = createIcon(iconName, 'icon--sm');
          link.prepend(icon);
        }
      }
    });
  }
}
