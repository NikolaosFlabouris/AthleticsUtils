/**
 * Navigation Component
 * Handles active state and navigation rendering
 */

export class Navigation {
  static initialize() {
    this.updateActiveLink();
  }

  static updateActiveLink() {
    const currentPath = window.location.pathname;
    const links = document.querySelectorAll('.navigation__link');

    links.forEach(link => {
      const href = link.getAttribute('href');

      // Check if current path matches link
      if (
        (href === '/' && (currentPath === '/' || currentPath === '/index.html')) ||
        (href !== '/' && currentPath.includes(href.replace('.html', '')))
      ) {
        link.classList.add('navigation__link--active');
      } else {
        link.classList.remove('navigation__link--active');
      }
    });
  }
}
