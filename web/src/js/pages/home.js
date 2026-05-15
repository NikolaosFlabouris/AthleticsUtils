/**
 * Home Page
 */

import { Navigation } from '../components/navigation.js';
import { scoringDataLoader } from '../data/scoring-data-loader.js';

async function initialize() {
  Navigation.initialize();

  // Preload the most-likely-needed scoring gender in the background so the
  // Score Calculator is ready on navigation. We deliberately fetch just the
  // saved/default gender (one file, ~1.5 MB) instead of every gender.
  try {
    const preloadGender = sessionStorage.getItem('selectedGender') || 'men';
    await scoringDataLoader.loadGender(preloadGender);
  } catch (error) {
    console.log('Background data preload failed (non-critical):', error);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}
