/**
 * Pace Calculator Page Controller
 * Handles UI interactions and calculations for the pace calculator
 */

import { Navigation } from '../components/navigation.js';
import { PaceCalculatorBase } from '../components/pace-calculator-base.js';
import { createIcon } from '../components/icon.js';
import {
  calculatePace,
  calculateTotalTime,
  getDistanceInMetres,
  getEquivalentPaces
} from '../calculators/pace-calculations.js';
import {
  parseTimeInput,
  parsePaceInput,
  formatPaceTime,
  formatTotalTime,
  formatSpeed,
  formatDistance,
  convertDistance,
  formatPaceInterval,
  formatDistanceWithUnit
} from '../utils/pace-formatter.js';
import { makeCollapsible } from '../utils/collapsible-section.js';

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
    // Calculation mode toggle buttons (Pace / Total Time)
    this.paceModeBtn = document.getElementById('mode-toggle-pace');
    this.timeModeBtn = document.getElementById('mode-toggle-time');

    // Standard/Advanced mode toggle buttons
    this.standardModeBtn = document.getElementById('mode-toggle-standard');
    this.advancedModeBtn = document.getElementById('mode-toggle-advanced');

    // Pace Standard mode elements
    this.paceStandardControls = document.getElementById('pace-standard-controls');
    this.timeInputPaceStandard = document.getElementById('time-input-pace-standard');
    this.distanceSelectPaceStandard = document.getElementById('distance-select-pace-standard');
    this.paceUnitSelectStandard = document.getElementById('pace-unit-select-standard');
    this.distanceEquivalentPaceStandard = document.getElementById('distance-equivalent-pace-standard');
    this.calculateBtnPaceStandard = document.getElementById('calculate-btn-pace-standard');

    // Pace Advanced mode elements
    this.paceAdvancedControls = document.getElementById('pace-advanced-controls');
    this.timeInputPaceAdvanced = document.getElementById('time-input-pace-advanced');
    this.distanceInputPaceAdvanced = document.getElementById('distance-input-pace-advanced');
    this.distanceUnitSelectPaceAdvanced = document.getElementById('distance-unit-select-pace-advanced');
    this.paceIntervalInputPaceAdvanced = document.getElementById('pace-interval-input-pace-advanced');
    this.paceIntervalUnitSelectPaceAdvanced = document.getElementById('pace-interval-unit-select-pace-advanced');
    this.distanceEquivalentPaceAdvanced = document.getElementById('distance-equivalent-pace-advanced');
    this.calculateBtnPaceAdvanced = document.getElementById('calculate-btn-pace-advanced');

    // Time Standard mode elements
    this.timeStandardControls = document.getElementById('time-standard-controls');
    this.paceInputTimeStandard = document.getElementById('pace-input-time-standard');
    this.paceUnitSelectTimeStandard = document.getElementById('pace-unit-select-time-standard');
    this.distanceSelectTimeStandard = document.getElementById('distance-select-time-standard');
    this.distanceEquivalentTimeStandard = document.getElementById('distance-equivalent-time-standard');
    this.calculateBtnTimeStandard = document.getElementById('calculate-btn-time-standard');

    // Time Advanced mode elements
    this.timeAdvancedControls = document.getElementById('time-advanced-controls');
    this.paceInputTimeAdvanced = document.getElementById('pace-input-time-advanced');
    this.paceIntervalInputTimeAdvanced = document.getElementById('pace-interval-input-time-advanced');
    this.paceIntervalUnitSelectTimeAdvanced = document.getElementById('pace-interval-unit-select-time-advanced');
    this.distanceInputTimeAdvanced = document.getElementById('distance-input-time-advanced');
    this.distanceUnitSelectTimeAdvanced = document.getElementById('distance-unit-select-time-advanced');
    this.distanceEquivalentTimeAdvanced = document.getElementById('distance-equivalent-time-advanced');
    this.calculateBtnTimeAdvanced = document.getElementById('calculate-btn-time-advanced');

    // Results
    this.resultsContent = document.getElementById('results-content');

    // History
    this.historySection = document.getElementById('history-section');
    this.historyTableBody = document.getElementById('history-table-body');

    // Initialize state from sessionStorage
    this.initializeState();

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
   * Initialize state from sessionStorage
   */
  initializeState() {
    // Load state from sessionStorage or use defaults
    this.currentMode = sessionStorage.getItem('paceCalculatorMode') || 'pace';
    this.currentPaceMode = sessionStorage.getItem('paceCalculatorPaceMode') || 'standard';
    this.currentTimeMode = sessionStorage.getItem('paceCalculatorTimeMode') || 'standard';

    // Apply initial mode state
    this.applyModeState();
  }

  /**
   * Save state to sessionStorage
   */
  saveState() {
    sessionStorage.setItem('paceCalculatorMode', this.currentMode);
    sessionStorage.setItem('paceCalculatorPaceMode', this.currentPaceMode);
    sessionStorage.setItem('paceCalculatorTimeMode', this.currentTimeMode);
  }

  /**
   * Apply current mode state to UI
   */
  applyModeState() {
    // Update calculation mode buttons (Pace / Total Time)
    if (this.currentMode === 'pace') {
      this.paceModeBtn.classList.add('mode-toggle__option--active');
      this.timeModeBtn.classList.remove('mode-toggle__option--active');
    } else {
      this.timeModeBtn.classList.add('mode-toggle__option--active');
      this.paceModeBtn.classList.remove('mode-toggle__option--active');
    }

    // Update Standard/Advanced buttons based on current calculation mode
    const currentSubMode = this.currentMode === 'pace' ? this.currentPaceMode : this.currentTimeMode;
    if (currentSubMode === 'standard') {
      this.standardModeBtn.classList.add('mode-toggle__option--active');
      this.advancedModeBtn.classList.remove('mode-toggle__option--active');
    } else {
      this.advancedModeBtn.classList.add('mode-toggle__option--active');
      this.standardModeBtn.classList.remove('mode-toggle__option--active');
    }

    // Show/hide appropriate control group
    this.updateControlVisibility();
  }

  /**
   * Update which control group is visible
   */
  updateControlVisibility() {
    // Hide all control groups
    this.paceStandardControls.classList.add('hidden');
    this.paceAdvancedControls.classList.add('hidden');
    this.timeStandardControls.classList.add('hidden');
    this.timeAdvancedControls.classList.add('hidden');

    // Show the appropriate control group
    if (this.currentMode === 'pace') {
      if (this.currentPaceMode === 'standard') {
        this.paceStandardControls.classList.remove('hidden');
      } else {
        this.paceAdvancedControls.classList.remove('hidden');
      }
    } else {
      if (this.currentTimeMode === 'standard') {
        this.timeStandardControls.classList.remove('hidden');
      } else {
        this.timeAdvancedControls.classList.remove('hidden');
      }
    }
  }

  /**
   * Populate distance select dropdowns (Standard mode only)
   */
  populateDistanceDropdowns() {
    const distances = this.getPaceDistances();

    // Only populate Standard mode dropdowns (Advanced mode uses custom input)
    const dropdowns = [
      this.distanceSelectPaceStandard,
      this.distanceSelectTimeStandard
    ];

    dropdowns.forEach(select => {
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
    // Standard mode: set default to 5km dropdown option
    const defaultDistance = '5km';
    this.distanceSelectPaceStandard.value = defaultDistance;
    this.distanceSelectTimeStandard.value = defaultDistance;
    this.updateDistanceEquivalent('pace', 'standard');
    this.updateDistanceEquivalent('time', 'standard');

    // Advanced mode: set default values for custom input (5 km)
    this.distanceInputPaceAdvanced.value = '5';
    this.distanceInputTimeAdvanced.value = '5';
    // Unit selects already default to 'km' in HTML
  }

  /**
   * Convert distance to metres based on unit
   * @param {number} distance - The distance value
   * @param {string} unit - The unit (m, km, miles, yards, feet)
   * @returns {number} Distance in metres
   */
  convertDistanceToMetres(distance, unit) {
    const conversions = {
      'm': 1,
      'km': 1000,
      'miles': 1609.344,
      'yards': 0.9144,
      'feet': 0.3048
    };

    return distance * (conversions[unit] || 1);
  }

  /**
   * Validate distance input
   * @param {string} value - The distance value to validate
   * @returns {boolean} True if valid
   */
  validateDistance(value) {
    const num = parseFloat(value);
    return !isNaN(num) && num > 0;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Calculation mode toggle (Pace / Total Time)
    this.paceModeBtn.addEventListener('click', () => this.switchMode('pace'));
    this.timeModeBtn.addEventListener('click', () => this.switchMode('totalTime'));

    // Standard/Advanced mode toggle
    this.standardModeBtn.addEventListener('click', () => this.switchSubMode('standard'));
    this.advancedModeBtn.addEventListener('click', () => this.switchSubMode('advanced'));

    // Pace Standard mode
    this.calculateBtnPaceStandard.addEventListener('click', () => this.handlePaceModeCalculate('standard'));
    this.distanceSelectPaceStandard.addEventListener('change', () => {
      this.updateDistanceEquivalent('pace', 'standard');
    });
    this.paceUnitSelectStandard.addEventListener('change', () => {
      this.updateDistanceEquivalent('pace', 'standard');
    });

    // Pace Advanced mode
    this.calculateBtnPaceAdvanced.addEventListener('click', () => this.handlePaceModeCalculate('advanced'));
    this.distanceInputPaceAdvanced.addEventListener('input', () => {
      this.updateDistanceEquivalent('pace', 'advanced');
    });
    this.distanceUnitSelectPaceAdvanced.addEventListener('change', () => {
      this.updateDistanceEquivalent('pace', 'advanced');
    });

    // Time Standard mode
    this.calculateBtnTimeStandard.addEventListener('click', () => this.handleTimeModeCalculate('standard'));
    this.paceUnitSelectTimeStandard.addEventListener('change', () => {
      this.updateDistanceEquivalent('time', 'standard');
    });
    this.distanceSelectTimeStandard.addEventListener('change', () => {
      this.updateDistanceEquivalent('time', 'standard');
    });

    // Time Advanced mode
    this.calculateBtnTimeAdvanced.addEventListener('click', () => this.handleTimeModeCalculate('advanced'));
    this.distanceInputTimeAdvanced.addEventListener('input', () => {
      this.updateDistanceEquivalent('time', 'advanced');
    });
    this.distanceUnitSelectTimeAdvanced.addEventListener('change', () => {
      this.updateDistanceEquivalent('time', 'advanced');
    });
  }

  /**
   * Switch between calculation modes (Pace / Total Time)
   */
  switchMode(mode) {
    this.currentMode = mode;

    // Update calculation mode buttons
    if (mode === 'pace') {
      this.paceModeBtn.classList.add('mode-toggle__option--active');
      this.timeModeBtn.classList.remove('mode-toggle__option--active');
    } else {
      this.timeModeBtn.classList.add('mode-toggle__option--active');
      this.paceModeBtn.classList.remove('mode-toggle__option--active');
    }

    // Update Standard/Advanced toggle to reflect the mode for this calculation type
    const currentSubMode = mode === 'pace' ? this.currentPaceMode : this.currentTimeMode;
    if (currentSubMode === 'standard') {
      this.standardModeBtn.classList.add('mode-toggle__option--active');
      this.advancedModeBtn.classList.remove('mode-toggle__option--active');
    } else {
      this.advancedModeBtn.classList.add('mode-toggle__option--active');
      this.standardModeBtn.classList.remove('mode-toggle__option--active');
    }

    // Update control visibility
    this.updateControlVisibility();

    // Save state and clear results
    this.saveState();
    this.clearResults();
  }

  /**
   * Switch between Standard/Advanced modes
   */
  switchSubMode(subMode) {
    // Update the appropriate mode variable based on current calculation mode
    if (this.currentMode === 'pace') {
      this.currentPaceMode = subMode;
    } else {
      this.currentTimeMode = subMode;
    }

    // Update Standard/Advanced toggle buttons
    if (subMode === 'standard') {
      this.standardModeBtn.classList.add('mode-toggle__option--active');
      this.advancedModeBtn.classList.remove('mode-toggle__option--active');
    } else {
      this.advancedModeBtn.classList.add('mode-toggle__option--active');
      this.standardModeBtn.classList.remove('mode-toggle__option--active');
    }

    // Update control visibility
    this.updateControlVisibility();

    // Save state and clear results
    this.saveState();
    this.clearResults();
  }

  /**
   * Update distance equivalent display
   */
  updateDistanceEquivalent(mode, subMode) {
    let display, paceUnit, distanceValue, distanceUnit;

    if (subMode === 'standard') {
      // Standard mode: get from dropdown
      let select;
      if (mode === 'pace') {
        select = this.distanceSelectPaceStandard;
        display = this.distanceEquivalentPaceStandard;
        paceUnit = this.paceUnitSelectStandard.value;
      } else {
        select = this.distanceSelectTimeStandard;
        display = this.distanceEquivalentTimeStandard;
        paceUnit = this.paceUnitSelectTimeStandard.value;
      }

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
      let targetUnit;
      if (paceUnit === 'mile') {
        targetUnit = 'miles';
      } else if (paceUnit === '400m') {
        targetUnit = 'm';
      } else {
        targetUnit = 'km';
      }

      if (eventConfig.unit !== targetUnit) {
        const converted = convertDistance(eventConfig.distance, eventConfig.unit, targetUnit);
        const formatted = formatDistance(converted, targetUnit);
        display.textContent = `≈ ${formatted}`;
      } else {
        display.textContent = '';
      }

    } else {
      // Advanced mode: get from custom input
      let distanceInput, distanceUnitSelect;
      if (mode === 'pace') {
        distanceInput = this.distanceInputPaceAdvanced;
        distanceUnitSelect = this.distanceUnitSelectPaceAdvanced;
        display = this.distanceEquivalentPaceAdvanced;
        paceUnit = this.paceUnitSelectAdvanced.value;
      } else {
        distanceInput = this.distanceInputTimeAdvanced;
        distanceUnitSelect = this.distanceUnitSelectTimeAdvanced;
        display = this.distanceEquivalentTimeAdvanced;
        paceUnit = this.paceUnitSelectTimeAdvanced.value;
      }

      distanceValue = distanceInput.value.trim();
      distanceUnit = distanceUnitSelect.value;

      if (!distanceValue || !this.validateDistance(distanceValue)) {
        display.textContent = '';
        return;
      }

      // Calculate equivalent in different units
      const distance = parseFloat(distanceValue);

      // Show equivalent in km, miles, or both depending on current selection
      const equivalents = [];

      if (distanceUnit !== 'km') {
        const distanceInMetres = this.convertDistanceToMetres(distance, distanceUnit);
        const inKm = distanceInMetres / 1000;
        equivalents.push(`${formatDistance(inKm, 'km')}`);
      }

      if (distanceUnit !== 'miles') {
        const distanceInMetres = this.convertDistanceToMetres(distance, distanceUnit);
        const inMiles = distanceInMetres / 1609.344;
        equivalents.push(`${formatDistance(inMiles, 'miles')}`);
      }

      if (equivalents.length > 0) {
        display.textContent = `≈ ${equivalents.join(' / ')}`;
      } else {
        display.textContent = '';
      }
    }
  }

  /**
   * Handle pace mode calculation (Distance + Time → Pace)
   */
  handlePaceModeCalculate(subMode) {
    try {
      this.hideError();

      let timeInput, paceUnitSelect, distanceMetres, distanceDisplayName;

      if (subMode === 'standard') {
        // Standard mode: use dropdown distance
        timeInput = this.timeInputPaceStandard;
        const distanceSelect = this.distanceSelectPaceStandard;
        paceUnitSelect = this.paceUnitSelectStandard;

        timeInput.classList.remove('input-error');
        distanceSelect.classList.remove('input-error');

        const timeInputValue = timeInput.value.trim();
        const distanceKey = distanceSelect.value;

        if (!timeInputValue || !distanceKey) {
          this.hideResults();
          return;
        }

        const totalTimeSeconds = parseTimeInput(timeInputValue);
        if (!this.validateTime(totalTimeSeconds)) {
          timeInput.classList.add('input-error');
          this.showError('Please enter a valid time (e.g., 25:00 or 1:23:45)');
          this.hideResults();
          return;
        }

        distanceMetres = getDistanceInMetres(distanceKey, this.eventsConfig);
        const eventConfig = this.getEventConfig(distanceKey);
        distanceDisplayName = eventConfig.displayName;
        const paceUnit = paceUnitSelect.value;

        const paceSeconds = calculatePace(distanceMetres, totalTimeSeconds, paceUnit);
        this.displayPaceResults(paceSeconds, paceUnit, distanceMetres, eventConfig, totalTimeSeconds);

        this.saveToHistory({
          mode: 'pace',
          distance: distanceDisplayName,
          totalTime: formatTotalTime(totalTimeSeconds),
          pace: `${formatPaceTime(paceSeconds)}/${paceUnit}`,
          timestamp: Date.now()
        });

      } else {
        // Advanced mode: use custom distance input and pace interval
        timeInput = this.timeInputPaceAdvanced;
        const distanceInput = this.distanceInputPaceAdvanced;
        const distanceUnitSelect = this.distanceUnitSelectPaceAdvanced;
        const paceIntervalInput = this.paceIntervalInputPaceAdvanced;
        const paceIntervalUnitSelect = this.paceIntervalUnitSelectPaceAdvanced;

        timeInput.classList.remove('input-error');
        distanceInput.classList.remove('input-error');
        paceIntervalInput.classList.remove('input-error');

        const timeInputValue = timeInput.value.trim();
        const distanceValue = distanceInput.value.trim();
        const distanceUnit = distanceUnitSelect.value;
        const paceIntervalValue = paceIntervalInput.value.trim();
        const paceIntervalUnit = paceIntervalUnitSelect.value;

        if (!timeInputValue || !distanceValue || !paceIntervalValue) {
          this.hideResults();
          return;
        }

        // Validate distance
        if (!this.validateDistance(distanceValue)) {
          distanceInput.classList.add('input-error');
          this.showError('Please enter a valid distance greater than zero');
          this.hideResults();
          return;
        }

        // Validate pace interval
        if (!this.validateDistance(paceIntervalValue)) {
          paceIntervalInput.classList.add('input-error');
          this.showError('Please enter a valid pace interval greater than zero');
          this.hideResults();
          return;
        }

        // Validate time
        const totalTimeSeconds = parseTimeInput(timeInputValue);
        if (!this.validateTime(totalTimeSeconds)) {
          timeInput.classList.add('input-error');
          this.showError('Please enter a valid time (e.g., 25:00 or 1:23:45)');
          this.hideResults();
          return;
        }

        // Convert custom distance and pace interval to metres
        distanceMetres = this.convertDistanceToMetres(parseFloat(distanceValue), distanceUnit);
        const paceIntervalMetres = this.convertDistanceToMetres(parseFloat(paceIntervalValue), paceIntervalUnit);
        distanceDisplayName = `${distanceValue}${distanceUnit}`;

        // Calculate pace over the custom interval
        // Formula: pace = totalTime / (distance / paceInterval)
        const paceSeconds = totalTimeSeconds / (distanceMetres / paceIntervalMetres);

        // Create a synthetic event config for display
        const eventConfig = {
          displayName: distanceDisplayName,
          distance: parseFloat(distanceValue),
          unit: distanceUnit
        };

        const paceIntervalInfo = {
          value: parseFloat(paceIntervalValue),
          unit: paceIntervalUnit,
          metres: paceIntervalMetres
        };

        this.displayPaceResults(paceSeconds, null, distanceMetres, eventConfig, totalTimeSeconds, paceIntervalInfo);

        const paceIntervalText = formatPaceInterval(parseFloat(paceIntervalValue), paceIntervalUnit);
        this.saveToHistory({
          mode: 'pace',
          distance: distanceDisplayName,
          totalTime: formatTotalTime(totalTimeSeconds),
          pace: `${formatPaceTime(paceSeconds)}${paceIntervalText}`,
          timestamp: Date.now()
        });
      }

    } catch (error) {
      console.error('Calculation error:', error);
      this.showError('Unable to calculate pace. Please check your inputs.');
      this.hideResults();
    }
  }

  /**
   * Handle time mode calculation (Distance + Pace → Total Time)
   */
  handleTimeModeCalculate(subMode) {
    try {
      this.hideError();

      let paceInput, paceUnitSelect, distanceMetres, distanceDisplayName;

      if (subMode === 'standard') {
        // Standard mode: use dropdown distance
        paceInput = this.paceInputTimeStandard;
        const distanceSelect = this.distanceSelectTimeStandard;
        paceUnitSelect = this.paceUnitSelectTimeStandard;

        paceInput.classList.remove('input-error');
        distanceSelect.classList.remove('input-error');

        const paceInputValue = paceInput.value.trim();
        const distanceKey = distanceSelect.value;

        if (!paceInputValue || !distanceKey) {
          this.hideResults();
          return;
        }

        const paceSeconds = parsePaceInput(paceInputValue);
        if (!this.validatePace(paceSeconds)) {
          paceInput.classList.add('input-error');
          this.showError('Please enter a valid pace (e.g., 5:00 or 4:30)');
          this.hideResults();
          return;
        }

        distanceMetres = getDistanceInMetres(distanceKey, this.eventsConfig);
        const eventConfig = this.getEventConfig(distanceKey);
        distanceDisplayName = eventConfig.displayName;
        const paceUnit = paceUnitSelect.value;

        const totalTimeSeconds = calculateTotalTime(distanceMetres, paceSeconds, paceUnit);
        this.displayTimeResults(totalTimeSeconds, paceSeconds, paceUnit, distanceMetres, eventConfig);

        this.saveToHistory({
          mode: 'totalTime',
          distance: distanceDisplayName,
          totalTime: formatTotalTime(totalTimeSeconds),
          pace: `${formatPaceTime(paceSeconds)}/${paceUnit}`,
          timestamp: Date.now()
        });

      } else {
        // Advanced mode: use custom distance input and pace interval
        paceInput = this.paceInputTimeAdvanced;
        const distanceInput = this.distanceInputTimeAdvanced;
        const distanceUnitSelect = this.distanceUnitSelectTimeAdvanced;
        const paceIntervalInput = this.paceIntervalInputTimeAdvanced;
        const paceIntervalUnitSelect = this.paceIntervalUnitSelectTimeAdvanced;

        paceInput.classList.remove('input-error');
        distanceInput.classList.remove('input-error');
        paceIntervalInput.classList.remove('input-error');

        const paceInputValue = paceInput.value.trim();
        const distanceValue = distanceInput.value.trim();
        const distanceUnit = distanceUnitSelect.value;
        const paceIntervalValue = paceIntervalInput.value.trim();
        const paceIntervalUnit = paceIntervalUnitSelect.value;

        if (!paceInputValue || !distanceValue || !paceIntervalValue) {
          this.hideResults();
          return;
        }

        // Validate distance
        if (!this.validateDistance(distanceValue)) {
          distanceInput.classList.add('input-error');
          this.showError('Please enter a valid distance greater than zero');
          this.hideResults();
          return;
        }

        // Validate pace interval
        if (!this.validateDistance(paceIntervalValue)) {
          paceIntervalInput.classList.add('input-error');
          this.showError('Please enter a valid pace interval greater than zero');
          this.hideResults();
          return;
        }

        // Validate pace
        const paceSeconds = parsePaceInput(paceInputValue);
        if (!this.validatePace(paceSeconds)) {
          paceInput.classList.add('input-error');
          this.showError('Please enter a valid pace (e.g., 5:00 or 4:30)');
          this.hideResults();
          return;
        }

        // Convert custom distance and pace interval to metres
        distanceMetres = this.convertDistanceToMetres(parseFloat(distanceValue), distanceUnit);
        const paceIntervalMetres = this.convertDistanceToMetres(parseFloat(paceIntervalValue), paceIntervalUnit);
        distanceDisplayName = `${distanceValue} ${distanceUnit}`;

        // Calculate total time using custom pace interval
        // Formula: totalTime = pace * (distance / paceInterval)
        const totalTimeSeconds = paceSeconds * (distanceMetres / paceIntervalMetres);

        // Create a synthetic event config for display
        const eventConfig = {
          displayName: distanceDisplayName,
          distance: parseFloat(distanceValue),
          unit: distanceUnit
        };

        const paceIntervalInfo = {
          value: parseFloat(paceIntervalValue),
          unit: paceIntervalUnit,
          metres: paceIntervalMetres
        };

        this.displayTimeResults(totalTimeSeconds, paceSeconds, null, distanceMetres, eventConfig, paceIntervalInfo);

        const paceIntervalText = formatPaceInterval(parseFloat(paceIntervalValue), paceIntervalUnit);
        this.saveToHistory({
          mode: 'totalTime',
          distance: distanceDisplayName,
          totalTime: formatTotalTime(totalTimeSeconds),
          pace: `${formatPaceTime(paceSeconds)}${paceIntervalText}`,
          timestamp: Date.now()
        });
      }

    } catch (error) {
      console.error('Calculation error:', error);
      this.showError('Unable to calculate total time. Please check your inputs.');
      this.hideResults();
    }
  }

  /**
   * Display pace calculation results
   */
  displayPaceResults(paceSeconds, paceUnit, distanceMetres, eventConfig, totalTimeSeconds, paceIntervalInfo = null) {
    this.resultsContent.innerHTML = '';

    // Determine display format based on whether we have custom pace interval
    let paceDisplayText;
    let pacePerKm;

    if (paceIntervalInfo) {
      // Advanced mode with custom pace interval
      const paceIntervalText = formatPaceInterval(paceIntervalInfo.value, paceIntervalInfo.unit);
      paceDisplayText = `${formatPaceTime(paceSeconds)}${paceIntervalText}`;
      // Convert custom pace to pace per km for equivalents calculation
      pacePerKm = paceSeconds / (paceIntervalInfo.metres / 1000);
    } else {
      // Standard mode
      paceDisplayText = `${formatPaceTime(paceSeconds)}/${paceUnit}`;
      // Convert pace to pace per km for equivalents calculation
      if (paceUnit === 'mile') {
        pacePerKm = paceSeconds / 1.609344;
      } else if (paceUnit === '400m') {
        pacePerKm = paceSeconds * 2.5; // 400m * 2.5 = 1000m = 1km
      } else {
        pacePerKm = paceSeconds;
      }
    }

    // Main result card
    const mainCard = document.createElement('div');
    mainCard.className = 'result-card';
    mainCard.innerHTML = `
      <h3 class="result-card__title">Your Pace</h3>
      <div class="result-card__points">${paceDisplayText}</div>
      <p class="result-card__content">To complete ${eventConfig.displayName} in ${formatTotalTime(totalTimeSeconds)}</p>
    `;
    this.resultsContent.appendChild(mainCard);

    // Equivalent paces (always show standard per km and per mile)
    const equivalents = getEquivalentPaces(pacePerKm);
    const equivalentsCard = document.createElement('div');
    equivalentsCard.className = 'result-card';

    const equivalentsTitle = document.createElement('h3');
    equivalentsTitle.className = 'result-card__title';
    equivalentsTitle.textContent = 'Equivalent Paces & Speeds';

    const equivalentsGrid = document.createElement('div');
    equivalentsGrid.className = 'equivalencies-grid';
    equivalentsGrid.innerHTML = `
      <div class="equivalency-item">
        <div class="equivalency-item__event">Pace per km</div>
        <div class="equivalency-item__performance">${formatPaceTime(equivalents.perKm)}/km</div>
      </div>
      <div class="equivalency-item">
        <div class="equivalency-item__event">Pace per mile</div>
        <div class="equivalency-item__performance">${formatPaceTime(equivalents.perMile)}/mile</div>
      </div>
      <div class="equivalency-item">
        <div class="equivalency-item__event">Pace per m</div>
        <div class="equivalency-item__performance">${formatPaceTime(equivalents.perMeter)}/m</div>
      </div>
      <div class="equivalency-item">
        <div class="equivalency-item__event">Pace per yard</div>
        <div class="equivalency-item__performance">${formatPaceTime(equivalents.perYard)}/yard</div>
      </div>
      <div class="equivalency-item">
        <div class="equivalency-item__event">Pace per foot</div>
        <div class="equivalency-item__performance">${formatPaceTime(equivalents.perFoot)}/ft</div>
      </div>
      <div class="equivalency-item">
        <div class="equivalency-item__event">Speed (km/h)</div>
        <div class="equivalency-item__performance">${formatSpeed(equivalents.kmh, 'km/h')}</div>
      </div>
      <div class="equivalency-item">
        <div class="equivalency-item__event">Speed (mph)</div>
        <div class="equivalency-item__performance">${formatSpeed(equivalents.mph, 'mph')}</div>
      </div>
      <div class="equivalency-item">
        <div class="equivalency-item__event">Speed (m/s)</div>
        <div class="equivalency-item__performance">${formatSpeed(equivalents.metersPerSecond, 'm/s')}</div>
      </div>
      <div class="equivalency-item">
        <div class="equivalency-item__event">Speed (ft/s)</div>
        <div class="equivalency-item__performance">${formatSpeed(equivalents.feetPerSecond, 'ft/s')}</div>
      </div>
      <div class="equivalency-item">
        <div class="equivalency-item__event">Speed (yd/s)</div>
        <div class="equivalency-item__performance">${formatSpeed(equivalents.yardsPerSecond, 'yd/s')}</div>
      </div>
    `;

    equivalentsCard.appendChild(equivalentsTitle);
    equivalentsCard.appendChild(equivalentsGrid);
    this.resultsContent.appendChild(equivalentsCard);

    // Make the equivalent paces section collapsible
    makeCollapsible(equivalentsTitle, equivalentsGrid, 'paceCalculator.equivalentPaces.collapsed', true);

    // Splits - use custom interval if provided, or create interval based on pace unit
    let splitIntervalMetres;
    let splitIntervalInfo;

    if (paceIntervalInfo) {
      // Advanced mode - use custom interval
      splitIntervalMetres = paceIntervalInfo.metres;
      splitIntervalInfo = paceIntervalInfo;
    } else {
      // Standard mode - create interval based on pace unit
      if (paceUnit === 'mile') {
        splitIntervalMetres = 1609.344;
        splitIntervalInfo = { value: 1, unit: 'miles', metres: 1609.344 };
      } else if (paceUnit === '400m') {
        splitIntervalMetres = 400;
        splitIntervalInfo = { value: 400, unit: 'm', metres: 400 };
      } else {
        splitIntervalMetres = 1000;
        splitIntervalInfo = { value: 1, unit: 'km', metres: 1000 };
      }
    }

    const splits = this.calculateCustomSplits(distanceMetres, pacePerKm, eventConfig, splitIntervalMetres, splitIntervalInfo);
    this.displaySplits(splits);

    this.showResults();
  }

  /**
   * Display total time calculation results
   */
  displayTimeResults(totalTimeSeconds, paceSeconds, paceUnit, distanceMetres, eventConfig, paceIntervalInfo = null) {
    this.resultsContent.innerHTML = '';

    // Determine display format based on whether we have custom pace interval
    let paceDisplayText;
    let pacePerKm;

    if (paceIntervalInfo) {
      // Advanced mode with custom pace interval
      const paceIntervalText = formatPaceInterval(paceIntervalInfo.value, paceIntervalInfo.unit);
      paceDisplayText = `${formatPaceTime(paceSeconds)}${paceIntervalText}`;
      // Convert custom pace to pace per km for equivalents calculation
      pacePerKm = paceSeconds / (paceIntervalInfo.metres / 1000);
    } else {
      // Standard mode
      paceDisplayText = `${formatPaceTime(paceSeconds)}/${paceUnit}`;
      // Convert pace to pace per km for equivalents calculation
      if (paceUnit === 'mile') {
        pacePerKm = paceSeconds / 1.609344;
      } else if (paceUnit === '400m') {
        pacePerKm = paceSeconds * 2.5; // 400m * 2.5 = 1000m = 1km
      } else {
        pacePerKm = paceSeconds;
      }
    }

    // Main result card
    const mainCard = document.createElement('div');
    mainCard.className = 'result-card';
    mainCard.innerHTML = `
      <h3 class="result-card__title">Projected Finish Time</h3>
      <div class="result-card__points">${formatTotalTime(totalTimeSeconds)}</div>
      <p class="result-card__content">For ${eventConfig.displayName} at ${paceDisplayText} pace</p>
    `;
    this.resultsContent.appendChild(mainCard);

    // Equivalent paces (always show standard per km and per mile)
    const equivalents = getEquivalentPaces(pacePerKm);
    const equivalentsCard = document.createElement('div');
    equivalentsCard.className = 'result-card';

    const equivalentsTitle = document.createElement('h3');
    equivalentsTitle.className = 'result-card__title';
    equivalentsTitle.textContent = 'Equivalent Paces & Speeds';

    const equivalentsGrid = document.createElement('div');
    equivalentsGrid.className = 'equivalencies-grid';
    equivalentsGrid.innerHTML = `
      <div class="equivalency-item">
        <div class="equivalency-item__event">Pace per km</div>
        <div class="equivalency-item__performance">${formatPaceTime(equivalents.perKm)}/km</div>
      </div>
      <div class="equivalency-item">
        <div class="equivalency-item__event">Pace per mile</div>
        <div class="equivalency-item__performance">${formatPaceTime(equivalents.perMile)}/mile</div>
      </div>
      <div class="equivalency-item">
        <div class="equivalency-item__event">Pace per m</div>
        <div class="equivalency-item__performance">${formatPaceTime(equivalents.perMeter)}/m</div>
      </div>
      <div class="equivalency-item">
        <div class="equivalency-item__event">Pace per yard</div>
        <div class="equivalency-item__performance">${formatPaceTime(equivalents.perYard)}/yard</div>
      </div>
      <div class="equivalency-item">
        <div class="equivalency-item__event">Pace per foot</div>
        <div class="equivalency-item__performance">${formatPaceTime(equivalents.perFoot)}/ft</div>
      </div>
      <div class="equivalency-item">
        <div class="equivalency-item__event">Speed (km/h)</div>
        <div class="equivalency-item__performance">${formatSpeed(equivalents.kmh, 'km/h')}</div>
      </div>
      <div class="equivalency-item">
        <div class="equivalency-item__event">Speed (mph)</div>
        <div class="equivalency-item__performance">${formatSpeed(equivalents.mph, 'mph')}</div>
      </div>
      <div class="equivalency-item">
        <div class="equivalency-item__event">Speed (m/s)</div>
        <div class="equivalency-item__performance">${formatSpeed(equivalents.metersPerSecond, 'm/s')}</div>
      </div>
      <div class="equivalency-item">
        <div class="equivalency-item__event">Speed (ft/s)</div>
        <div class="equivalency-item__performance">${formatSpeed(equivalents.feetPerSecond, 'ft/s')}</div>
      </div>
      <div class="equivalency-item">
        <div class="equivalency-item__event">Speed (yd/s)</div>
        <div class="equivalency-item__performance">${formatSpeed(equivalents.yardsPerSecond, 'yd/s')}</div>
      </div>
    `;

    equivalentsCard.appendChild(equivalentsTitle);
    equivalentsCard.appendChild(equivalentsGrid);
    this.resultsContent.appendChild(equivalentsCard);

    // Make the equivalent paces section collapsible
    makeCollapsible(equivalentsTitle, equivalentsGrid, 'paceCalculator.equivalentPaces.collapsed', true);

    // Splits - use custom interval if provided, or create interval based on pace unit
    let splitIntervalMetres;
    let splitIntervalInfo;

    if (paceIntervalInfo) {
      // Advanced mode - use custom interval
      splitIntervalMetres = paceIntervalInfo.metres;
      splitIntervalInfo = paceIntervalInfo;
    } else {
      // Standard mode - create interval based on pace unit
      if (paceUnit === 'mile') {
        splitIntervalMetres = 1609.344;
        splitIntervalInfo = { value: 1, unit: 'miles', metres: 1609.344 };
      } else if (paceUnit === '400m') {
        splitIntervalMetres = 400;
        splitIntervalInfo = { value: 400, unit: 'm', metres: 400 };
      } else {
        splitIntervalMetres = 1000;
        splitIntervalInfo = { value: 1, unit: 'km', metres: 1000 };
      }
    }

    const splits = this.calculateCustomSplits(distanceMetres, pacePerKm, eventConfig, splitIntervalMetres, splitIntervalInfo);
    this.displaySplits(splits);

    this.showResults();
  }

  /**
   * Calculate split times at custom intervals
   */
  calculateCustomSplits(distanceMetres, pacePerKm, eventConfig, splitIntervalMetres, paceIntervalInfo) {
    const splits = [];
    let currentDistanceMetres = 0;

    // Calculate split interval unit for display
    const splitUnit = paceIntervalInfo ? paceIntervalInfo.unit : 'km';

    while (currentDistanceMetres < distanceMetres) {
      currentDistanceMetres += splitIntervalMetres;

      // Don't exceed total distance
      if (currentDistanceMetres > distanceMetres) {
        currentDistanceMetres = distanceMetres;
      }

      // Calculate time for this split
      const splitTime = (currentDistanceMetres / 1000) * pacePerKm;

      // Format distance label
      let distanceLabel;
      if (paceIntervalInfo) {
        // Custom interval - show in the interval units
        const distanceInIntervalUnits = currentDistanceMetres / splitIntervalMetres * paceIntervalInfo.value;
        const formattedValue = parseFloat(distanceInIntervalUnits.toFixed(2));
        distanceLabel = formatDistanceWithUnit(formattedValue, splitUnit);
      } else {
        // Standard 1km intervals
        const distanceInKm = parseFloat((currentDistanceMetres / 1000).toFixed(2));
        distanceLabel = formatDistanceWithUnit(distanceInKm, 'km');
      }

      splits.push({
        distanceLabel: distanceLabel,
        time: splitTime
      });
    }

    return splits;
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

    const splitsTitle = document.createElement('h3');
    splitsTitle.className = 'result-card__title';
    splitsTitle.textContent = 'Split Times';

    const splitsContent = document.createElement('div');
    splitsContent.className = 'history-table-container';

    let tableHTML = `
      <table class="history-table history-table--splits">
        <thead>
          <tr>
            <th>Distance</th>
            <th>Cumulative Time</th>
          </tr>
        </thead>
        <tbody>
    `;

    splits.forEach(split => {
      tableHTML += `
        <tr class="history-row">
          <td>${split.distanceLabel}</td>
          <td class="history-row__performance">${formatTotalTime(split.time)}</td>
        </tr>
      `;
    });

    tableHTML += `
        </tbody>
      </table>
    `;

    splitsContent.innerHTML = tableHTML;
    splitsCard.appendChild(splitsTitle);
    splitsCard.appendChild(splitsContent);
    this.resultsContent.appendChild(splitsCard);

    // Make the split times section collapsible and start collapsed by default
    makeCollapsible(splitsTitle, splitsContent, 'paceCalculator.splitTimes.collapsed', false);
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
          <button class="history-delete-btn" data-id="${entry.id}" aria-label="Delete"></button>
        </td>
      `;

      // Add delete icon to button
      const deleteBtn = row.querySelector('.history-delete-btn');
      if (deleteBtn) {
        const deleteIcon = createIcon('x', 'icon--sm');
        deleteBtn.appendChild(deleteIcon);
      }

      // Add drag and drop listeners
      row.addEventListener('dragstart', (e) => this.handleDragStart(e));
      row.addEventListener('dragover', (e) => this.handleDragOver(e));
      row.addEventListener('drop', (e) => this.handleDrop(e));
      row.addEventListener('dragend', (e) => this.handleDragEnd(e));

      // Add delete listener
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
