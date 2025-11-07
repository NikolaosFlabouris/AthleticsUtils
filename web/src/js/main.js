/**
 * Main Application Entry Point
 */

import { scoringDataLoader } from './data/scoring-data-loader.js';
import { lookupPoints, findEquivalentPerformances } from './calculators/performance-lookup.js';
import { parsePerformance, formatPerformance } from './utils/performance-parser.js';

// DOM Elements
let genderSelect;
let eventSelect;
let performanceInput;
let calculateBtn;
let resultsContainer;
let resultsContent;
let loadingIndicator;
let errorMessage;

// State
let currentGender = '';
let currentEvent = '';

/**
 * Initialize the application
 */
async function init() {
  // Get DOM elements
  genderSelect = document.getElementById('gender-select');
  eventSelect = document.getElementById('event-select');
  performanceInput = document.getElementById('performance-input');
  calculateBtn = document.getElementById('calculate-btn');
  resultsContainer = document.getElementById('results-container');
  resultsContent = document.getElementById('results-content');
  loadingIndicator = document.getElementById('loading-indicator');
  errorMessage = document.getElementById('error-message');

  // Set up event listeners
  setupEventListeners();

  // Load scoring data
  await loadScoringData();

  // Register service worker for PWA
  registerServiceWorker();
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  genderSelect.addEventListener('change', handleGenderChange);
  eventSelect.addEventListener('change', handleEventChange);
  performanceInput.addEventListener('input', handlePerformanceInput);
  performanceInput.addEventListener('keypress', handleKeyPress);
  calculateBtn.addEventListener('click', handleCalculate);
}

/**
 * Load scoring data
 */
async function loadScoringData() {
  try {
    showLoading(true);
    hideError();

    await scoringDataLoader.load();

    // Populate gender dropdown
    populateGenderDropdown();

    showLoading(false);
  } catch (error) {
    console.error('Error loading scoring data:', error);
    showError('Failed to load scoring tables. Please refresh the page to try again.');
    showLoading(false);
  }
}

/**
 * Populate gender dropdown
 */
function populateGenderDropdown() {
  const genders = scoringDataLoader.getGenders();

  // Clear existing options except the first (placeholder)
  genderSelect.innerHTML = '<option value="">Select gender...</option>';

  for (const gender of genders) {
    const option = document.createElement('option');
    option.value = gender;
    option.textContent = capitalizeFirst(gender);
    genderSelect.appendChild(option);
  }
}

/**
 * Handle gender selection change
 */
function handleGenderChange(e) {
  currentGender = e.target.value;

  if (!currentGender) {
    eventSelect.disabled = true;
    eventSelect.innerHTML = '<option value="">Select event...</option>';
    performanceInput.disabled = true;
    calculateBtn.disabled = true;
    hideResults();
    return;
  }

  // Populate events for selected gender
  populateEventDropdown(currentGender);
  eventSelect.disabled = false;
  performanceInput.disabled = true;
  calculateBtn.disabled = true;
  hideResults();
}

/**
 * Populate event dropdown for a gender
 */
function populateEventDropdown(gender) {
  const allEvents = scoringDataLoader.getAllEvents(gender);

  // Clear existing options
  eventSelect.innerHTML = '<option value="">Select event...</option>';

  // Group events by category
  const eventsByCategory = {};

  for (const { event, category } of allEvents) {
    if (!eventsByCategory[category]) {
      eventsByCategory[category] = [];
    }
    eventsByCategory[category].push(event);
  }

  // Add events grouped by category
  for (const [category, events] of Object.entries(eventsByCategory).sort()) {
    const optgroup = document.createElement('optgroup');
    optgroup.label = formatCategoryName(category);

    for (const event of events.sort()) {
      const option = document.createElement('option');
      option.value = event;
      option.textContent = event;
      optgroup.appendChild(option);
    }

    eventSelect.appendChild(optgroup);
  }
}

/**
 * Handle event selection change
 */
function handleEventChange(e) {
  currentEvent = e.target.value;

  if (!currentEvent) {
    performanceInput.disabled = true;
    calculateBtn.disabled = true;
    hideResults();
    return;
  }

  performanceInput.disabled = false;
  performanceInput.value = '';
  performanceInput.focus();
  calculateBtn.disabled = true;
  hideResults();
}

/**
 * Handle performance input
 */
