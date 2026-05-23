/**
 * Combined Event Score Calculator Page Controller
 * Handles UI interactions and calculations for combined events (Decathlon, Heptathlon, Pentathlon)
 */

import { Navigation } from '../components/navigation.js';
import { combinedEventsConfigLoader } from '../data/combined-events-config-loader.js';
import {
  calculateEventScore,
  applyHandTimingOffset,
  validatePerformance,
  convertPerformanceToValue
} from '../utils/combined-events-scorer.js';

/**
 * Combined Events Calculator
 */
class CombinedEventsCalculator {
  constructor() {
    // State
    this.currentGender = null;
    this.currentCombinedEvent = null;
    this.performances = {}; // { eventKey: { value, isHandTimed, score, inputValue } }
    this.totalScore = 0;
    this.completedCount = 0;
    this.eventConfig = null;

    // Debounce timer
    this.debounceTimers = {};

    // DOM elements (will be initialized)
    this.genderToggleMen = null;
    this.genderToggleWomen = null;
    this.combinedEventSelect = null;
    this.clearAllBtn = null;
    this.calculatorForm = null;
    this.progressIndicator = null;
    this.progressText = null;
    this.daysContainer = null;
    this.runningTotals = null;
    this.runningTotalsContent = null;
    this.resultsContainer = null;
    this.finalScore = null;
    this.loadingIndicator = null;
    this.errorMessage = null;
  }

  /**
   * Initialize the calculator
   */
  async initialize() {
    try {
      Navigation.initialize();

      this.showLoading();

      // Load combined events config
      await combinedEventsConfigLoader.loadConfig();

      // Initialize DOM elements
      this.initializeElements();

      // Setup event listeners
      this.setupEventListeners();

      // Initialize gender toggle from session storage
      this.initializeGenderToggle();

      this.hideLoading();
    } catch (error) {
      console.error('Error initializing calculator:', error);
      this.showError('Failed to initialize calculator. Please refresh the page.');
      this.hideLoading();
    }
  }

  /**
   * Initialize gender toggle from session storage
   */
  initializeGenderToggle() {
    // Load saved gender from session storage, default to 'men'
    const savedGender = sessionStorage.getItem('selectedGender') || 'men';

    // Set the initial gender and trigger UI update
    this.handleGenderToggle(savedGender);
  }

  /**
   * Initialize DOM elements
   */
  initializeElements() {
    this.genderToggleMen = document.getElementById('gender-toggle-men');
    this.genderToggleWomen = document.getElementById('gender-toggle-women');
    this.combinedEventSelect = document.getElementById('combined-event-select');
    this.clearAllBtn = document.getElementById('clear-all-btn');
    this.calculatorForm = document.getElementById('calculator-form');
    this.progressIndicator = document.getElementById('progress-indicator');
    this.progressText = document.getElementById('progress-text');
    this.daysContainer = document.getElementById('days-container');
    this.runningTotals = document.getElementById('running-totals');
    this.runningTotalsContent = document.getElementById('running-totals-content');
    this.resultsContainer = document.getElementById('results-container');
    this.finalScore = document.getElementById('final-score');
    this.loadingIndicator = document.getElementById('loading-indicator');
    this.errorMessage = document.getElementById('error-message');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Gender toggle buttons
    this.genderToggleMen?.addEventListener('click', () => this.handleGenderToggle('men'));
    this.genderToggleWomen?.addEventListener('click', () => this.handleGenderToggle('women'));

    // Combined event selection change
    this.combinedEventSelect?.addEventListener('change', () => this.handleCombinedEventChange());

    // Clear all button
    this.clearAllBtn?.addEventListener('click', () => this.handleClearAll());
  }

