/**
 * Pace Calculator Page Controller
 * Handles UI interactions and calculations for the pace calculator
 */

import { Navigation } from '../components/navigation.js';
import { PaceCalculatorBase } from '../components/pace-calculator-base.js';
import {
  calculatePace,
  calculateTotalTime,
  getDistanceInMetres,
  calculateSplits,
  getEquivalentPaces
} from '../calculators/pace-calculations.js';
import {
  parseTimeInput,
  parsePaceInput,
  formatPaceTime,
  formatTotalTime,
  formatSpeed,
  formatDistance,
  convertDistance
} from '../utils/pace-formatter.js';

class PaceCalculator extends PaceCalculatorBase {
  constructor() {
    super({
      loading: '#loading-indicator',
      error: '#error-message',
      results: '#results-container'
    });

    // History storage key
    this.historyStorageKey = 'athleticsUtils.paceHistory';
    this.maxHistoryEntries = 10;
  }

  /**
   * Initialize DOM elements
   */
  initializeElements() {
    // Mode toggle buttons
    this.paceModeBtn = document.getElementById('mode-toggle-pace');
    this.timeModeBtn = document.getElementById('mode-toggle-time');

    // Pace mode elements
    this.paceControls = document.getElementById('pace-mode-controls');
    this.timeInputPace = document.getElementById('time-input-pace');
    this.distanceSelectPace = document.getElementById('distance-select-pace');
    this.paceUnitSelect = document.getElementById('pace-unit-select');
    this.distanceEquivalentPace = document.getElementById('distance-equivalent-pace');
    this.calculateBtnPace = document.getElementById('calculate-btn-pace');

    // Time mode elements
    this.timeControls = document.getElementById('time-mode-controls');
    this.paceInputTime = document.getElementById('pace-input-time');
    this.paceUnitSelectTime = document.getElementById('pace-unit-select-time');
    this.distanceSelectTime = document.getElementById('distance-select-time');
    this.distanceEquivalentTime = document.getElementById('distance-equivalent-time');
    this.calculateBtnTime = document.getElementById('calculate-btn-time');

    // Results
    this.resultsContent = document.getElementById('results-content');

    // History
    this.historySection = document.getElementById('history-section');
    this.historyTableBody = document.getElementById('history-table-body');

    // Populate distance dropdowns
    this.populateDistanceDropdowns();

    // Set default distance to 5km
    this.setDefaultDistance();

    // Setup event listeners
    this.setupEventListeners();

    // Load and display history
    this.loadHistory();
  }

  /**
   * Populate distance select dropdowns
   */
  populateDistanceDropdowns() {
    const distances = this.getPaceDistances();

    // Populate both dropdowns
    [this.distanceSelectPace, this.distanceSelectTime].forEach(select => {
      distances.forEach(event => {
        const option = document.createElement('option');
        option.value = event.key;
        option.textContent = event.displayName;
        select.appendChild(option);
      });
    });
  }

  /**
   * Set default distance to 5km
   */
  setDefaultDistance() {
    const defaultDistance = '5km';
    this.distanceSelectPace.value = defaultDistance;
    this.distanceSelectTime.value = defaultDistance;
    this.updateDistanceEquivalent('pace');
    this.updateDistanceEquivalent('time');
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Mode toggle
    this.paceModeBtn.addEventListener('click', () => this.switchMode('pace'));
    this.timeModeBtn.addEventListener('click', () => this.switchMode('totalTime'));

    // Pace mode button
    this.calculateBtnPace.addEventListener('click', () => this.handlePaceModeCalculate());

    // Pace mode distance/unit change (update equivalent display only)
    this.distanceSelectPace.addEventListener('change', () => {
      this.updateDistanceEquivalent('pace');
    });
    this.paceUnitSelect.addEventListener('change', () => {
      this.updateDistanceEquivalent('pace');
    });

    // Time mode button
    this.calculateBtnTime.addEventListener('click', () => this.handleTimeModeCalculate());

    // Time mode distance/unit change (update equivalent display only)
    this.paceUnitSelectTime.addEventListener('change', () => {
      this.updateDistanceEquivalent('time');
    });
    this.distanceSelectTime.addEventListener('change', () => {
      this.updateDistanceEquivalent('time');
    });
  }

  /**
   * Switch between calculation modes
   */
  switchMode(mode) {
    this.currentMode = mode;

    // Update button states
    if (mode === 'pace') {
      this.paceModeBtn.classList.add('mode-toggle__option--active');
      this.timeModeBtn.classList.remove('mode-toggle__option--active');
      this.paceControls.classList.remove('hidden');
      this.timeControls.classList.add('hidden');
    } else {
      this.timeModeBtn.classList.add('mode-toggle__option--active');
      this.paceModeBtn.classList.remove('mode-toggle__option--active');
      this.timeControls.classList.remove('hidden');
      this.paceControls.classList.add('hidden');
    }

    // Clear results
    this.clearResults();
  }

