/**
 * Home Page
 */

import { Navigation } from '../components/navigation.js';
import { scoringDataLoader } from '../data/scoring-data-loader.js';

async function initialize() {
  Navigation.initialize();

  // Preload scoring data in background for faster page transitions
  try {
    await scoringDataLoader.load();
    console.log('Scoring data preloaded successfully');
  } catch (error) {
    console.log('Background data preload failed (non-critical):', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