  /**
   * Populate combined event selector based on gender
   */
  async populateCombinedEventSelector(gender) {
    try {
      const combinedEvents = await combinedEventsConfigLoader.getCombinedEvents(gender);

      // Clear existing options
      this.combinedEventSelect.innerHTML = '';

      const entries = Object.entries(combinedEvents);

      // Add options for each combined event
      entries.forEach(([key, event], index) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = event.displayName;
        if (index === 0) {
          option.selected = true;
        }
        this.combinedEventSelect.appendChild(option);
      });

      // Trigger change event to load the first event automatically
      if (entries.length > 0) {
        await this.handleCombinedEventChange();
      }
    } catch (error) {
      console.error('Error populating combined event selector:', error);
      this.showError('Failed to load combined events.');
    }
  }

  /**
   * Handle gender toggle button click
   */
  async handleGenderToggle(gender) {
    // Don't do anything if clicking the already selected gender
    if (this.currentGender === gender) {
      return;
    }

    this.currentGender = gender;

    // Save to session storage
    sessionStorage.setItem('selectedGender', gender);

    // Remove active class from all gender toggle buttons
    this.genderToggleMen?.classList.remove('gender-toggle__option--active');
    this.genderToggleWomen?.classList.remove('gender-toggle__option--active');

    // Add active class to the selected gender button
    // (aria-pressed is mirrored automatically — see utils/aria-toggle-sync.js)
    if (gender === 'men') {
      this.genderToggleMen?.classList.add('gender-toggle__option--active');
    } else if (gender === 'women') {
      this.genderToggleWomen?.classList.add('gender-toggle__option--active');
    }

    // Reset selection and form
    this.combinedEventSelect.value = '';
    this.currentCombinedEvent = null;
    this.hideForm();
    this.hideResults();

    // Repopulate combined event selector
    await this.populateCombinedEventSelector(this.currentGender);
  }

  /**
   * Handle combined event selection change
   */
  async handleCombinedEventChange() {
    const selectedEvent = this.combinedEventSelect.value;

    if (!selectedEvent) {
      this.hideForm();
      this.hideResults();
      this.clearAllBtn.classList.add('hidden');
      return;
    }

    this.currentCombinedEvent = selectedEvent;

    // Reset performances. `calculateTotals()` below re-derives totalScore and
    // completedCount from this empty map, so no need to zero them here too.
    this.performances = {};

    // Load event configuration
    this.eventConfig = await combinedEventsConfigLoader.getCombinedEvent(
      this.currentGender,
      this.currentCombinedEvent
    );

    // Generate event input fields
    await this.generateEventInputs();

    // Show form and clear button
    this.calculatorForm.classList.remove('hidden');
    this.clearAllBtn.classList.remove('hidden');
    this.resultsContainer.classList.remove('hidden');

    // Recompute everything from the now-empty performances map. This zeroes
    // the Final Score (previously left stale at the prior event's total),
    // resets the progress counter, and primes the Running Total columns with
    // pending rows for the new event's disciplines.
    this.calculateTotals();
  }

  /**
   * Generate event input fields based on selected combined event
   */
  async generateEventInputs() {
    // Clear existing inputs
    this.daysContainer.innerHTML = '';

    if (!this.eventConfig) return;

    const eventsArrays = this.eventConfig.events; // Array of arrays (for multi-day events)
    const isSingleDay = eventsArrays.length === 1;

    // Create a section for each day
    for (let dayIndex = 0; dayIndex < eventsArrays.length; dayIndex++) {
      const dayEvents = eventsArrays[dayIndex];
      const dayNumber = dayIndex + 1;

      // Create day section
      const daySection = document.createElement('div');
      daySection.className = 'day-section';
      daySection.setAttribute('data-day', dayNumber);

      // Add day header (only for multi-day events)
      if (!isSingleDay) {
        const dayHeader = document.createElement('details');
        dayHeader.open = true;

        const summary = document.createElement('summary');
        summary.className = 'day-section__header';
        summary.textContent = `Day ${dayNumber}`;
        dayHeader.appendChild(summary);

        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'day-section__content';

        // Generate inputs for this day
        for (const eventKey of dayEvents) {
          const eventParams = await combinedEventsConfigLoader.getEventParameters(
            this.currentGender,
            eventKey
          );
          const isHandTimeable = await combinedEventsConfigLoader.isHandTimeable(eventKey);

          if (eventParams) {
            const inputGroup = this.createEventInputGroup(eventKey, eventParams, isHandTimeable);
            contentWrapper.appendChild(inputGroup);
          }
        }

        dayHeader.appendChild(contentWrapper);
        daySection.appendChild(dayHeader);
      } else {
        // Single day event - no accordion
        const dayHeader = document.createElement('h4');
        dayHeader.className = 'day-section__header';
        dayHeader.textContent = this.eventConfig.displayName;
        daySection.appendChild(dayHeader);

        // Generate inputs
        for (const eventKey of dayEvents) {
          const eventParams = await combinedEventsConfigLoader.getEventParameters(
            this.currentGender,
            eventKey
          );
          const isHandTimeable = await combinedEventsConfigLoader.isHandTimeable(eventKey);

          if (eventParams) {
            const inputGroup = this.createEventInputGroup(eventKey, eventParams, isHandTimeable);
            daySection.appendChild(inputGroup);
          }
        }
      }

      this.daysContainer.appendChild(daySection);
    }
  }

  /**
   * Create an input group for a single event
   */
  createEventInputGroup(eventKey, eventParams, isHandTimeable) {
    const group = document.createElement('div');
    group.className = 'event-input-group';
    group.setAttribute('data-event', eventKey);

    // Label
    const label = document.createElement('label');
    label.htmlFor = `input-${eventKey}`;
    label.textContent = eventParams.displayName;
    group.appendChild(label);

    // Input container
    const inputContainer = document.createElement('div');
    inputContainer.className = 'input-with-controls';

    // Text input
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `input-${eventKey}`;
    input.className = 'form-input event-performance-input';
    input.setAttribute('data-event', eventKey);
    input.setAttribute('aria-label', `Performance for ${eventParams.displayName}`);
    input.placeholder = this.getPlaceholder(eventParams.measurement);

    // Input event listener with debounce
    input.addEventListener('input', () => this.handlePerformanceInput(eventKey));

    inputContainer.appendChild(input);

    // Hand timing checkbox (if applicable)
    if (isHandTimeable) {
      const checkboxWrapper = document.createElement('div');
      checkboxWrapper.className = 'hand-timing-wrapper';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `hand-timing-${eventKey}`;
      checkbox.className = 'hand-timing-checkbox';
      checkbox.setAttribute('data-event', eventKey);
      checkbox.setAttribute('aria-label', `Hand timed for ${eventParams.displayName}`);

      const checkboxLabel = document.createElement('label');
      checkboxLabel.htmlFor = `hand-timing-${eventKey}`;
      checkboxLabel.textContent = 'Hand Timed';
      checkboxLabel.className = 'hand-timing-label';

      // Checkbox event listener
      checkbox.addEventListener('change', () => this.handlePerformanceInput(eventKey));

      checkboxWrapper.appendChild(checkbox);
      checkboxWrapper.appendChild(checkboxLabel);
      inputContainer.appendChild(checkboxWrapper);
    }

    // Score display — lives inside the input row so it sits alongside the
    // input rather than beneath it. `nowrap` on the row keeps the score
    // pinned to the right; the input flex-shrinks to give it space.
    // Always reads "{n} points"; no entry shows "0 points" in the muted
    // empty-state style (the .has-value class flips it to the accent colour).
    const scoreDisplay = document.createElement('div');
    scoreDisplay.className = 'event-score';
    scoreDisplay.id = `score-${eventKey}`;
    scoreDisplay.setAttribute('aria-live', 'polite');
    scoreDisplay.textContent = '0 points';
    inputContainer.appendChild(scoreDisplay);

    group.appendChild(inputContainer);

    return group;
  }

  /**
   * Get placeholder text based on measurement type
   */
  getPlaceholder(measurementType) {
    switch (measurementType) {
      case 'time':
        return 'e.g., 10.5 or 1:23.4';
      case 'distance':
        return 'e.g., 7.50';
      case 'height':
        return 'e.g., 2.10';
      default:
        return '';
    }
  }

  /**
   * Handle performance input change with debouncing
   */
  handlePerformanceInput(eventKey) {
    // Clear existing timer
    if (this.debounceTimers[eventKey]) {
      clearTimeout(this.debounceTimers[eventKey]);
    }

    // Set new timer
    this.debounceTimers[eventKey] = setTimeout(() => {
      this.processPerformanceInput(eventKey);
    }, 300);
  }

  /**
   * Process performance input and calculate score
   */
  async processPerformanceInput(eventKey) {
    const input = document.getElementById(`input-${eventKey}`);
    const scoreDisplay = document.getElementById(`score-${eventKey}`);
    const handTimingCheckbox = document.getElementById(`hand-timing-${eventKey}`);

    if (!input) return;

    const inputValue = input.value.trim();

    // Empty input: reset to the muted "0 points" baseline rather than blanking
    // the row, so the score column reads consistently across all events.
    if (!inputValue) {
      delete this.performances[eventKey];
      scoreDisplay.textContent = '0 points';
      scoreDisplay.classList.remove('has-value');
      input.classList.remove('input-error');
      this.calculateTotals();
      return;
    }

    try {
      // Get event parameters
      const eventParams = await combinedEventsConfigLoader.getEventParameters(
        this.currentGender,
        eventKey
      );

      if (!eventParams) return;

      // Convert performance to numeric value
      let performanceValue = convertPerformanceToValue(
        inputValue,
        eventParams.measurement,
        eventKey
      );

      if (performanceValue === null || !validatePerformance(performanceValue)) {
        input.classList.add('input-error');
        scoreDisplay.textContent = 'Invalid input';
        scoreDisplay.classList.remove('has-value');
        delete this.performances[eventKey];
        this.calculateTotals();
        return;
      }

      // Apply hand timing offset if applicable
      const isHandTimed = handTimingCheckbox?.checked || false;
      if (isHandTimed && eventParams.measurement === 'time') {
        const offset = await combinedEventsConfigLoader.getHandTimingOffset(eventKey);
        performanceValue = applyHandTimingOffset(performanceValue, offset);
      }

      // Calculate score
      const score = calculateEventScore(
        performanceValue,
        eventParams.parameters,
        eventParams.measurement
      );

      // Update performance state
      this.performances[eventKey] = {
        value: performanceValue,
        isHandTimed,
        score,
        inputValue
      };

      // Update UI
      input.classList.remove('input-error');
      scoreDisplay.textContent = `${score.toLocaleString()} points`;
      scoreDisplay.classList.add('has-value');

      // Recalculate totals
      this.calculateTotals();
    } catch (error) {
      console.error('Error processing performance:', error);
      input.classList.add('input-error');
      scoreDisplay.textContent = 'Error';
      scoreDisplay.classList.remove('has-value');
    }
  }

  /**
   * Calculate totals and update displays
   */
  calculateTotals() {
    // Calculate total score and completion count
    this.totalScore = 0;
    this.completedCount = 0;

    Object.values(this.performances).forEach(perf => {
      if (perf.score !== undefined) {
        this.totalScore += perf.score;
        this.completedCount++;
      }
    });

    // Update progress
    this.updateProgress();

    // Update running totals
    this.updateRunningTotals();

    // Update final score
    this.updateFinalScore();
  }

  /**
   * Update progress indicator
   */
  updateProgress() {
    if (!this.eventConfig) return;

    const totalEvents = this.eventConfig.events.flat().length;
    this.progressText.textContent = `${this.completedCount}/${totalEvents} events completed`;
  }

  /**
   * Update running totals display.
   *
   * Renders one column per competition day, each headed "Day N", with a
   * cumulative `After {event}: {total} points` row for every event in that
   * day — entered or not. Unentered events contribute 0, so the cumulative
   * carries unchanged past them, and the row is tagged `--pending` so it
   * renders in the muted/italic empty-state style. The cumulative carries
   * across days (so Day 2's first row starts from where Day 1 left off).
   * Single-day events drop the day header.
   */
  async updateRunningTotals() {
    if (!this.eventConfig) return;

    // Always visible once a combined event has been picked.
    this.runningTotals.classList.remove('hidden');

    const days = this.eventConfig.events;
    const isMultiDay = days.length > 1;
    let runningTotal = 0;
    const dayColumns = [];

    for (let i = 0; i < days.length; i++) {
      const items = [];

      for (const eventKey of days[i]) {
        const perf = this.performances[eventKey];
        const entered = !!(perf && perf.score !== undefined);
        if (entered) runningTotal += perf.score;

        const eventParams = await combinedEventsConfigLoader.getEventParameters(
          this.currentGender,
          eventKey
        );
        const displayName = eventParams ? eventParams.displayName : eventKey;
        const cls = entered ? 'running-total-item' : 'running-total-item running-total-item--pending';

        items.push(`
          <div class="${cls}">
            <span class="running-total-label">After ${displayName}:</span>
            <span class="running-total-value">${runningTotal.toLocaleString()} points</span>
          </div>
        `);
      }

      dayColumns.push(`
        <div class="running-totals-day">
          ${isMultiDay ? `<div class="running-totals-day__header">Day ${i + 1}</div>` : ''}
          <div class="running-totals-day__list">${items.join('')}</div>
        </div>
      `);
    }

    this.runningTotalsContent.innerHTML =
      `<div class="running-totals-grid">${dayColumns.join('')}</div>`;
  }

  /**
   * Update final score display
   */
  async updateFinalScore() {
    if (!this.eventConfig) return;

    const pointsValue = this.finalScore.querySelector('.points-value');

    if (pointsValue) {
      // Localised so a five-digit decathlon total reads "9,036" not "9036".
      pointsValue.textContent = this.totalScore.toLocaleString();
    }
  }

  /**
   * Handle clear all button
   */
  handleClearAll() {
    // Clear all input fields
    const inputs = this.daysContainer.querySelectorAll('.event-performance-input');
    inputs.forEach(input => {
      input.value = '';
      input.classList.remove('input-error');
    });

    // Clear all checkboxes
    const checkboxes = this.daysContainer.querySelectorAll('.hand-timing-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });

    // Clear all score displays — match the empty-input baseline above.
    const scores = this.daysContainer.querySelectorAll('.event-score');
    scores.forEach(score => {
      score.textContent = '0 points';
      score.classList.remove('has-value');
    });

    // Reset state
    this.performances = {};
    this.totalScore = 0;
    this.completedCount = 0;

    // Update displays
    this.calculateTotals();
  }

  /**
   * Hide form
   */
  hideForm() {
    this.calculatorForm?.classList.add('hidden');
  }

  /**
   * Show loading indicator
   */
  showLoading() {
    this.loadingIndicator?.classList.remove('hidden');
  }

  /**
   * Hide loading indicator
   */
  hideLoading() {
    this.loadingIndicator?.classList.add('hidden');
  }

  /**
   * Show error message
   */
  showError(message) {
    if (this.errorMessage) {
      this.errorMessage.textContent = message;
      this.errorMessage.classList.remove('hidden');
    }
  }

  /**
   * Hide error message
   */
  hideError() {
    if (this.errorMessage) {
      this.errorMessage.classList.add('hidden');
      this.errorMessage.textContent = '';
    }
  }

  /**
   * Hide results container
   */
  hideResults() {
    this.resultsContainer?.classList.add('hidden');
  }
}

// Initialize calculator when DOM is ready
const calculator = new CombinedEventsCalculator();
calculator.initialize();