  /**
   * Update distance equivalent display
   */
  updateDistanceEquivalent(mode) {
    const select = mode === 'pace' ? this.distanceSelectPace : this.distanceSelectTime;
    const display = mode === 'pace' ? this.distanceEquivalentPace : this.distanceEquivalentTime;
    const paceUnit = mode === 'pace' ? this.paceUnitSelect.value : this.paceUnitSelectTime.value;

    const eventKey = select.value;
    if (!eventKey) {
      display.textContent = '';
      return;
    }

    const eventConfig = this.getEventConfig(eventKey);
    if (!eventConfig) {
      display.textContent = '';
      return;
    }

    // Show equivalent distance if units differ
    const targetUnit = paceUnit === 'mile' ? 'miles' : 'km';
    if (eventConfig.unit !== targetUnit) {
      const converted = convertDistance(eventConfig.distance, eventConfig.unit, targetUnit);
      const formatted = formatDistance(converted, targetUnit);
      display.textContent = `≈ ${formatted}`;
    } else {
      display.textContent = '';
    }
  }

  /**
   * Handle pace mode calculation (Distance + Time → Pace)
   */
  handlePaceModeCalculate() {
    try {
      this.hideError();
      this.timeInputPace.classList.remove('input-error');
      this.distanceSelectPace.classList.remove('input-error');

      // Get inputs
      const timeInput = this.timeInputPace.value.trim();
      const distanceKey = this.distanceSelectPace.value;
      const paceUnit = this.paceUnitSelect.value;

      // Validate inputs
      if (!timeInput || !distanceKey) {
        this.hideResults();
        return;
      }

      // Parse time
      const totalTimeSeconds = parseTimeInput(timeInput);
      if (!this.validateTime(totalTimeSeconds)) {
        this.timeInputPace.classList.add('input-error');
        this.showError('Please enter a valid time (e.g., 25:00 or 1:23:45)');
        this.hideResults();
        return;
      }

      // Get distance in metres
      const distanceMetres = getDistanceInMetres(distanceKey, this.eventsConfig);
      const eventConfig = this.getEventConfig(distanceKey);

      // Calculate pace
      const paceSeconds = calculatePace(distanceMetres, totalTimeSeconds, paceUnit);

      // Display results
      this.displayPaceResults(paceSeconds, paceUnit, distanceMetres, eventConfig, totalTimeSeconds);

      // Save to history
      this.saveToHistory({
        mode: 'pace',
        distance: eventConfig.displayName,
        totalTime: formatTotalTime(totalTimeSeconds),
        pace: `${formatPaceTime(paceSeconds)} /${paceUnit}`,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Calculation error:', error);
      this.showError('Unable to calculate pace. Please check your inputs.');
      this.hideResults();
    }
  }

  /**
   * Handle time mode calculation (Distance + Pace → Total Time)
   */
  handleTimeModeCalculate() {
    try {
      this.hideError();
      this.paceInputTime.classList.remove('input-error');
      this.distanceSelectTime.classList.remove('input-error');

      // Get inputs
      const paceInput = this.paceInputTime.value.trim();
      const distanceKey = this.distanceSelectTime.value;
      const paceUnit = this.paceUnitSelectTime.value;

      // Validate inputs
      if (!paceInput || !distanceKey) {
        this.hideResults();
        return;
      }

      // Parse pace
      const paceSeconds = parsePaceInput(paceInput);
      if (!this.validatePace(paceSeconds)) {
        this.paceInputTime.classList.add('input-error');
        this.showError('Please enter a valid pace (e.g., 5:00 or 4:30)');
        this.hideResults();
        return;
      }

      // Get distance in metres
      const distanceMetres = getDistanceInMetres(distanceKey, this.eventsConfig);
      const eventConfig = this.getEventConfig(distanceKey);

      // Calculate total time
      const totalTimeSeconds = calculateTotalTime(distanceMetres, paceSeconds, paceUnit);

      // Display results
      this.displayTimeResults(totalTimeSeconds, paceSeconds, paceUnit, distanceMetres, eventConfig);

      // Save to history
      this.saveToHistory({
        mode: 'totalTime',
        distance: eventConfig.displayName,
        totalTime: formatTotalTime(totalTimeSeconds),
        pace: `${formatPaceTime(paceSeconds)} /${paceUnit}`,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('Calculation error:', error);
      this.showError('Unable to calculate total time. Please check your inputs.');
      this.hideResults();
    }
  }

  /**
   * Display pace calculation results
   */
  displayPaceResults(paceSeconds, paceUnit, distanceMetres, eventConfig, totalTimeSeconds) {
    this.resultsContent.innerHTML = '';

    // Main result card
    const mainCard = document.createElement('div');
    mainCard.className = 'result-card';
    mainCard.innerHTML = `
      <h3 class="result-card__title">Your Pace</h3>
      <div class="result-card__points">${formatPaceTime(paceSeconds)} /${paceUnit}</div>
      <p class="result-card__content">To complete ${eventConfig.displayName} in ${formatTotalTime(totalTimeSeconds)}</p>
    `;
    this.resultsContent.appendChild(mainCard);

    // Equivalent paces
    const equivalents = getEquivalentPaces(paceSeconds / (paceUnit === 'mile' ? 1.609344 : 1));
    const equivalentsCard = document.createElement('div');
    equivalentsCard.className = 'result-card';
    equivalentsCard.innerHTML = `
      <h3 class="result-card__title">Equivalent Paces & Speeds</h3>
      <div class="equivalencies-grid">
        <div class="equivalency-item">
          <div class="equivalency-item__event">Pace per km</div>
          <div class="equivalency-item__performance">${formatPaceTime(equivalents.perKm)} /km</div>
        </div>
        <div class="equivalency-item">
          <div class="equivalency-item__event">Pace per mile</div>
          <div class="equivalency-item__performance">${formatPaceTime(equivalents.perMile)} /mile</div>
        </div>
        <div class="equivalency-item">
          <div class="equivalency-item__event">Speed (km/h)</div>
          <div class="equivalency-item__performance">${formatSpeed(equivalents.kmh, 'km/h')}</div>
        </div>
        <div class="equivalency-item">
          <div class="equivalency-item__event">Speed (mph)</div>
          <div class="equivalency-item__performance">${formatSpeed(equivalents.mph, 'mph')}</div>
        </div>
      </div>
    `;
    this.resultsContent.appendChild(equivalentsCard);

    // Splits
    const splits = calculateSplits(distanceMetres, equivalents.perKm, eventConfig);
    this.displaySplits(splits);

    this.showResults();
  }

  /**
   * Display total time calculation results
   */
  displayTimeResults(totalTimeSeconds, paceSeconds, paceUnit, distanceMetres, eventConfig) {
    this.resultsContent.innerHTML = '';

    // Main result card
    const mainCard = document.createElement('div');
    mainCard.className = 'result-card';
    mainCard.innerHTML = `
      <h3 class="result-card__title">Projected Finish Time</h3>
      <div class="result-card__points">${formatTotalTime(totalTimeSeconds)}</div>
      <p class="result-card__content">For ${eventConfig.displayName} at ${formatPaceTime(paceSeconds)} /${paceUnit} pace</p>
    `;
    this.resultsContent.appendChild(mainCard);

    // Equivalent paces
    const equivalents = getEquivalentPaces(paceSeconds / (paceUnit === 'mile' ? 1.609344 : 1));
    const equivalentsCard = document.createElement('div');
    equivalentsCard.className = 'result-card';
    equivalentsCard.innerHTML = `
      <h3 class="result-card__title">Equivalent Paces & Speeds</h3>
      <div class="equivalencies-grid">
        <div class="equivalency-item">
          <div class="equivalency-item__event">Pace per km</div>
          <div class="equivalency-item__performance">${formatPaceTime(equivalents.perKm)} /km</div>
        </div>
        <div class="equivalency-item">
          <div class="equivalency-item__event">Pace per mile</div>
          <div class="equivalency-item__performance">${formatPaceTime(equivalents.perMile)} /mile</div>
        </div>
        <div class="equivalency-item">
          <div class="equivalency-item__event">Speed (km/h)</div>
          <div class="equivalency-item__performance">${formatSpeed(equivalents.kmh, 'km/h')}</div>
        </div>
        <div class="equivalency-item">
          <div class="equivalency-item__event">Speed (mph)</div>
          <div class="equivalency-item__performance">${formatSpeed(equivalents.mph, 'mph')}</div>
        </div>
      </div>
    `;
    this.resultsContent.appendChild(equivalentsCard);

    // Splits
    const splits = calculateSplits(distanceMetres, equivalents.perKm, eventConfig);
    this.displaySplits(splits);

    this.showResults();
  }

  /**
   * Display split times table
   */
  displaySplits(splits) {
    if (!splits || splits.length === 0) {
      return;
    }

    const splitsCard = document.createElement('div');
    splitsCard.className = 'result-card';

    let tableHTML = `
      <h3 class="result-card__title">Split Times</h3>
      <div class="history-table-container">
        <table class="history-table">
          <thead>
            <tr>
              <th>Distance</th>
              <th>Time</th>
              <th>Pace</th>
            </tr>
          </thead>
          <tbody>
    `;

    splits.forEach(split => {
      tableHTML += `
        <tr>
          <td>${split.distanceLabel}</td>
          <td class="history-row__performance">${formatTotalTime(split.time)}</td>
          <td class="history-row__performance">${formatPaceTime(split.pace)} /km</td>
        </tr>
      `;
    });

    tableHTML += `
          </tbody>
        </table>
      </div>
    `;

    splitsCard.innerHTML = tableHTML;
    this.resultsContent.appendChild(splitsCard);
  }

  /**
   * Save calculation to history
   */
  saveToHistory(entry) {
    try {
      let history = this.getHistory();

      // Add unique ID
      entry.id = `pace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Add to beginning of array
      history.unshift(entry);

      // Limit to max entries
      if (history.length > this.maxHistoryEntries) {
        history = history.slice(0, this.maxHistoryEntries);
      }

      // Save to localStorage
      localStorage.setItem(this.historyStorageKey, JSON.stringify(history));

      // Re-render history
      this.renderHistory();
    } catch (error) {
      console.error('Error saving to history:', error);
    }
  }

  /**
   * Get history from localStorage
   */
  getHistory() {
    try {
      const data = localStorage.getItem(this.historyStorageKey);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading history:', error);
      return [];
    }
  }

  /**
   * Load and display history
   */
  loadHistory() {
    this.renderHistory();
  }

  /**
   * Render history table
   */
  renderHistory() {
    const history = this.getHistory();

    if (history.length === 0) {
      this.historySection.classList.add('hidden');
      return;
    }

    this.historySection.classList.remove('hidden');
    this.historyTableBody.innerHTML = '';

    history.forEach((entry, index) => {
      const row = document.createElement('tr');
      row.className = 'history-row history-row--adding';
      row.draggable = true;
      row.dataset.id = entry.id;
      row.dataset.index = index;

      row.innerHTML = `
        <td>${entry.distance}</td>
        <td class="history-row__performance">${entry.totalTime}</td>
        <td class="history-row__performance">${entry.pace}</td>
        <td>
          <button class="history-delete-btn" data-id="${entry.id}" aria-label="Delete">×</button>
        </td>
      `;

      // Add drag and drop listeners
      row.addEventListener('dragstart', (e) => this.handleDragStart(e));
      row.addEventListener('dragover', (e) => this.handleDragOver(e));
      row.addEventListener('drop', (e) => this.handleDrop(e));
      row.addEventListener('dragend', (e) => this.handleDragEnd(e));

      // Add delete listener
      const deleteBtn = row.querySelector('.history-delete-btn');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteHistoryEntry(entry.id);
      });

      this.historyTableBody.appendChild(row);
    });
  }

  /**
   * Delete history entry
   */
  deleteHistoryEntry(id) {
    const history = this.getHistory();
    const filtered = history.filter(entry => entry.id !== id);
    localStorage.setItem(this.historyStorageKey, JSON.stringify(filtered));
    this.renderHistory();
  }

  /**
   * Drag and drop handlers
   */
  handleDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
    e.dataTransfer.setData('text/plain', e.target.dataset.index);
  }

  handleDragOver(e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';

    const row = e.target.closest('.history-row');
    if (row && !row.classList.contains('dragging')) {
      row.classList.add('drag-over');
    }

    return false;
  }

  handleDrop(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }

    const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
    const targetRow = e.target.closest('.history-row');

    if (targetRow) {
      const targetIndex = parseInt(targetRow.dataset.index);

      if (draggedIndex !== targetIndex) {
        this.reorderHistory(draggedIndex, targetIndex);
      }
    }

    return false;
  }

  handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.history-row').forEach(row => {
      row.classList.remove('drag-over');
    });
  }

  /**
   * Reorder history array
   */
  reorderHistory(fromIndex, toIndex) {
    const history = this.getHistory();
    const [movedItem] = history.splice(fromIndex, 1);
    history.splice(toIndex, 0, movedItem);
    localStorage.setItem(this.historyStorageKey, JSON.stringify(history));
    this.renderHistory();
  }
}

// Initialize calculator when DOM is ready
const calculator = new PaceCalculator();
calculator.initialize();

// Initialize navigation
Navigation.initialize();
