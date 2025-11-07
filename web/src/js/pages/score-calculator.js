/**
 * Performance Calculator Page
 */

import { Navigation } from '../components/navigation.js';
import { BaseCalculator } from '../components/calculator-base.js';
import { lookupPoints, findEquivalentPerformances } from '../calculators/performance-lookup.js';
import { parsePerformance, formatPerformance } from '../utils/performance-parser.js';

class PerformanceCalculator extends BaseCalculator {
  async initialize() {
    await super.initialize();
    Navigation.initialize();
  }

  handleCalculate() {
    const performanceValue = this.performanceInput.value.trim();

    if (!this.currentGender || !this.currentEvent || !performanceValue) {
      return;
    }

    try {
      this.hideError();

      const normalizedPerformance = parsePerformance(performanceValue, this.currentEvent);

      if (!normalizedPerformance) {
        this.showError('Invalid performance format. Please enter a valid number (e.g., 10.5 or 1:30.5)');
        return;
      }

      const result = lookupPoints(this.currentGender, this.currentEvent, normalizedPerformance);

      if (!result) {
        this.showError('Could not find points for this performance. Please check your input.');
        return;
      }

      const equivalents = findEquivalentPerformances(this.currentGender, result.points);
      this.displayResults(result, equivalents, performanceValue);

    } catch (error) {
      console.error('Calculation error:', error);
      this.showError('An error occurred during calculation. Please try again.');
    }
  }

  displayResults(result, equivalents, originalInput) {
    this.resultsContent.innerHTML = '';

    // Main result card
    const mainCard = document.createElement('div');
    mainCard.className = 'result-card';

    const title = document.createElement('div');
    title.className = 'result-card__title';
    title.textContent = `${this.currentEvent} - ${this.capitalizeFirst(this.currentGender)}`;

    const points = document.createElement('div');
    points.className = 'result-card__points';
    points.textContent = `${result.points} points`;

    const content = document.createElement('div');
    content.className = 'result-card__content';

    if (result.exactMatch) {
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
