/**
 * 404 / Not Found Page
 *
 * No calculator logic — just wires up the shared nav (active link,
 * theme toggle, PWA update polling) so the chrome matches every other
 * page. The calculator bundle is deliberately not loaded; the 404 page
 * only needs the site chrome and the theme toggle.
 */

import { Navigation } from '../components/navigation.js';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Navigation.initialize());
} else {
  Navigation.initialize();
}
