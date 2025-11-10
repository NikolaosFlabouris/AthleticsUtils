/**
 * Performance Calculator Page
 */

import { Navigation } from '../components/navigation.js';
import { BaseCalculator } from '../components/calculator-base.js';
import { lookupPoints, lookupPerformance, findEquivalentPerformances } from '../calculators/performance-lookup.js';
import { parsePerformance, formatPerformance } from '../utils/performance-parser.js';
import { eventConfigLoader } from '../data/event-config-loader.js';

class PerformanceCalculator extends BaseCalculator {
  constructor(selectors) {
    super(selectors);
    this.isHandTimed = false;
    this.calculationMode = 'performance'; // 'performance' or 'score'
  }

  setupDOMElements() {
    super.setupDOMElements();
    this.handTimingContainer = document.querySelector('#hand-timing-container');
    this.handTimingCheckbox = document.querySelector('#hand-timing-checkbox');
    this.modeTogglePerformance = document.querySelector('#mode-toggle-performance');
    this.modeToggleScore = document.querySelector('#mode-toggle-score');
    this.inputLabel = document.querySelector('#input-label');
    this.inputHelp = document.querySelector('#input-help');
  }

  setupEventListeners() {
    super.setupEventListeners();
    this.handTimingCheckbox?.addEventListener('change', (e) => {
      this.isHandTimed = e.target.checked;
    });

    // Mode toggle event listeners
    this.modeTogglePerformance?.addEventListener('click', () => {
      this.switchMode('performance');
    });

    this.modeToggleScore?.addEventListener('click', () => {
      this.switchMode('score');
    });
  }

  async initialize() {
    await super.initialize();
    Navigation.initialize();
  }

  switchMode(mode) {
    if (this.calculationMode === mode) return;

    this.calculationMode = mode;

    // Update toggle button states
    if (mode === 'performance') {
      this.modeTogglePerformance.classList.add('mode-toggle__option--active');
      this.modeToggleScore.classList.remove('mode-toggle__option--active');
      this.inputLabel.textContent = 'Performance';
    } else {
      this.modeToggleScore.classList.add('mode-toggle__option--active');
      this.modeTogglePerformance.classList.remove('mode-toggle__option--active');
      this.inputLabel.textContent = 'Score';
    }

    // Clear input and hide results
    this.performanceInput.value = '';
    this.performanceInput.classList.remove('input-error');
    this.hideResults();
    this.hideError();

    // Update placeholder and help text based on current event
    this.updateInputPlaceholder();
  }

  updateInputPlaceholder() {
    if (!this.currentEvent) {
      this.performanceInput.placeholder = 'Select an event first';
      this.inputHelp.textContent = 'Select an event to see format';
      return;
    }

    if (this.calculationMode === 'performance') {
      const eventInfo = eventConfigLoader.getEventInfo(this.currentEvent);
      if (eventInfo) {
        this.performanceInput.placeholder = eventInfo.placeholder || 'e.g., 10.5';
        this.inputHelp.textContent = eventInfo.format || 'Enter performance value';
      } else {
        this.performanceInput.placeholder = 'e.g., 10.5';
        this.inputHelp.textContent = 'Enter performance value';
      }
    } else {
      this.performanceInput.placeholder = 'e.g., 1200';
      this.inputHelp.textContent = 'Enter World Athletics score (whole number)';
    }
  }

  selectEvent(eventKey, displayName) {
    // Store previous hand timing state
    const previousHandTimingState = this.isHandTimed;

    // Call parent method
    super.selectEvent(eventKey, displayName);

    // Show/hide hand timing checkbox based on event support
    if (eventConfigLoader.supportsHandTiming(eventKey)) {
      this.handTimingContainer.style.display = 'block';
      // Maintain checkbox state if switching between hand-timing events
      this.handTimingCheckbox.checked = previousHandTimingState;
      this.isHandTimed = previousHandTimingState;
    } else {
      this.handTimingContainer.style.display = 'none';
      this.handTimingCheckbox.checked = false;
      this.isHandTimed = false;
    }

    // Update placeholder based on mode
    this.updateInputPlaceholder();
  }

