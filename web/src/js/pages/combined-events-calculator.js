/**
 * Combined Event Score Calculator Page Controller
 * Handles UI interactions and calculations for combined events (Decathlon, Heptathlon, Pentathlon)
 */

import { Navigation } from '../components/navigation.js';
import { createIcon } from '../components/icon.js';
import { combinedEventsConfigLoader } from '../data/combined-events-config-loader.js';
import {
  calculateEventScore,
  applyHandTimingOffset,
  validatePerformance,
  convertPerformanceToValue
} from '../utils/combined-events-scorer.js';
import {
  buildShareUrl,
  parseUrlParams,
  clearUrlParams,
  copyToClipboard,
  COMBINED_EVENTS_PARAM_MAP
} from '../utils/url-params.js';

// Per-calculator localStorage key (matches age/time/pace per-calc convention).
const HISTORY_KEY = 'athleticsUtils.combinedEventsHistory';
const MAX_HISTORY = 10;

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

    // History + share UI
    this.resultActions = null;
    this.addToHistoryBtn = null;
    this.shareBtn = null;
    this.historySection = null;
    this.historyTableBody = null;
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

      // Build the [Add to History] [Share] cluster that lives in the
      // Final Score card's title row.
      this.renderResultActions();

      // Setup event listeners
      this.setupEventListeners();

      // Render any saved history rows.
      this.renderHistory();

      // If the page was opened via a shared link, replay the calculation.
      // Otherwise restore the user's session-storage gender as before.
      const urlParams = parseUrlParams(COMBINED_EVENTS_PARAM_MAP);
      if (urlParams && urlParams.gender) {
        // Defer one frame so initial DOM paint completes before we kick off
        // the gender/event/inputs cascade.
        requestAnimationFrame(async () => {
          await this.applyUrlParams(urlParams, { scrollToResults: false });
          clearUrlParams();
        });
      } else {
        this.initializeGenderToggle();
      }

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
    this.resultActions = document.getElementById('result-actions');
    this.historySection = document.getElementById('history-section');
    this.historyTableBody = document.getElementById('history-table-body');
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
    // Track times can contain ':' (e.g. 1:23.4) so they need the text keyboard;
    // jumps/throws are pure decimals.
    input.inputMode = eventParams.measurement === 'time' ? 'text' : 'decimal';
    input.autocomplete = 'off';
    input.spellcheck = false;

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

    // Toggle the result-action buttons' enabled state.
    this.updateActionButtonsState();
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

  // ============================================================
  // History + Share — mirrors the pattern used in age-calculator
  // and score-calculator so the UI feels consistent across calcs.
  // ============================================================

  /**
   * Build the persistent [Add to History] [Share] cluster that lives in
   * the Final Score card's title row. Created once during initialize()
   * and never re-rendered — the buttons just enable/disable as the user
   * enters performances.
   */
  renderResultActions() {
    if (!this.resultActions) return;
    this.resultActions.innerHTML = '';
    this.addToHistoryBtn = this.createAddToHistoryButton();
    this.shareBtn = this.createShareButton();
    this.resultActions.appendChild(this.addToHistoryBtn);
    this.resultActions.appendChild(this.shareBtn);
    // Disabled until the user has entered at least one performance.
    this.updateActionButtonsState();
  }

  createAddToHistoryButton() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'add-history-btn';
    btn.setAttribute('aria-label', 'Add this result to history');
    btn.title = 'Add to history';

    const text = document.createElement('span');
    text.textContent = 'Add to History';
    btn.appendChild(text);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleAddToHistory(btn);
    });
    return btn;
  }

  createShareButton() {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'share-btn';
    btn.setAttribute('aria-label', 'Share this result');
    btn.title = 'Copy link to clipboard';
    btn.appendChild(createIcon('share', 'icon--sm'));
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleShare(btn);
    });
    return btn;
  }

  /**
   * Enable the actions only when there's at least one entered performance —
   * an empty calc has nothing meaningful to add to history or share.
   */
  updateActionButtonsState() {
    const enabled = this.completedCount > 0 && !!this.eventConfig;
    if (this.addToHistoryBtn) this.addToHistoryBtn.disabled = !enabled;
    if (this.shareBtn) this.shareBtn.disabled = !enabled;
  }

  /**
   * Serialize the currently-entered performances into the packed `pf`
   * string described in COMBINED_EVENTS_PARAM_MAP. Iterates the event
   * config order (not the performances map) so the output is stable.
   */
  serializePerformances() {
    if (!this.eventConfig) return '';
    const parts = [];
    for (const eventKey of this.eventConfig.events.flat()) {
      const perf = this.performances[eventKey];
      if (!perf || perf.score === undefined) continue;
      const tail = perf.isHandTimed ? `,${perf.inputValue},1` : `,${perf.inputValue}`;
      parts.push(`${eventKey}${tail}`);
    }
    return parts.join('|');
  }

  /**
   * Unpack a `pf` string into [{ event, value, isHandTimed }, ...].
   * Tolerant of stale entries whose event keys no longer exist in the
   * current event config — those just get filtered out in the caller.
   */
  deserializePerformances(packed) {
    if (!packed) return [];
    return packed.split('|').filter(Boolean).map(chunk => {
      const [event, value, ht] = chunk.split(',');
      return { event, value: value ?? '', isHandTimed: ht === '1' };
    });
  }

  /**
   * Snapshot the current calculator state as a params object — the same
   * shape used by the share URL and the per-history-entry replay payload.
   */
  buildCurrentParams() {
    return {
      gender: this.currentGender,
      event: this.currentCombinedEvent,
      performances: this.serializePerformances()
    };
  }

  // ---------- add-to-history / share handlers ----------

  handleAddToHistory(btnElement) {
    if (!this.currentGender || !this.currentCombinedEvent) return;
    if (this.completedCount === 0) return;

    const params = this.buildCurrentParams();
    const entry = this.buildHistoryEntry(params);
    const history = this.getHistory();

    // Cheap dedup against the most recent entry — guards against
    // double-clicks producing identical rows.
    if (history.length > 0 && history[0].signature === entry.signature) {
      this.showToast(btnElement, 'Already in history');
      return;
    }

    history.unshift(entry);
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Error saving combined events history', e);
    }
    this.renderHistory();
    this.showToast(btnElement, 'Added to history');
  }

  async handleShare(btnElement) {
    if (!this.currentGender || !this.currentCombinedEvent) return;
    const params = this.buildCurrentParams();
    const url = buildShareUrl(
      '/calculators/combined-events.html',
      params,
      COMBINED_EVENTS_PARAM_MAP
    );
    const success = await copyToClipboard(url);
    this.showToast(btnElement, success ? 'Link copied!' : 'Failed to copy');
  }

  /**
   * Build a single history row from a params snapshot. Captures both the
   * display strings (gender / event name / final score) and the full
   * params object so clicking the row can replay the calculation.
   */
  buildHistoryEntry(params) {
    const id = `combined-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const genderDisplay = params.gender
      ? params.gender.charAt(0).toUpperCase() + params.gender.slice(1)
      : '';
    const eventDisplay = this.eventConfig?.displayName || params.event || '';
    return {
      id,
      gender: genderDisplay,
      event: eventDisplay,
      score: this.totalScore,
      scoreText: `${this.totalScore.toLocaleString()} points`,
      signature: `${params.gender}:${params.event}:${params.performances}`,
      params
    };
  }

  // ---------- history rendering ----------

  getHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error loading combined events history', e);
      return [];
    }
  }

  renderHistory() {
    const history = this.getHistory();
    if (!this.historySection || !this.historyTableBody) return;

    if (history.length === 0) {
      this.historySection.classList.add('hidden');
      this.historyTableBody.innerHTML = '';
      return;
    }

    this.historySection.classList.remove('hidden');
    this.historyTableBody.innerHTML = '';

    history.forEach((entry, index) => {
      const row = document.createElement('tr');
      row.className = 'history-row history-row--adding';
      row.draggable = true;
      row.dataset.id = entry.id;
      row.dataset.index = String(index);
      row.tabIndex = 0;
      row.setAttribute(
        'aria-label',
        `Replay ${entry.gender} ${entry.event}: ${entry.scoreText}`
      );

      row.innerHTML = `
        <td>${this.escapeHtml(entry.gender)}</td>
        <td class="history-row__performance">${this.escapeHtml(entry.event)}</td>
        <td class="history-row__performance">${this.escapeHtml(entry.scoreText)}</td>
        <td class="history-row__actions">
          <button class="history-move-btn" data-id="${entry.id}" data-direction="up" aria-label="Move up">&#x25B2;</button>
          <button class="history-move-btn" data-id="${entry.id}" data-direction="down" aria-label="Move down">&#x25BC;</button>
          <button class="history-delete-btn" data-id="${entry.id}" aria-label="Delete"></button>
        </td>
      `;

      const deleteBtn = row.querySelector('.history-delete-btn');
      deleteBtn.appendChild(createIcon('x', 'icon--sm'));

      // Drag and drop
      row.addEventListener('dragstart', (e) => this.handleDragStart(e));
      row.addEventListener('dragover', (e) => this.handleDragOver(e));
      row.addEventListener('drop', (e) => this.handleDrop(e));
      row.addEventListener('dragend', (e) => this.handleDragEnd(e));

      // Delete
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteEntry(entry.id);
      });

      // Move up/down buttons (keyboard-friendly alternative to dragging).
      row.querySelectorAll('.history-move-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const direction = btn.dataset.direction;
          const from = parseInt(row.dataset.index, 10);
          const to = direction === 'up' ? from - 1 : from + 1;
          const now = this.getHistory();
          if (to < 0 || to >= now.length) return;
          this.reorderHistory(from, to);
          requestAnimationFrame(() => {
            const selector = `.history-move-btn[data-id="${entry.id}"][data-direction="${direction}"]`;
            this.historyTableBody.querySelector(selector)?.focus();
          });
        });
      });

      // Click anywhere on the row (except an action button) to replay.
      row.addEventListener('click', (e) => {
        if (e.target.closest('.history-delete-btn')) return;
        if (e.target.closest('.history-move-btn')) return;
        this.replayEntry(entry);
      });

      row.addEventListener('keydown', (e) => {
        if (e.target !== row) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.replayEntry(entry);
          return;
        }
        // Alt+ArrowUp / Alt+ArrowDown — keyboard reorder.
        if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
          const direction = e.key === 'ArrowUp' ? -1 : 1;
          const from = parseInt(row.dataset.index, 10);
          const to = from + direction;
          const now = this.getHistory();
          if (to < 0 || to >= now.length) return;
          e.preventDefault();
          this.reorderHistory(from, to);
          requestAnimationFrame(() => {
            this.historyTableBody.querySelector(`tr[data-id="${entry.id}"]`)?.focus();
          });
          return;
        }
        // Delete / Backspace — remove this entry, keep focus on the row
        // that takes its slot (or the previous one if we removed the last).
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          const idx = parseInt(row.dataset.index, 10);
          this.deleteEntry(entry.id);
          requestAnimationFrame(() => {
            const rows = this.historyTableBody.querySelectorAll('tr');
            const nextRow = rows[idx] || rows[idx - 1];
            nextRow?.focus();
          });
        }
      });

      this.historyTableBody.appendChild(row);
    });
  }

  deleteEntry(id) {
    const history = this.getHistory().filter(e => e.id !== id);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Error saving combined events history', e);
    }
    this.renderHistory();
  }

  reorderHistory(fromIndex, toIndex) {
    const history = this.getHistory();
    if (fromIndex < 0 || fromIndex >= history.length) return;
    if (toIndex < 0 || toIndex >= history.length) return;
    const [item] = history.splice(fromIndex, 1);
    history.splice(toIndex, 0, item);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Error saving combined events history', e);
    }
    this.renderHistory();
  }

  replayEntry(entry) {
    if (!entry?.params) return;
    this.applyUrlParams(entry.params, { scrollToResults: true });
  }

  // ---------- drag-and-drop reordering ----------

  handleDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.dataset.index);
  }

  handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const row = e.target.closest('.history-row');
    if (row && !row.classList.contains('dragging')) {
      row.classList.add('drag-over');
    }
    return false;
  }

  handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();
    const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    const targetRow = e.target.closest('.history-row');
    if (targetRow) {
      const targetIndex = parseInt(targetRow.dataset.index, 10);
      if (draggedIndex !== targetIndex) {
        this.reorderHistory(draggedIndex, targetIndex);
      }
    }
    return false;
  }

  handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.history-row').forEach(row => row.classList.remove('drag-over'));
  }

  // ---------- share-link / history replay ----------

  /**
   * Populate the calculator from a params object. Shared by both the
   * share-URL replay path (on page load) and the history-row replay
   * path (on row click).
   *
   * Sequence is critical: gender first (loads the gender's scoring data
   * and rebuilds the combined-event dropdown), then the combined-event
   * (loads its config and generates the input rows), THEN the per-event
   * performances — which can only land in inputs that now exist.
   */
  async applyUrlParams(params, options = {}) {
    if (!params || !params.gender) return;

    // Step 1: gender. handleGenderToggle is a no-op when the requested
    // gender matches; force the cascade if it does so the combined-event
    // dropdown definitely gets populated.
    if (this.currentGender !== params.gender) {
      await this.handleGenderToggle(params.gender);
    } else {
      // Re-populate so the dropdown matches the loaded scoring data,
      // in case state has drifted.
      await this.populateCombinedEventSelector(this.currentGender);
    }

    // Step 2: combined event. handleGenderToggle just auto-selected the
    // first option; swap to the requested one if different.
    if (params.event && this.combinedEventSelect.value !== params.event) {
      this.combinedEventSelect.value = params.event;
      await this.handleCombinedEventChange();
    }

    // Step 3: per-event performances. Bypass the input-event debounce by
    // calling processPerformanceInput directly so the result settles in
    // one tick rather than after 300ms × N.
    if (params.performances) {
      const entries = this.deserializePerformances(params.performances);
      for (const { event, value, isHandTimed } of entries) {
        const input = document.getElementById(`input-${event}`);
        if (!input) continue;
        input.value = value;
        const checkbox = document.getElementById(`hand-timing-${event}`);
        if (checkbox) checkbox.checked = !!isHandTimed;
        await this.processPerformanceInput(event);
      }
    }

    if (options.scrollToResults) {
      requestAnimationFrame(() => {
        this.resultsContainer?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }

  // ---------- small helpers ----------

  /**
   * Transient confirmation toast attached to the result card's title row.
   * Re-uses the .share-toast CSS so Add-to-History and Share feel
   * consistent with the same component in age/score/pace calculators.
   */
  showToast(anchorElement, message) {
    const titleRow = anchorElement.closest('.result-card__title-row');
    if (!titleRow) return;
    const existing = titleRow.querySelector('.share-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'share-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = message;
    titleRow.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }

  /**
   * Defence-in-depth — entry fields flow through localStorage history
   * into innerHTML, so escape every string before interpolation.
   */
  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

// Initialize calculator when DOM is ready
const calculator = new CombinedEventsCalculator();
calculator.initialize();
