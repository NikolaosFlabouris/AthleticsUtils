/**
 * Privacy Page
 *
 * No calculator logic — just wires up the shared nav (active link,
 * theme toggle, PWA update polling) and lets the static content render.
 */

import { Navigation } from '../components/navigation.js';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Navigation.initialize());
} else {
  Navigation.initialize();
}