  handleCalculate() {
    const inputValue = this.performanceInput.value.trim();

    // Check if empty or no event selected
    if (!this.currentGender || !this.currentEvent || !inputValue) {
      if (!inputValue) {
        this.performanceInput.classList.add('input-error');
        const errorMsg = this.calculationMode === 'performance'
          ? 'Please enter a performance value.'
          : 'Please enter a score.';
        this.showError(errorMsg);
      }
      return;
    }

    try {
      this.hideError();
      this.performanceInput.classList.remove('input-error');

      if (this.calculationMode === 'performance') {
        // Performance → Score mode
        this.handlePerformanceToScore(inputValue);
      } else {
        // Score → Performance mode
        this.handleScoreToPerformance(inputValue);
      }

    } catch (error) {
      console.error('Calculation error:', error);
      this.performanceInput.classList.add('input-error');
      this.showError('An error occurred during calculation. Please try again.');
    }
  }

  handlePerformanceToScore(performanceValue) {
    const normalizedPerformance = parsePerformance(performanceValue, this.currentEvent);

    if (!normalizedPerformance) {
      this.performanceInput.classList.add('input-error');
      this.showError('Invalid performance format. Please enter a valid number (e.g., 10.5 or 1:30.5)');
      return;
    }

    const result = lookupPoints(this.currentGender, this.currentEvent, normalizedPerformance, this.isHandTimed);

    if (!result) {
      this.performanceInput.classList.add('input-error');
      this.showError('Could not find points for this performance. Please check your input.');
      return;
    }

    const equivalents = findEquivalentPerformances(this.currentGender, result.points);
    this.displayPerformanceResults(result, equivalents, performanceValue);
  }

  handleScoreToPerformance(scoreValue) {
    const score = parseFloat(scoreValue);

    if (isNaN(score) || score <= 0) {
      this.performanceInput.classList.add('input-error');
      this.showError('Invalid score. Please enter a positive number.');
      return;
    }

    const result = lookupPerformance(this.currentGender, this.currentEvent, score, this.isHandTimed);

    if (!result) {
      this.performanceInput.classList.add('input-error');
      this.showError('Could not find performance for this score. Please check your input.');
      return;
    }

    const equivalents = findEquivalentPerformances(this.currentGender, Math.round(score));
    this.displayScoreResults(result, equivalents, Math.round(score));
  }

  displayPerformanceResults(result, equivalents, originalInput) {
    this.resultsContent.innerHTML = '';

    // Main result card
    const mainCard = document.createElement('div');
    mainCard.className = 'result-card';

    const title = document.createElement('div');
    title.className = 'result-card__title';
    const eventDisplayName = eventConfigLoader.getEventInfo(this.currentEvent)?.displayName || this.currentEvent;
    title.textContent = `${eventDisplayName} - ${this.capitalizeFirst(this.currentGender)}`;

    const points = document.createElement('div');
    points.className = 'result-card__points';
    points.textContent = `${result.points} points`;

    const content = document.createElement('div');
    content.className = 'result-card__content';

    if (result.appliedOffset) {
      // Hand timing offset was applied
      const finalTime = formatPerformance(String(result.originalPerformance + result.appliedOffset), this.currentEvent);
      const originalTime = formatPerformance(String(result.originalPerformance), this.currentEvent);
      const offset = formatPerformance(String(result.appliedOffset), this.currentEvent);
      content.textContent = `Adjusted Performance: ${finalTime} = ${originalTime} + ${offset} offset for hand timing`;
    } else if (result.exactMatch) {
      content.textContent = `Performance: ${formatPerformance(result.closestPerformance, this.currentEvent)}`;
    } else {
      content.innerHTML = `
        Your input: ${originalInput}<br>
        Closest match: ${formatPerformance(result.closestPerformance, this.currentEvent)}
      `;
    }

    mainCard.appendChild(title);
    mainCard.appendChild(points);
    mainCard.appendChild(content);
    this.resultsContent.appendChild(mainCard);

    // Equivalent performances card
    const equivCard = document.createElement('div');
    equivCard.className = 'result-card';

    const equivTitle = document.createElement('div');
    equivTitle.className = 'result-card__title';
    equivTitle.textContent = 'Equivalent Performances';

    const equivGrid = document.createElement('div');
    equivGrid.className = 'equivalencies-grid';

    for (const equiv of equivalents) {
      if (equiv.event === this.currentEvent) continue;

      const item = document.createElement('div');
      item.className = 'equivalency-item';

      const eventName = document.createElement('div');
      eventName.className = 'equivalency-item__event';
      const equivDisplayName = eventConfigLoader.getEventInfo(equiv.event)?.displayName || equiv.event;
      eventName.textContent = equivDisplayName;

      const performance = document.createElement('div');
      performance.className = 'equivalency-item__performance';
      performance.textContent = formatPerformance(equiv.performance, equiv.event);

      item.appendChild(eventName);
      item.appendChild(performance);
      equivGrid.appendChild(item);
    }

    equivCard.appendChild(equivTitle);
    equivCard.appendChild(equivGrid);
    this.resultsContent.appendChild(equivCard);

    this.showResults();
  }

