/**
 * Home Page
 */

import { Navigation } from '../components/navigation.js';
import { scoringDataLoader } from '../data/scoring-data-loader.js';
import { createIcon } from '../components/icon.js';

/**
 * Add icons to tool card titles
 */
function addToolCardIcons() {
  const iconMap = {
    'Pace Calculator': 'timer',
    'World Athletics Score Calculator': 'trophy',
    'Combined Event Score Calculator': 'layers'
  };

  const titles = document.querySelectorAll('.tool-card__title');

  titles.forEach(title => {
    const titleText = title.textContent.trim();
    const iconName = iconMap[titleText];

    if (iconName && !title.querySelector('.icon')) {
      const icon = createIcon(iconName, 'icon--md');
      title.prepend(icon);
    }
  });
}

/**
 * Add arrow icons to calculator buttons
 */
function addButtonIcons() {
  const buttons = document.querySelectorAll('.tool-card .btn');

  buttons.forEach(button => {
    if (!button.querySelector('.icon')) {
      const arrow = createIcon('arrow-right', 'icon--sm');
      button.appendChild(arrow);
    }
  });
}

/**
 * Add icons to About section links
 */
function addInfoSectionIcons() {
  // Add GitHub icon to GitHub link
  const githubLink = document.querySelector('.link-github');
  if (githubLink && !githubLink.querySelector('.icon')) {
    const githubIcon = createIcon('github', 'icon--sm');
    githubLink.prepend(githubIcon);
    githubLink.style.display = 'inline-flex';
    githubLink.style.alignItems = 'center';
    githubLink.style.gap = 'var(--spacing-xs)';
  }

  // Add heart icon to donation link
  const donateLink = document.querySelector('.link-donate');
  if (donateLink && !donateLink.querySelector('.icon')) {
    const heartIcon = createIcon('heart', 'icon--sm');
    donateLink.prepend(heartIcon);
    donateLink.style.display = 'inline-flex';
    donateLink.style.alignItems = 'center';
    donateLink.style.gap = 'var(--spacing-xs)';
  }
}

async function initialize() {
  Navigation.initialize();
  addToolCardIcons();
  addButtonIcons();
  addInfoSectionIcons();

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
