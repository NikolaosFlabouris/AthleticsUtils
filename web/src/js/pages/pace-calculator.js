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
  calculateSpeed,
  calculateTotalTimeFromSpeed,
  convertPaceToSpeedUnit,
  convertSpeedToPace,
  getSpeedUnitSplitInterval,
  calculateSmartSplits,
  getDistanceInMetres,
  getEquivalentPaces
} from '../calculators/pace-calculations.js';
import {
  parseTimeInput,
  parsePaceInput,
  parseSpeedInput,
  formatPaceTime,
  formatTotalTime,
  formatSpeed,
  formatSpeedValue,
  formatSpeedWithUnit,
  getSpeedUnitDisplay,
  getSpeedPlaceholder,
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
      results: '#results-container'
    });

    // History storage key
    this.historyStorageKey = 'athleticsUtils.paceHistory';
    this.maxHistoryEntries = 10;

    // Split format storage key
    this.splitFormatStorageKey = 'paceCalculatorSplitFormat';
  }

  /**
   * Initialize DOM elements
   */
  initializeElements() {
    // Primary toggle buttons (Measurement Type: Pace / Speed)
    this.measurementPaceBtn = document.getElementById('mode-toggle-measurement-pace');
    this.measurementSpeedBtn = document.getElementById('mode-toggle-measurement-speed');

    // Secondary toggle buttons (Calculate / Total Time) with dynamic labels
    this.calculateModeBtn = document.getElementById('mode-toggle-calculate');
    this.timeModeBtn = document.getElementById('mode-toggle-time');
    this.calculateLabel = document.getElementById('calculate-label');
    this.timeLabel = document.getElementById('time-label');

    // Tertiary toggle buttons (Standard / Advanced)
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

    // Speed Standard mode elements (dist + time → speed)
    this.speedStandardControls = document.getElementById('speed-standard-controls');
    this.distanceSelectSpeedStandard = document.getElementById('distance-select-speed-standard');
    this.timeInputSpeedStandard = document.getElementById('time-input-speed-standard');
    this.speedUnitSelectStandard = document.getElementById('speed-unit-select-standard');
    this.distanceEquivalentSpeedStandard = document.getElementById('distance-equivalent-speed-standard');
    this.calculateBtnSpeedStandard = document.getElementById('calculate-btn-speed-standard');

    // Speed Advanced mode elements (custom dist + time → speed)
    this.speedAdvancedControls = document.getElementById('speed-advanced-controls');
    this.distanceInputSpeedAdvanced = document.getElementById('distance-input-speed-advanced');
    this.distanceUnitSelectSpeedAdvanced = document.getElementById('distance-unit-select-speed-advanced');
    this.timeInputSpeedAdvanced = document.getElementById('time-input-speed-advanced');
    this.speedUnitSelectAdvanced = document.getElementById('speed-unit-select-advanced');
    this.distanceEquivalentSpeedAdvanced = document.getElementById('distance-equivalent-speed-advanced');
    this.calculateBtnSpeedAdvanced = document.getElementById('calculate-btn-speed-advanced');

    // Speed Time Standard mode elements (dist + speed → time)
    this.speedTimeStandardControls = document.getElementById('speed-time-standard-controls');
    this.distanceSelectSpeedTimeStandard = document.getElementById('distance-select-speed-time-standard');
    this.speedInputTimeStandard = document.getElementById('speed-input-time-standard');
    this.speedUnitSelectTimeStandard = document.getElementById('speed-unit-select-time-standard');
    this.distanceEquivalentSpeedTimeStandard = document.getElementById('distance-equivalent-speed-time-standard');
    this.calculateBtnSpeedTimeStandard = document.getElementById('calculate-btn-speed-time-standard');

    // Speed Time Advanced mode elements (custom dist + speed → time)
    this.speedTimeAdvancedControls = document.getElementById('speed-time-advanced-controls');
    this.distanceInputSpeedTimeAdvanced = document.getElementById('distance-input-speed-time-advanced');
    this.distanceUnitSelectSpeedTimeAdvanced = document.getElementById('distance-unit-select-speed-time-advanced');
    this.speedInputTimeAdvanced = document.getElementById('speed-input-time-advanced');
    this.speedUnitSelectTimeAdvanced = document.getElementById('speed-unit-select-time-advanced');
    this.distanceEquivalentSpeedTimeAdvanced = document.getElementById('distance-equivalent-speed-time-advanced');
    this.calculateBtnSpeedTimeAdvanced = document.getElementById('calculate-btn-speed-time-advanced');

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
    // Load measurement mode (pace vs speed)
    this.currentMeasurementMode = sessionStorage.getItem('paceCalculatorMeasurementMode') || 'pace';

    // Load calculate mode (calculate vs totalTime)
    this.currentMode = sessionStorage.getItem('paceCalculatorCalculateMode') || 'calculate';

    // Load sub-modes for each combination
    this.currentPaceMode = sessionStorage.getItem('paceCalculatorPaceSubMode') || 'standard';
    this.currentTimeMode = sessionStorage.getItem('paceCalculatorTimeSubMode') || 'standard';
    this.currentSpeedMode = sessionStorage.getItem('paceCalculatorSpeedSubMode') || 'standard';
    this.currentSpeedTimeMode = sessionStorage.getItem('paceCalculatorSpeedTimeSubMode') || 'standard';

    // Load split format
    this.currentSplitFormat = sessionStorage.getItem(this.splitFormatStorageKey) || 'default';

    // Apply initial mode state
    this.applyModeState();
  }

  /**
   * Save state to sessionStorage
   */
  saveState() {
    sessionStorage.setItem('paceCalculatorMeasurementMode', this.currentMeasurementMode);
    sessionStorage.setItem('paceCalculatorCalculateMode', this.currentMode);
    sessionStorage.setItem('paceCalculatorPaceSubMode', this.currentPaceMode);
    sessionStorage.setItem('paceCalculatorTimeSubMode', this.currentTimeMode);
    sessionStorage.setItem('paceCalculatorSpeedSubMode', this.currentSpeedMode);
    sessionStorage.setItem('paceCalculatorSpeedTimeSubMode', this.currentSpeedTimeMode);
    sessionStorage.setItem(this.splitFormatStorageKey, this.currentSplitFormat);
  }

  /**
   * Apply current mode state to UI
   */
  applyModeState() {
    // Update measurement type buttons (Pace / Speed)
    if (this.currentMeasurementMode === 'pace') {
      this.measurementPaceBtn.classList.add('mode-toggle__option--active');
      this.measurementSpeedBtn.classList.remove('mode-toggle__option--active');
    } else {
      this.measurementSpeedBtn.classList.add('mode-toggle__option--active');
      this.measurementPaceBtn.classList.remove('mode-toggle__option--active');
    }

    // Update dynamic labels based on measurement mode
    this.updateDynamicLabels();

    // Update calculate mode buttons (Calculate / Total Time)
    if (this.currentMode === 'calculate') {
      this.calculateModeBtn.classList.add('mode-toggle__option--active');
      this.timeModeBtn.classList.remove('mode-toggle__option--active');
    } else {
      this.timeModeBtn.classList.add('mode-toggle__option--active');
      this.calculateModeBtn.classList.remove('mode-toggle__option--active');
    }

    // Update Standard/Advanced buttons based on current sub-mode
    const currentSubMode = this.getCurrentSubMode();
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
   * Update dynamic labels based on measurement mode
   */
  updateDynamicLabels() {
    if (this.currentMeasurementMode === 'pace') {
      this.calculateLabel.textContent = 'Pace';
    } else {
      this.calculateLabel.textContent = 'Speed';
    }
    // timeLabel always stays "Total Time"
  }

  /**
   * Get the current sub-mode based on measurement and calculate modes
   * @returns {string} Current sub-mode ('standard' or 'advanced')
   */
  getCurrentSubMode() {
    if (this.currentMeasurementMode === 'pace') {
      return this.currentMode === 'calculate' ? this.currentPaceMode : this.currentTimeMode;
    } else {
      return this.currentMode === 'calculate' ? this.currentSpeedMode : this.currentSpeedTimeMode;
    }
  }

  /**
   * Get the active control group element
   * @returns {HTMLElement} The active control group element
   */
  getActiveControlGroup() {
    const key = `${this.currentMeasurementMode}-${this.currentMode}-${this.getCurrentSubMode()}`;
    const groups = {
      'pace-calculate-standard': this.paceStandardControls,
      'pace-calculate-advanced': this.paceAdvancedControls,
      'pace-totalTime-standard': this.timeStandardControls,
      'pace-totalTime-advanced': this.timeAdvancedControls,
      'speed-calculate-standard': this.speedStandardControls,
      'speed-calculate-advanced': this.speedAdvancedControls,
      'speed-totalTime-standard': this.speedTimeStandardControls,
      'speed-totalTime-advanced': this.speedTimeAdvancedControls
    };
    return groups[key];
  }

  /**
   * Update which control group is visible
   */
  updateControlVisibility() {
    // Hide all 8 control groups
    this.paceStandardControls.classList.add('hidden');
    this.paceAdvancedControls.classList.add('hidden');
    this.timeStandardControls.classList.add('hidden');
    this.timeAdvancedControls.classList.add('hidden');
    this.speedStandardControls.classList.add('hidden');
    this.speedAdvancedControls.classList.add('hidden');
    this.speedTimeStandardControls.classList.add('hidden');
    this.speedTimeAdvancedControls.classList.add('hidden');

    // Show the active control group
    const activeGroup = this.getActiveControlGroup();
    if (activeGroup) {
      activeGroup.classList.remove('hidden');
    }
  }

  /**
   * Get equivalent speed unit for pace unit
   * @param {string} paceUnit - Pace unit ('km', 'mile', '400m', '200m', '100m')
   * @returns {string} Equivalent speed unit
   */
  getEquivalentSpeedUnit(paceUnit) {
    const mapping = {
      'km': 'kmh',
      'mile': 'mph',
      '400m': 'ms',
      '200m': 'ms',
      '100m': 'ms'
    };
    return mapping[paceUnit] || 'kmh';
  }

  /**
   * Get equivalent pace unit for speed unit
   * @param {string} speedUnit - Speed unit ('kmh', 'mph', 'ms', 'fts', 'yds')
   * @returns {string} Equivalent pace unit
   */
  getEquivalentPaceUnit(speedUnit) {
    const mapping = {
      'kmh': 'km',
      'mph': 'mile',
      'ms': '400m',
      'fts': '400m',
      'yds': '400m'
    };
    return mapping[speedUnit] || 'km';
  }

  /**
   * Populate distance select dropdowns (Standard mode only)
   */
  populateDistanceDropdowns() {
    const distances = this.getPaceDistances();

    // Populate all Standard mode dropdowns (Advanced mode uses custom input)
    const dropdowns = [
      this.distanceSelectPaceStandard,
      this.distanceSelectTimeStandard,
      this.distanceSelectSpeedStandard,
      this.distanceSelectSpeedTimeStandard
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
    this.distanceSelectSpeedStandard.value = defaultDistance;
    this.distanceSelectSpeedTimeStandard.value = defaultDistance;
    this.updateDistanceEquivalent('pace', 'standard');
    this.updateDistanceEquivalent('time', 'standard');

    // Advanced mode: set default values for custom input (5 km)
    this.distanceInputPaceAdvanced.value = '5';
    this.distanceInputTimeAdvanced.value = '5';
    this.distanceInputSpeedAdvanced.value = '5';
    this.distanceInputSpeedTimeAdvanced.value = '5';
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
   * Handle Enter key press in input fields to trigger calculation
   * @param {KeyboardEvent} event - The keyboard event
   */
  handleEnterKeyPress(event) {
    if (event.key === 'Enter') {
      event.preventDefault();

      // Determine which calculate handler to call based on current mode
      const key = `${this.currentMeasurementMode}-${this.currentMode}`;
      const subMode = this.getCurrentSubMode();

      switch (key) {
        case 'pace-calculate':
          this.handlePaceModeCalculate(subMode);
          break;
        case 'pace-totalTime':
          this.handleTimeModeCalculate(subMode);
          break;
        case 'speed-calculate':
          this.handleSpeedModeCalculate(subMode);
          break;
        case 'speed-totalTime':
          this.handleSpeedTimeModeCalculate(subMode);
          break;
      }
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Primary toggle: Measurement Type (Pace / Speed)
    this.measurementPaceBtn.addEventListener('click', () => this.handleMeasurementModeSwitch('pace'));
    this.measurementSpeedBtn.addEventListener('click', () => this.handleMeasurementModeSwitch('speed'));

    // Secondary toggle: Calculation mode (Calculate / Total Time)
    this.calculateModeBtn.addEventListener('click', () => this.switchMode('calculate'));
    this.timeModeBtn.addEventListener('click', () => this.switchMode('totalTime'));

    // Tertiary toggle: Standard/Advanced mode
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
    this.timeInputPaceStandard.addEventListener('input', () => {
      this.clearInputError(this.timeInputPaceStandard);
    });
    this.timeInputPaceStandard.addEventListener('keydown', (e) => this.handleEnterKeyPress(e));

    // Pace Advanced mode
    this.calculateBtnPaceAdvanced.addEventListener('click', () => this.handlePaceModeCalculate('advanced'));
    this.distanceInputPaceAdvanced.addEventListener('input', () => {
      this.clearInputError(this.distanceInputPaceAdvanced);
      this.updateDistanceEquivalent('pace', 'advanced');
    });
    this.distanceUnitSelectPaceAdvanced.addEventListener('change', () => {
      this.updateDistanceEquivalent('pace', 'advanced');
    });
    this.timeInputPaceAdvanced.addEventListener('input', () => {
      this.clearInputError(this.timeInputPaceAdvanced);
    });
    this.paceIntervalInputPaceAdvanced.addEventListener('input', () => {
      this.clearInputError(this.paceIntervalInputPaceAdvanced);
    });
    this.distanceInputPaceAdvanced.addEventListener('keydown', (e) => this.handleEnterKeyPress(e));
    this.timeInputPaceAdvanced.addEventListener('keydown', (e) => this.handleEnterKeyPress(e));
    this.paceIntervalInputPaceAdvanced.addEventListener('keydown', (e) => this.handleEnterKeyPress(e));

    // Time Standard mode
    this.calculateBtnTimeStandard.addEventListener('click', () => this.handleTimeModeCalculate('standard'));
    this.paceUnitSelectTimeStandard.addEventListener('change', () => {
      this.updateDistanceEquivalent('time', 'standard');
    });
    this.distanceSelectTimeStandard.addEventListener('change', () => {
      this.updateDistanceEquivalent('time', 'standard');
    });
    this.paceInputTimeStandard.addEventListener('input', () => {
      this.clearInputError(this.paceInputTimeStandard);
    });
    this.paceInputTimeStandard.addEventListener('keydown', (e) => this.handleEnterKeyPress(e));

    // Time Advanced mode
    this.calculateBtnTimeAdvanced.addEventListener('click', () => this.handleTimeModeCalculate('advanced'));
    this.distanceInputTimeAdvanced.addEventListener('input', () => {
      this.clearInputError(this.distanceInputTimeAdvanced);
      this.updateDistanceEquivalent('time', 'advanced');
    });
    this.distanceUnitSelectTimeAdvanced.addEventListener('change', () => {
      this.updateDistanceEquivalent('time', 'advanced');
    });
    this.paceInputTimeAdvanced.addEventListener('input', () => {
      this.clearInputError(this.paceInputTimeAdvanced);
    });
    this.paceIntervalInputTimeAdvanced.addEventListener('input', () => {
      this.clearInputError(this.paceIntervalInputTimeAdvanced);
    });
    this.distanceInputTimeAdvanced.addEventListener('keydown', (e) => this.handleEnterKeyPress(e));
    this.paceInputTimeAdvanced.addEventListener('keydown', (e) => this.handleEnterKeyPress(e));
    this.paceIntervalInputTimeAdvanced.addEventListener('keydown', (e) => this.handleEnterKeyPress(e));

    // Speed Standard mode
    this.calculateBtnSpeedStandard.addEventListener('click', () => this.handleSpeedModeCalculate('standard'));
    this.distanceSelectSpeedStandard.addEventListener('change', () => {
      this.updateDistanceEquivalent('speed', 'standard');
    });
    this.speedUnitSelectStandard.addEventListener('change', () => {
      this.updateDistanceEquivalent('speed', 'standard');
    });
    this.timeInputSpeedStandard.addEventListener('input', () => {
      this.clearInputError(this.timeInputSpeedStandard);
    });
    this.timeInputSpeedStandard.addEventListener('keydown', (e) => this.handleEnterKeyPress(e));

    // Speed Advanced mode
    this.calculateBtnSpeedAdvanced.addEventListener('click', () => this.handleSpeedModeCalculate('advanced'));
    this.distanceInputSpeedAdvanced.addEventListener('input', () => {
      this.clearInputError(this.distanceInputSpeedAdvanced);
      this.updateDistanceEquivalent('speed', 'advanced');
    });
    this.distanceUnitSelectSpeedAdvanced.addEventListener('change', () => {
      this.updateDistanceEquivalent('speed', 'advanced');
    });
    this.timeInputSpeedAdvanced.addEventListener('input', () => {
      this.clearInputError(this.timeInputSpeedAdvanced);
    });
    this.distanceInputSpeedAdvanced.addEventListener('keydown', (e) => this.handleEnterKeyPress(e));
    this.timeInputSpeedAdvanced.addEventListener('keydown', (e) => this.handleEnterKeyPress(e));

    // Speed Time Standard mode
    this.calculateBtnSpeedTimeStandard.addEventListener('click', () => this.handleSpeedTimeModeCalculate('standard'));
    this.distanceSelectSpeedTimeStandard.addEventListener('change', () => {
      this.updateDistanceEquivalent('speedTime', 'standard');
    });
    this.speedUnitSelectTimeStandard.addEventListener('change', () => {
      this.updateDistanceEquivalent('speedTime', 'standard');
    });
    this.speedInputTimeStandard.addEventListener('input', () => {
      this.clearInputError(this.speedInputTimeStandard);
    });
    this.speedInputTimeStandard.addEventListener('keydown', (e) => this.handleEnterKeyPress(e));

    // Speed Time Advanced mode
    this.calculateBtnSpeedTimeAdvanced.addEventListener('click', () => this.handleSpeedTimeModeCalculate('advanced'));
    this.distanceInputSpeedTimeAdvanced.addEventListener('input', () => {
      this.clearInputError(this.distanceInputSpeedTimeAdvanced);
      this.updateDistanceEquivalent('speedTime', 'advanced');
    });
    this.distanceUnitSelectSpeedTimeAdvanced.addEventListener('change', () => {
      this.updateDistanceEquivalent('speedTime', 'advanced');
    });
    this.speedInputTimeAdvanced.addEventListener('input', () => {
      this.clearInputError(this.speedInputTimeAdvanced);
    });
    this.distanceInputSpeedTimeAdvanced.addEventListener('keydown', (e) => this.handleEnterKeyPress(e));
    this.speedInputTimeAdvanced.addEventListener('keydown', (e) => this.handleEnterKeyPress(e));
  }

  /**
   * Clear error state from input field
   * @param {HTMLElement} input - Input element to clear error from
   */
  clearInputError(input) {
    if (input) {
      input.classList.remove('input-error');
      input.setAttribute('aria-invalid', 'false');
    }
  }

  /**
   * Set error state on input field
   * @param {HTMLElement} input - Input element to mark as invalid
   */
  setInputError(input) {
    if (input) {
      input.classList.add('input-error');
      input.setAttribute('aria-invalid', 'true');
    }
  }

  /**
   * Switch between calculation modes (Pace / Total Time)
   */
  /**
   * Switch between Calculate and Total Time modes (secondary toggle)
   */
  switchMode(mode) {
    this.currentMode = mode;

    // Update calculation mode buttons
    if (mode === 'calculate') {
      this.calculateModeBtn.classList.add('mode-toggle__option--active');
      this.timeModeBtn.classList.remove('mode-toggle__option--active');
    } else {
      this.timeModeBtn.classList.add('mode-toggle__option--active');
      this.calculateModeBtn.classList.remove('mode-toggle__option--active');
    }

    // Update Standard/Advanced toggle to reflect the sub-mode for this combination
    const currentSubMode = this.getCurrentSubMode();
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
   * Switch between Standard/Advanced modes (tertiary toggle)
   */
  switchSubMode(subMode) {
    // Update the appropriate sub-mode variable based on current measurement and calculation modes
    if (this.currentMeasurementMode === 'pace') {
      if (this.currentMode === 'calculate') {
        this.currentPaceMode = subMode;
      } else {
        this.currentTimeMode = subMode;
      }
    } else {
      if (this.currentMode === 'calculate') {
        this.currentSpeedMode = subMode;
      } else {
        this.currentSpeedTimeMode = subMode;
      }
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
   * Handle switching between Pace and Speed measurement modes (primary toggle)
   * Converts values where possible
   */
  handleMeasurementModeSwitch(newMode) {
    const oldMode = this.currentMeasurementMode;
    if (oldMode === newMode) return;

    // Try to convert values between pace and speed
    if (this.currentMode === 'calculate') {
      // We're in "calculate pace/speed from distance+time" mode
      // Distance and time inputs stay the same, just update unit selectors

      if (newMode === 'speed') {
        // Pace → Speed: Convert pace unit to equivalent speed unit
        const currentSubMode = this.currentPaceMode;

        if (currentSubMode === 'standard') {
          const paceUnit = this.paceUnitSelectStandard.value;
          const speedUnit = this.getEquivalentSpeedUnit(paceUnit);
          this.speedUnitSelectStandard.value = speedUnit;
        }
        // Advanced mode: speed units are already set to defaults
      } else {
        // Speed → Pace: Convert speed unit to equivalent pace unit
        const currentSubMode = this.currentSpeedMode;

        if (currentSubMode === 'standard') {
          const speedUnit = this.speedUnitSelectStandard.value;
          const paceUnit = this.getEquivalentPaceUnit(speedUnit);
          this.paceUnitSelectStandard.value = paceUnit;
        }
      }
    } else {
      // We're in "calculate time from distance+pace/speed" mode
      // Need to convert the pace/speed input value

      if (newMode === 'speed') {
        // Pace → Speed: Convert pace input to speed
        const currentSubMode = this.currentTimeMode;

        if (currentSubMode === 'standard') {
          const paceInput = this.paceInputTimeStandard.value.trim();
          if (paceInput) {
            const paceSeconds = parsePaceInput(paceInput);
            if (paceSeconds) {
              const paceUnit = this.paceUnitSelectTimeStandard.value;
              const speedUnit = this.getEquivalentSpeedUnit(paceUnit);

              // Convert pace to pace per km first
              const pacePerKm = this.convertPaceToPerKm(paceSeconds, paceUnit);
              // Then convert to speed
              const speed = convertPaceToSpeedUnit(pacePerKm, speedUnit);

              this.speedInputTimeStandard.value = speed.toFixed(2);
              this.speedUnitSelectTimeStandard.value = speedUnit;
            }
          }
        }
        // Advanced mode: similar conversion would go here
      } else {
        // Speed → Pace: Convert speed input to pace
        const currentSubMode = this.currentSpeedTimeMode;

        if (currentSubMode === 'standard') {
          const speedInput = this.speedInputTimeStandard.value.trim();
          if (speedInput) {
            const speed = parseFloat(speedInput);
            if (!isNaN(speed) && speed > 0) {
              const speedUnit = this.speedUnitSelectTimeStandard.value;
              const paceUnit = this.getEquivalentPaceUnit(speedUnit);

              // Convert speed to pace per km
              const pacePerKm = convertSpeedToPace(speed, speedUnit);
              // Then convert to target pace unit
              const paceInTargetUnit = this.convertPaceFromPerKm(pacePerKm, paceUnit);

              this.paceInputTimeStandard.value = formatPaceTime(paceInTargetUnit);
              this.paceUnitSelectTimeStandard.value = paceUnit;
            }
          }
        }
      }
    }

    // Update state
    this.currentMeasurementMode = newMode;

    // Update measurement type button visual state
    if (newMode === 'pace') {
      this.measurementPaceBtn.classList.add('mode-toggle__option--active');
      this.measurementSpeedBtn.classList.remove('mode-toggle__option--active');
    } else {
      this.measurementSpeedBtn.classList.add('mode-toggle__option--active');
      this.measurementPaceBtn.classList.remove('mode-toggle__option--active');
    }

    // Update Standard/Advanced toggle button visual state based on new mode's sub-mode
    const currentSubMode = this.getCurrentSubMode();
    if (currentSubMode === 'standard') {
      this.standardModeBtn.classList.add('mode-toggle__option--active');
      this.advancedModeBtn.classList.remove('mode-toggle__option--active');
    } else {
      this.advancedModeBtn.classList.add('mode-toggle__option--active');
      this.standardModeBtn.classList.remove('mode-toggle__option--active');
    }

    this.updateDynamicLabels();
    this.updateControlVisibility();
    this.saveState();
    this.clearResults();
  }

  /**
   * Convert pace to pace per km
   * @param {number} paceSeconds - Pace in seconds
   * @param {string} paceUnit - Pace unit ('km', 'mile', '400m', '200m', '100m')
   * @returns {number} Pace in seconds per km
   */
  convertPaceToPerKm(paceSeconds, paceUnit) {
    if (paceUnit === 'mile') {
      return paceSeconds / 1.609344;
    } else if (paceUnit === '400m') {
      return paceSeconds * 2.5;
    } else if (paceUnit === '200m') {
      return paceSeconds * 5;
    } else if (paceUnit === '100m') {
      return paceSeconds * 10;
    } else {
      return paceSeconds;
    }
  }

  /**
   * Convert pace from per km to target unit
   * @param {number} pacePerKm - Pace in seconds per km
   * @param {string} paceUnit - Target pace unit ('km', 'mile', '400m', '200m', '100m')
   * @returns {number} Pace in seconds per target unit
   */
  convertPaceFromPerKm(pacePerKm, paceUnit) {
    if (paceUnit === 'mile') {
      return pacePerKm * 1.609344;
    } else if (paceUnit === '400m') {
      return pacePerKm / 2.5;
    } else if (paceUnit === '200m') {
      return pacePerKm / 5;
    } else if (paceUnit === '100m') {
      return pacePerKm / 10;
    } else {
      return pacePerKm;
    }
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
      } else if (paceUnit === '400m' || paceUnit === '200m' || paceUnit === '100m') {
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
        paceUnit = this.paceIntervalUnitSelectPaceAdvanced.value;
      } else {
        distanceInput = this.distanceInputTimeAdvanced;
        distanceUnitSelect = this.distanceUnitSelectTimeAdvanced;
        display = this.distanceEquivalentTimeAdvanced;
        paceUnit = this.paceIntervalUnitSelectTimeAdvanced.value;
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
      let timeInput, paceUnitSelect, distanceMetres, distanceDisplayName;

      if (subMode === 'standard') {
        // Standard mode: use dropdown distance
        timeInput = this.timeInputPaceStandard;
        const distanceSelect = this.distanceSelectPaceStandard;
        paceUnitSelect = this.paceUnitSelectStandard;

        const timeInputValue = timeInput.value.trim();
        const distanceKey = distanceSelect.value;

        if (!timeInputValue || !distanceKey) {
          this.hideResults();
          return;
        }

        const totalTimeSeconds = parseTimeInput(timeInputValue);
        if (!this.validateTime(totalTimeSeconds)) {
          this.setInputError(timeInput);
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

        const timeInputValue = timeInput.value.trim();
        const distanceValue = distanceInput.value.trim();
        const distanceUnit = distanceUnitSelect.value;
        const paceIntervalValue = paceIntervalInput.value.trim();
        const paceIntervalUnit = paceIntervalUnitSelect.value;

        let error = false;

        // Validate distance
        if (!this.validateDistance(distanceValue)) {
          this.setInputError(distanceInput);
          this.hideResults();
          error = true;
        }

        // Validate pace interval
        if (!this.validateDistance(paceIntervalValue)) {
          this.setInputError(paceIntervalInput);
          this.hideResults();
          error = true;
        }

        // Validate time
        const totalTimeSeconds = parseTimeInput(timeInputValue);
        if (!this.validateTime(totalTimeSeconds)) {
          this.setInputError(timeInput);
          this.hideResults();
          error = true;
        }

        if (error) return;

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
      this.hideResults();
    }
  }

  /**
   * Handle time mode calculation (Distance + Pace → Total Time)
   */
  handleTimeModeCalculate(subMode) {
    try {
      let paceInput, paceUnitSelect, distanceMetres, distanceDisplayName;

      if (subMode === 'standard') {
        // Standard mode: use dropdown distance
        paceInput = this.paceInputTimeStandard;
        const distanceSelect = this.distanceSelectTimeStandard;
        paceUnitSelect = this.paceUnitSelectTimeStandard;

        const paceInputValue = paceInput.value.trim();
        const distanceKey = distanceSelect.value;

        let error = false;

        if (!distanceKey) {
          this.hideResults();
          error = true;
        }

        const paceSeconds = parsePaceInput(paceInputValue);
        if (!this.validatePace(paceSeconds)) {
          this.setInputError(paceInput);
          this.hideResults();
          error = true;
          console.log('Invalid pace input');
        }

        if (error) return;

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

        const paceInputValue = paceInput.value.trim();
        const distanceValue = distanceInput.value.trim();
        const distanceUnit = distanceUnitSelect.value;
        const paceIntervalValue = paceIntervalInput.value.trim();
        const paceIntervalUnit = paceIntervalUnitSelect.value;

        let error = false;

        // Validate distance
        if (!this.validateDistance(distanceValue)) {
          this.setInputError(distanceInput);
          this.hideResults();
          error = true;
        }

        // Validate pace interval
        if (!this.validateDistance(paceIntervalValue)) {
          this.setInputError(paceIntervalInput);
          this.hideResults();
          error = true;
        }

        // Validate pace
        const paceSeconds = parsePaceInput(paceInputValue);
        if (!this.validatePace(paceSeconds)) {
          this.setInputError(paceInput);
          this.hideResults();
          error = true;
        }

        if (error) return;

        // Convert custom distance and pace interval to metres
        distanceMetres = this.convertDistanceToMetres(parseFloat(distanceValue), distanceUnit);
        const paceIntervalMetres = this.convertDistanceToMetres(parseFloat(paceIntervalValue), paceIntervalUnit);
        distanceDisplayName = `${distanceValue}${distanceUnit}`;

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
      this.hideResults();
    }
  }

  /**
   * Handle speed mode calculation (Distance + Time → Speed)
   */
  handleSpeedModeCalculate(subMode) {
    try {
      let timeInput, speedUnitSelect, distanceMetres, distanceDisplayName;

      if (subMode === 'standard') {
        // Standard mode: use dropdown distance
        timeInput = this.timeInputSpeedStandard;
        const distanceSelect = this.distanceSelectSpeedStandard;
        speedUnitSelect = this.speedUnitSelectStandard;

        const timeInputValue = timeInput.value.trim();
        const distanceKey = distanceSelect.value;

        if (!timeInputValue || !distanceKey) {
          this.hideResults();
          return;
        }

        const totalTimeSeconds = parseTimeInput(timeInputValue);
        if (!this.validateTime(totalTimeSeconds)) {
          this.setInputError(timeInput);
          this.hideResults();
          return;
        }

        distanceMetres = getDistanceInMetres(distanceKey, this.eventsConfig);
        const eventConfig = this.getEventConfig(distanceKey);
        distanceDisplayName = eventConfig.displayName;
        const speedUnit = speedUnitSelect.value;

        const speed = calculateSpeed(distanceMetres, totalTimeSeconds, speedUnit);
        this.displaySpeedResults(speed, speedUnit, distanceMetres, eventConfig, totalTimeSeconds);

        this.saveToHistory({
          measurementMode: 'speed',
          mode: 'calculate',
          distance: distanceDisplayName,
          totalTime: formatTotalTime(totalTimeSeconds),
          speed: formatSpeedWithUnit(speed, speedUnit),
          timestamp: Date.now()
        });

      } else {
        // Advanced mode: use custom distance input
        timeInput = this.timeInputSpeedAdvanced;
        const distanceInput = this.distanceInputSpeedAdvanced;
        const distanceUnitSelect = this.distanceUnitSelectSpeedAdvanced;
        speedUnitSelect = this.speedUnitSelectAdvanced;

        const timeInputValue = timeInput.value.trim();
        const distanceValue = distanceInput.value.trim();
        const distanceUnit = distanceUnitSelect.value;
        const speedUnit = speedUnitSelect.value;

        let error = false;

        // Validate distance
        if (!this.validateDistance(distanceValue)) {
          this.setInputError(distanceInput);
          this.hideResults();
          error = true;
        }

        // Validate time
        const totalTimeSeconds = parseTimeInput(timeInputValue);
        if (!this.validateTime(totalTimeSeconds)) {
          this.setInputError(timeInput);
          this.hideResults();
          error = true;
        }

        if (error) return;

        // Convert custom distance to metres
        distanceMetres = this.convertDistanceToMetres(parseFloat(distanceValue), distanceUnit);
        distanceDisplayName = `${distanceValue}${distanceUnit}`;

        const speed = calculateSpeed(distanceMetres, totalTimeSeconds, speedUnit);

        // Create a synthetic event config for display
        const eventConfig = {
          displayName: distanceDisplayName,
          distance: parseFloat(distanceValue),
          unit: distanceUnit
        };

        this.displaySpeedResults(speed, speedUnit, distanceMetres, eventConfig, totalTimeSeconds);

        this.saveToHistory({
          measurementMode: 'speed',
          mode: 'calculate',
          distance: distanceDisplayName,
          totalTime: formatTotalTime(totalTimeSeconds),
          speed: formatSpeedWithUnit(speed, speedUnit),
          timestamp: Date.now()
        });
      }

    } catch (error) {
      console.error('Calculation error:', error);
      this.hideResults();
    }
  }

  /**
   * Handle speed time mode calculation (Distance + Speed → Total Time)
   */
  handleSpeedTimeModeCalculate(subMode) {
    try {
      let speedInput, speedUnitSelect, distanceMetres, distanceDisplayName;

      if (subMode === 'standard') {
        // Standard mode: use dropdown distance
        speedInput = this.speedInputTimeStandard;
        const distanceSelect = this.distanceSelectSpeedTimeStandard;
        speedUnitSelect = this.speedUnitSelectTimeStandard;

        const speedInputValue = speedInput.value.trim();
        const distanceKey = distanceSelect.value;

        if (!distanceKey) {
          this.hideResults();
          return;
        }

        const speed = parseSpeedInput(speedInputValue);
        if (speed === null || speed <= 0) {
          this.setInputError(speedInput);
          this.hideResults();
          return;
        }

        distanceMetres = getDistanceInMetres(distanceKey, this.eventsConfig);
        const eventConfig = this.getEventConfig(distanceKey);
        distanceDisplayName = eventConfig.displayName;
        const speedUnit = speedUnitSelect.value;

        const totalTimeSeconds = calculateTotalTimeFromSpeed(distanceMetres, speed, speedUnit);
        this.displaySpeedTimeResults(totalTimeSeconds, speed, speedUnit, distanceMetres, eventConfig);

        this.saveToHistory({
          measurementMode: 'speed',
          mode: 'totalTime',
          distance: distanceDisplayName,
          totalTime: formatTotalTime(totalTimeSeconds),
          speed: formatSpeedWithUnit(speed, speedUnit),
          timestamp: Date.now()
        });

      } else {
        // Advanced mode: use custom distance input
        speedInput = this.speedInputTimeAdvanced;
        const distanceInput = this.distanceInputSpeedTimeAdvanced;
        const distanceUnitSelect = this.distanceUnitSelectSpeedTimeAdvanced;
        speedUnitSelect = this.speedUnitSelectTimeAdvanced;

        const speedInputValue = speedInput.value.trim();
        const distanceValue = distanceInput.value.trim();
        const distanceUnit = distanceUnitSelect.value;
        const speedUnit = speedUnitSelect.value;

        let error = false;

        // Validate distance
        if (!this.validateDistance(distanceValue)) {
          this.setInputError(distanceInput);
          this.hideResults();
          error = true;
        }

        // Validate speed
        const speed = parseSpeedInput(speedInputValue);
        if (speed === null || speed <= 0) {
          this.setInputError(speedInput);
          this.hideResults();
          error = true;
        }

        if (error) return;

        // Convert custom distance to metres
        distanceMetres = this.convertDistanceToMetres(parseFloat(distanceValue), distanceUnit);
        distanceDisplayName = `${distanceValue}${distanceUnit}`;

        const totalTimeSeconds = calculateTotalTimeFromSpeed(distanceMetres, speed, speedUnit);

        // Create a synthetic event config for display
        const eventConfig = {
          displayName: distanceDisplayName,
          distance: parseFloat(distanceValue),
          unit: distanceUnit
        };

        this.displaySpeedTimeResults(totalTimeSeconds, speed, speedUnit, distanceMetres, eventConfig);

        this.saveToHistory({
          measurementMode: 'speed',
          mode: 'totalTime',
          distance: distanceDisplayName,
          totalTime: formatTotalTime(totalTimeSeconds),
          speed: formatSpeedWithUnit(speed, speedUnit),
          timestamp: Date.now()
        });
      }

    } catch (error) {
      console.error('Calculation error:', error);
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
      } else if (paceUnit === '200m') {
        pacePerKm = paceSeconds * 5; // 200m * 5 = 1000m = 1km
      } else if (paceUnit === '100m') {
        pacePerKm = paceSeconds * 10; // 100m * 10 = 1000m = 1km
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
      } else if (paceUnit === '200m') {
        splitIntervalMetres = 200;
        splitIntervalInfo = { value: 200, unit: 'm', metres: 200 };
      } else if (paceUnit === '100m') {
        splitIntervalMetres = 100;
        splitIntervalInfo = { value: 100, unit: 'm', metres: 100 };
      } else {
        splitIntervalMetres = 1000;
        splitIntervalInfo = { value: 1, unit: 'km', metres: 1000 };
      }
    }

    // Store calculation context for recalculation
    this.lastCalculation = {
      distanceMetres,
      pacePerKm,
      eventConfig,
      intervalMetres: splitIntervalMetres,
      intervalInfo: splitIntervalInfo
    };

    const splits = this.calculateSplitsWithFormat(distanceMetres, pacePerKm, eventConfig, splitIntervalMetres, splitIntervalInfo);
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
      } else if (paceUnit === '200m') {
        pacePerKm = paceSeconds * 5; // 200m * 5 = 1000m = 1km
      } else if (paceUnit === '100m') {
        pacePerKm = paceSeconds * 10; // 100m * 10 = 1000m = 1km
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
      } else if (paceUnit === '200m') {
        splitIntervalMetres = 200;
        splitIntervalInfo = { value: 200, unit: 'm', metres: 200 };
      } else if (paceUnit === '100m') {
        splitIntervalMetres = 100;
        splitIntervalInfo = { value: 100, unit: 'm', metres: 100 };
      } else {
        splitIntervalMetres = 1000;
        splitIntervalInfo = { value: 1, unit: 'km', metres: 1000 };
      }
    }

    // Store calculation context for recalculation
    this.lastCalculation = {
      distanceMetres,
      pacePerKm,
      eventConfig,
      intervalMetres: splitIntervalMetres,
      intervalInfo: splitIntervalInfo
    };

    const splits = this.calculateSplitsWithFormat(distanceMetres, pacePerKm, eventConfig, splitIntervalMetres, splitIntervalInfo);
    this.displaySplits(splits);

    this.showResults();
  }

  /**
   * Display speed calculation results
   */
  displaySpeedResults(speed, speedUnit, distanceMetres, eventConfig, totalTimeSeconds) {
    this.resultsContent.innerHTML = '';

    const speedDisplayText = formatSpeedWithUnit(speed, speedUnit);

    // Convert speed to pace per km for equivalents calculation
    const pacePerKm = convertSpeedToPace(speed, speedUnit);

    // Main result card
    const mainCard = document.createElement('div');
    mainCard.className = 'result-card';
    mainCard.innerHTML = `
      <h3 class="result-card__title">Your Speed</h3>
      <div class="result-card__points">${speedDisplayText}</div>
      <p class="result-card__content">To complete ${eventConfig.displayName} in ${formatTotalTime(totalTimeSeconds)}</p>
    `;
    this.resultsContent.appendChild(mainCard);

    // Equivalent paces & speeds (all 10 conversions)
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

    // Make the equivalent section collapsible
    makeCollapsible(equivalentsTitle, equivalentsGrid, 'paceCalculator.equivalentPaces.collapsed', true);

    // Splits - create interval based on speed unit
    const speedIntervalInfo = getSpeedUnitSplitInterval(speedUnit);

    // Store calculation context for recalculation
    this.lastCalculation = {
      distanceMetres,
      pacePerKm,
      eventConfig,
      intervalMetres: speedIntervalInfo.metres,
      intervalInfo: speedIntervalInfo
    };

    const splits = this.calculateSplitsWithFormat(distanceMetres, pacePerKm, eventConfig, speedIntervalInfo.metres, speedIntervalInfo);
    this.displaySplits(splits);

    this.showResults();
  }

  /**
   * Display speed time calculation results
   */
  displaySpeedTimeResults(totalTimeSeconds, speed, speedUnit, distanceMetres, eventConfig) {
    this.resultsContent.innerHTML = '';

    const speedDisplayText = formatSpeedWithUnit(speed, speedUnit);

    // Convert speed to pace per km for equivalents calculation
    const pacePerKm = convertSpeedToPace(speed, speedUnit);

    // Main result card
    const mainCard = document.createElement('div');
    mainCard.className = 'result-card';
    mainCard.innerHTML = `
      <h3 class="result-card__title">Projected Finish Time</h3>
      <div class="result-card__points">${formatTotalTime(totalTimeSeconds)}</div>
      <p class="result-card__content">For ${eventConfig.displayName} at ${speedDisplayText}</p>
    `;
    this.resultsContent.appendChild(mainCard);

    // Equivalent paces & speeds (all 10 conversions)
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

    // Make the equivalent section collapsible
    makeCollapsible(equivalentsTitle, equivalentsGrid, 'paceCalculator.equivalentPaces.collapsed', true);

    // Splits - create interval based on speed unit
    const speedIntervalInfo = getSpeedUnitSplitInterval(speedUnit);

    // Store calculation context for recalculation
    this.lastCalculation = {
      distanceMetres,
      pacePerKm,
      eventConfig,
      intervalMetres: speedIntervalInfo.metres,
      intervalInfo: speedIntervalInfo
    };

    const splits = this.calculateSplitsWithFormat(distanceMetres, pacePerKm, eventConfig, speedIntervalInfo.metres, speedIntervalInfo);
    this.displaySplits(splits);

    this.showResults();
  }

  /**
   * Calculate splits based on selected format
   * @param {number} distanceMetres - Total distance in metres
   * @param {number} pacePerKm - Pace in seconds per km
   * @param {Object} eventConfig - Event configuration
   * @param {number} defaultIntervalMetres - Default interval for smart mode
   * @param {Object} defaultIntervalInfo - Default interval display info
   * @returns {Array} Array of split objects
   */
  calculateSplitsWithFormat(distanceMetres, pacePerKm, eventConfig, defaultIntervalMetres, defaultIntervalInfo) {
    switch (this.currentSplitFormat) {
      case '1km':
        return this.calculateFixedSplits(distanceMetres, pacePerKm, 1000,
          { value: 1, unit: 'km', metres: 1000 }, false);

      case '5km':
        return this.calculateFixedSplits(distanceMetres, pacePerKm, 5000,
          { value: 5, unit: 'km', metres: 5000 }, false);

      case '400m-track':
        return this.calculateFixedSplits(distanceMetres, pacePerKm, 400,
          { value: 400, unit: 'm', metres: 400 }, true);

      case '200m-track':
        return this.calculateFixedSplits(distanceMetres, pacePerKm, 200,
          { value: 200, unit: 'm', metres: 200 }, true);

      case 'default':
      default:
        return this.calculateCustomSplits(distanceMetres, pacePerKm, eventConfig,
          defaultIntervalMetres, defaultIntervalInfo);
    }
  }

  /**
   * Calculate splits with fixed intervals
   * @param {number} distanceMetres - Total distance in metres
   * @param {number} pacePerKm - Pace in seconds per km
   * @param {number} intervalMetres - Fixed interval in metres
   * @param {Object} intervalInfo - Interval display info { value, unit, metres }
   * @param {boolean} remainderFirst - If true, put remainder at start (track mode)
   * @returns {Array} Array of split objects
   */
  calculateFixedSplits(distanceMetres, pacePerKm, intervalMetres, intervalInfo, remainderFirst) {
    const splits = [];

    // Calculate remainder
    const numFullIntervals = Math.floor(distanceMetres / intervalMetres);
    const remainderMetres = distanceMetres % intervalMetres;

    let currentDistanceMetres = 0;
    let previousTime = 0;

    // Track mode: Remainder first
    if (remainderFirst && remainderMetres > 0) {
      currentDistanceMetres = remainderMetres;
      const cumulativeTime = (currentDistanceMetres / 1000) * pacePerKm;
      const splitTime = cumulativeTime;

      splits.push({
        distanceLabel: `${remainderMetres.toFixed(0)}m`,
        splitDistanceLabel: `${remainderMetres.toFixed(0)}m`,
        splitTime: splitTime,
        time: cumulativeTime
      });

      previousTime = cumulativeTime;
    }

    // Add full intervals
    for (let i = 0; i < numFullIntervals; i++) {
      currentDistanceMetres += intervalMetres;
      const cumulativeTime = (currentDistanceMetres / 1000) * pacePerKm;
      const splitTime = cumulativeTime - previousTime;

      const distanceLabel = formatDistanceWithUnit(
        currentDistanceMetres / intervalMetres * intervalInfo.value,
        intervalInfo.unit
      );
      const splitDistanceLabel = formatDistanceWithUnit(intervalInfo.value, intervalInfo.unit);

      splits.push({
        distanceLabel,
        splitDistanceLabel,
        splitTime,
        time: cumulativeTime
      });

      previousTime = cumulativeTime;
    }

    // Non-track mode: Remainder last
    if (!remainderFirst && remainderMetres > 0) {
      currentDistanceMetres += remainderMetres;
      const cumulativeTime = (currentDistanceMetres / 1000) * pacePerKm;
      const splitTime = cumulativeTime - previousTime;

      splits.push({
        distanceLabel: `${currentDistanceMetres.toFixed(0)}m`,
        splitDistanceLabel: `${remainderMetres.toFixed(0)}m`,
        splitTime: splitTime,
        time: cumulativeTime
      });
    }

    return splits;
  }

  /**
   * Calculate split times at custom intervals
   */
  calculateCustomSplits(distanceMetres, pacePerKm, eventConfig, splitIntervalMetres, paceIntervalInfo) {
    const splits = [];
    let currentDistanceMetres = 0;
    let previousDistanceMetres = 0;
    let previousTime = 0;

    // Calculate split interval unit for display
    const splitUnit = paceIntervalInfo ? paceIntervalInfo.unit : 'km';

    while (currentDistanceMetres < distanceMetres) {
      currentDistanceMetres += splitIntervalMetres;

      // Don't exceed total distance
      if (currentDistanceMetres > distanceMetres) {
        currentDistanceMetres = distanceMetres;
      }

      // Calculate cumulative time for this split
      const cumulativeTime = (currentDistanceMetres / 1000) * pacePerKm;

      // Calculate split distance and split time (delta from previous)
      const splitDistanceMetres = currentDistanceMetres - previousDistanceMetres;
      const splitTime = cumulativeTime - previousTime;

      // Format cumulative distance label
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

      // Format split distance label
      let splitDistanceLabel;
      if (paceIntervalInfo) {
        // Custom interval - show in the interval units
        const splitDistanceInIntervalUnits = splitDistanceMetres / splitIntervalMetres * paceIntervalInfo.value;
        const formattedValue = parseFloat(splitDistanceInIntervalUnits.toFixed(2));
        splitDistanceLabel = formatDistanceWithUnit(formattedValue, splitUnit);
      } else {
        // Standard 1km intervals
        const splitDistanceInKm = parseFloat((splitDistanceMetres / 1000).toFixed(2));
        splitDistanceLabel = formatDistanceWithUnit(splitDistanceInKm, 'km');
      }

      splits.push({
        distanceLabel: distanceLabel,
        splitDistanceLabel: splitDistanceLabel,
        splitTime: splitTime,
        time: cumulativeTime
      });

      // Update previous values for next iteration
      previousDistanceMetres = currentDistanceMetres;
      previousTime = cumulativeTime;
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

    // Create toggle group for split format selection
    const toggleContainer = document.createElement('div');
    toggleContainer.className = 'split-format-toggle-container';
    toggleContainer.innerHTML = `
      <label class="split-format-toggle-label">Split Format:</label>
      <div class="mode-toggle split-format-toggle">
        <button type="button" class="mode-toggle__option" data-format="default">Default</button>
        <button type="button" class="mode-toggle__option" data-format="1km">1km</button>
        <button type="button" class="mode-toggle__option" data-format="5km">5km</button>
        <button type="button" class="mode-toggle__option" data-format="400m-track">400m Track</button>
        <button type="button" class="mode-toggle__option" data-format="200m-track">200m Track</button>
      </div>
    `;

    // Set active state based on current format
    toggleContainer.querySelectorAll('.mode-toggle__option').forEach(btn => {
      if (btn.dataset.format === this.currentSplitFormat) {
        btn.classList.add('mode-toggle__option--active');
      }
    });

    // Add event listener for toggle changes (event delegation)
    toggleContainer.addEventListener('click', (e) => {
      const button = e.target.closest('.mode-toggle__option');
      if (button) {
        this.handleSplitFormatChange(button.dataset.format);
      }
    });

    const splitsContent = document.createElement('div');
    splitsContent.className = 'history-table-container';

    let tableHTML = `
      <table class="history-table history-table--splits">
        <thead>
          <tr>
            <th>Distance</th>
            <th>Split Distance</th>
            <th>Split Time</th>
            <th>Cumulative Time</th>
          </tr>
        </thead>
        <tbody>
    `;

    splits.forEach(split => {
      tableHTML += `
        <tr class="history-row">
          <td>${split.distanceLabel}</td>
          <td>${split.splitDistanceLabel}</td>
          <td class="history-row__performance">${formatTotalTime(split.splitTime)}</td>
          <td class="history-row__performance">${formatTotalTime(split.time)}</td>
        </tr>
      `;
    });

    tableHTML += `
        </tbody>
      </table>
    `;

    splitsContent.innerHTML = tableHTML;

    // Wrap toggle and table together for collapsing
    const collapsibleWrapper = document.createElement('div');
    collapsibleWrapper.appendChild(toggleContainer);
    collapsibleWrapper.appendChild(splitsContent);

    splitsCard.appendChild(splitsTitle);
    splitsCard.appendChild(collapsibleWrapper);
    this.resultsContent.appendChild(splitsCard);

    // Make the split times section collapsible and start collapsed by default
    makeCollapsible(splitsTitle, collapsibleWrapper, 'paceCalculator.splitTimes.collapsed', false);
  }

  /**
   * Handle split format toggle change
   * @param {string} format - New format value
   */
  handleSplitFormatChange(format) {
    if (format === this.currentSplitFormat) return;

    this.currentSplitFormat = format;
    this.saveState();

    // Update toggle button states
    const buttons = document.querySelectorAll('.split-format-toggle .mode-toggle__option');
    buttons.forEach(btn => {
      if (btn.dataset.format === format) {
        btn.classList.add('mode-toggle__option--active');
      } else {
        btn.classList.remove('mode-toggle__option--active');
      }
    });

    // Recalculate and redisplay splits
    this.recalculateSplits();
  }

  /**
   * Recalculate and redisplay splits with current format
   */
  recalculateSplits() {
    if (!this.lastCalculation) return;

    const { distanceMetres, pacePerKm, eventConfig, intervalMetres, intervalInfo } = this.lastCalculation;

    const splits = this.calculateSplitsWithFormat(
      distanceMetres, pacePerKm, eventConfig, intervalMetres, intervalInfo
    );

    // Remove existing splits card
    const existingSplitsCard = this.resultsContent.querySelector('.result-card:has(.split-format-toggle)');
    if (existingSplitsCard) {
      existingSplitsCard.remove();
    }

    this.displaySplits(splits);
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
      let history = data ? JSON.parse(data) : [];

      // Migrate old entries without measurementMode
      history = history.map(entry => {
        if (!entry.measurementMode) {
          entry.measurementMode = 'pace'; // Default old entries to pace mode
        }
        return entry;
      });

      return history;
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

      // Show speed if speed mode entry, else show pace
      const paceOrSpeed = (entry.measurementMode === 'speed' && entry.speed)
        ? entry.speed
        : entry.pace;

      row.innerHTML = `
        <td>${entry.distance}</td>
        <td class="history-row__performance">${entry.totalTime}</td>
        <td class="history-row__performance">${paceOrSpeed}</td>
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