  displayScoreResults(result, equivalents, submittedScore) {
    this.resultsContent.innerHTML = '';

    // Main result card
    const mainCard = document.createElement('div');
    mainCard.className = 'result-card';

    const title = document.createElement('div');
    title.className = 'result-card__title';
    const eventDisplayName = eventConfigLoader.getEventInfo(this.currentEvent)?.displayName || this.currentEvent;
    title.textContent = `${eventDisplayName} - ${this.capitalizeFirst(this.currentGender)}`;

    const points = document.createElement('div');
    points.className = 'result-card__points';
    points.textContent = `${submittedScore} points`;

    const content = document.createElement('div');
    content.className = 'result-card__content';

    if (result.appliedOffset) {
      // Hand timing adjustment was applied (offset is negative for HT)
      const htPerformance = formatPerformance(result.performance, this.currentEvent);
      const fatPerformance = formatPerformance(result.originalPerformance, this.currentEvent);
      const offset = formatPerformance(String(Math.abs(result.appliedOffset)), this.currentEvent);
      content.textContent = `Adjusted Performance: ${htPerformance} = ${fatPerformance} - ${offset} offset for hand timing`;
    } else {
      const performance = formatPerformance(result.performance, this.currentEvent);
      content.textContent = `Performance: ${performance}`;
    }

    mainCard.appendChild(title);
    mainCard.appendChild(points);
    mainCard.appendChild(content);
    this.resultsContent.appendChild(mainCard);

    // Equivalent performances card
    const equivCard = document.createElement('div');
    equivCard.className = 'result-card';

    const equivTitle = document.createElement('div');
    equivTitle.className = 'result-card__title';
    equivTitle.textContent = 'Equivalent Performances';

    const equivGrid = document.createElement('div');
    equivGrid.className = 'equivalencies-grid';

    for (const equiv of equivalents) {
      if (equiv.event === this.currentEvent) continue;

      const item = document.createElement('div');
      item.className = 'equivalency-item';

      const eventName = document.createElement('div');
      eventName.className = 'equivalency-item__event';
      const equivDisplayName = eventConfigLoader.getEventInfo(equiv.event)?.displayName || equiv.event;
      eventName.textContent = equivDisplayName;

      const performance = document.createElement('div');
      performance.className = 'equivalency-item__performance';
      performance.textContent = formatPerformance(equiv.performance, equiv.event);

      item.appendChild(eventName);
      item.appendChild(performance);
      equivGrid.appendChild(item);
    }

    equivCard.appendChild(equivTitle);
    equivCard.appendChild(equivGrid);
    this.resultsContent.appendChild(equivCard);

    this.showResults();
  }
}

// Initialize when DOM is ready
const calculator = new PerformanceCalculator({
  genderSelect: '#gender-select',
  eventInput: '#event-input',
  eventDropdown: '#event-dropdown',
  performanceInput: '#performance-input',
  calculateBtn: '#calculate-btn',
  resultsContainer: '#results-container',
  resultsContent: '#results-content',
  loadingIndicator: '#loading-indicator',
  errorMessage: '#error-message'
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => calculator.initialize());
} else {
  calculator.initialize();
}