function handlePerformanceInput(e) {
  const value = e.target.value.trim();
  calculateBtn.disabled = !value;
  hideError();
}

/**
 * Handle Enter key press in performance input
 */
function handleKeyPress(e) {
  if (e.key === 'Enter' && !calculateBtn.disabled) {
    handleCalculate();
  }
}

/**
 * Handle calculate button click
 */
function handleCalculate() {
  const performanceValue = performanceInput.value.trim();

  if (!currentGender || !currentEvent || !performanceValue) {
    return;
  }

  try {
    hideError();

    // Parse the performance
    const normalizedPerformance = parsePerformance(performanceValue, currentEvent);

    if (!normalizedPerformance) {
      showError('Invalid performance format. Please enter a valid number (e.g., 10.5 or 1:30.5)');
      return;
    }

    // Lookup points
    const result = lookupPoints(currentGender, currentEvent, normalizedPerformance);

    if (!result) {
      showError('Could not find points for this performance. Please check your input.');
      return;
    }

    // Find equivalent performances
    const equivalents = findEquivalentPerformances(currentGender, result.points);

    // Display results
    displayResults(result, equivalents, performanceValue);

  } catch (error) {
    console.error('Calculation error:', error);
    showError('An error occurred during calculation. Please try again.');
  }
}

/**
 * Display calculation results
 */
function displayResults(result, equivalents, originalInput) {
  resultsContent.innerHTML = '';

  // Main result card
  const mainCard = document.createElement('div');
  mainCard.className = 'result-card';

  const title = document.createElement('div');
  title.className = 'result-card__title';
  title.textContent = `${currentEvent} - ${capitalizeFirst(currentGender)}`;

  const points = document.createElement('div');
  points.className = 'result-card__points';
  points.textContent = `${result.points} points`;

  const content = document.createElement('div');
  content.className = 'result-card__content';

  if (result.exactMatch) {
    content.textContent = `Performance: ${formatPerformance(result.closestPerformance, currentEvent)}`;
  } else {
    content.innerHTML = `
      Your input: ${originalInput}<br>
      Closest match: ${formatPerformance(result.closestPerformance, currentEvent)}
    `;
  }

  mainCard.appendChild(title);
  mainCard.appendChild(points);
  mainCard.appendChild(content);

  resultsContent.appendChild(mainCard);

  // Equivalent performances card
  const equivCard = document.createElement('div');
  equivCard.className = 'result-card';

  const equivTitle = document.createElement('div');
  equivTitle.className = 'result-card__title';
  equivTitle.textContent = 'Equivalent Performances';

  const equivGrid = document.createElement('div');
  equivGrid.className = 'equivalencies-grid';

  // Filter out the current event and add all others
  for (const equiv of equivalents) {
    if (equiv.event === currentEvent) {
      continue; // Skip the current event
    }

    const item = document.createElement('div');
    item.className = 'equivalency-item';

    const eventName = document.createElement('div');
    eventName.className = 'equivalency-item__event';
    eventName.textContent = equiv.event;

    const performance = document.createElement('div');
    performance.className = 'equivalency-item__performance';
    performance.textContent = formatPerformance(equiv.performance, equiv.event);

    item.appendChild(eventName);
    item.appendChild(performance);

    equivGrid.appendChild(item);
  }

  equivCard.appendChild(equivTitle);
  equivCard.appendChild(equivGrid);

  resultsContent.appendChild(equivCard);

  // Show results
  resultsContainer.classList.remove('hidden');
}

/**
 * Show/hide loading indicator
 */
function showLoading(show) {
  if (show) {
    loadingIndicator.classList.remove('hidden');
  } else {
    loadingIndicator.classList.add('hidden');
  }
}

/**
 * Show error message
 */
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
}

/**
 * Hide error message
 */
function hideError() {
  errorMessage.classList.add('hidden');
}

/**
 * Hide results
 */
function hideResults() {
  resultsContainer.classList.add('hidden');
}

/**
 * Register service worker for PWA
 */
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      // The service worker will be generated by vite-plugin-pwa
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
    } catch (error) {
      console.log('Service Worker registration failed:', error);
    }
  }
}

/**
 * Capitalize first letter of a string
 */
function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format category name for display
 */
function formatCategoryName(category) {
  // Convert snake_case or kebab-case to Title Case
  return category
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => capitalizeFirst(word))
    .join(' ');
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
