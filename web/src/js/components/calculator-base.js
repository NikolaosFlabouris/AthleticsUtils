/**
 * Base Calculator Component
 * Shared functionality for all calculator pages
 */

import { scoringDataLoader } from '../data/scoring-data-loader.js';
import { eventConfigLoader } from '../data/event-config-loader.js';
import { getPerformancePlaceholder } from '../utils/performance-parser.js';
import { createIcon } from './icon.js';
import { showFieldError, clearFieldError } from '../utils/field-error.js';

export class BaseCalculator {
  constructor(selectors) {
    this.selectors = selectors;
    this.currentGender = '';
    this.currentEvent = '';
    this.currentEventKey = '';
    this.allEvents = [];
    this.availableEvents = [];
    // Accessibility: track keyboard-highlighted option in the event dropdown
    this.highlightedOptionIndex = -1;
    this.optionIdPrefix = 'event-option-';
    this.setupDOMElements();
  }

  setupDOMElements() {
    this.genderToggleMen = document.querySelector('#gender-toggle-men');
    this.genderToggleWomen = document.querySelector('#gender-toggle-women');
    this.genderToggleMixed = document.querySelector('#gender-toggle-mixed');
    this.eventTrigger = document.querySelector('#event-trigger');
    this.eventTriggerText = document.querySelector('#event-trigger-text');
    this.eventSearch = document.querySelector('#event-search');
    this.eventDropdown = document.querySelector(this.selectors.eventDropdown);
    this.eventList = document.querySelector('#event-list');
    this.performanceInput = document.querySelector(this.selectors.performanceInput);
    this.calculateBtn = document.querySelector(this.selectors.calculateBtn);
    this.resultsContainer = document.querySelector(this.selectors.resultsContainer);
    this.resultsContent = document.querySelector(this.selectors.resultsContent);
    this.loadingIndicator = document.querySelector(this.selectors.loadingIndicator);
    this.errorMessage = document.querySelector(this.selectors.errorMessage);
  }

  async initialize() {
    this.setupEventListeners();
    this.setupDropdownIcons();
    await this.loadScoringData();
  }

  setupDropdownIcons() {
    // Add chevron icon to event trigger button
    if (this.eventTrigger && !this.eventTrigger.querySelector('.icon')) {
      const chevron = createIcon('chevron-down', 'icon--sm');
      this.eventTrigger.appendChild(chevron);
    }

    // Add search icon to event search input
    if (this.eventSearch) {
      const searchContainer = this.eventSearch.parentElement;
      if (searchContainer && !searchContainer.querySelector('.icon')) {
        const searchIcon = createIcon('search', 'icon--sm');
        searchIcon.style.position = 'absolute';
        searchIcon.style.left = 'var(--spacing-sm)';
        searchIcon.style.top = '50%';
        searchIcon.style.transform = 'translateY(-50%)';
        searchIcon.style.pointerEvents = 'none';
        searchIcon.style.color = 'var(--color-text-secondary)';

        // Add padding to search input to make room for icon
        this.eventSearch.style.paddingLeft = 'calc(var(--spacing-sm) * 2 + 1rem)';

        searchContainer.style.position = 'relative';
        searchContainer.appendChild(searchIcon);
      }
    }
  }

  setupEventListeners() {
    this.genderToggleMen?.addEventListener('click', () => this.handleGenderToggle('men'));
    this.genderToggleWomen?.addEventListener('click', () => this.handleGenderToggle('women'));
    this.genderToggleMixed?.addEventListener('click', () => this.handleGenderToggle('mixed'));
    this.eventTrigger?.addEventListener('click', () => this.handleEventTriggerClick());
    this.eventSearch?.addEventListener('input', (e) => this.handleEventSearchInput(e));
    this.eventSearch?.addEventListener('keydown', (e) => this.handleEventSearchKeydown(e));
    this.performanceInput?.addEventListener('input', (e) => this.handlePerformanceInput(e));
    this.performanceInput?.addEventListener('keypress', (e) => this.handleKeyPress(e));
    this.calculateBtn?.addEventListener('click', () => this.handleCalculate());

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.eventTrigger?.contains(e.target) && !this.eventDropdown?.contains(e.target)) {
        this.hideEventDropdown();
      }
    });
  }

  async loadScoringData() {
    try {
      this.showLoading(true);
      this.hideError();

      // Event config is small (~20 KB) so always load it up front.
      // Scoring tables are split by gender and loaded lazily — fetch the
      // saved/default gender now so the initial UI is ready without a spinner.
      const savedGender = sessionStorage.getItem('selectedGender') || 'men';
      await Promise.all([
        eventConfigLoader.load(),
        scoringDataLoader.loadGender(savedGender)
      ]);

      this.allEvents = eventConfigLoader.getAllEvents();
      await this.initializeGenderToggle();
      this.showLoading(false);
    } catch (error) {
      console.error('Error loading scoring data:', error);
      this.showError('Failed to load scoring tables. Please refresh the page.');
      this.showLoading(false);
    }
  }

  async initializeGenderToggle() {
    // Load saved gender from session storage, default to 'men'
    const savedGender = sessionStorage.getItem('selectedGender') || 'men';

    // Set the initial gender and trigger UI update
    await this.handleGenderToggle(savedGender);
  }

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
    this.genderToggleMixed?.classList.remove('gender-toggle__option--active');

    // Add active class to the selected gender button
    // (aria-pressed is mirrored automatically — see utils/aria-toggle-sync.js)
    if (gender === 'men') {
      this.genderToggleMen?.classList.add('gender-toggle__option--active');
    } else if (gender === 'women') {
      this.genderToggleWomen?.classList.add('gender-toggle__option--active');
    } else if (gender === 'mixed') {
      this.genderToggleMixed?.classList.add('gender-toggle__option--active');
    }

    // Reset event selection UI while we (potentially) fetch this gender's data.
    this.eventTrigger.disabled = true;
    this.eventTriggerText.textContent = 'Loading…';
    this.performanceInput.disabled = true;
    this.calculateBtn.disabled = true;
    this.hideResults();

    // Lazy-load the scoring data for this gender if not already cached.
    if (!scoringDataLoader.isGenderLoaded(gender)) {
      this.showLoading(true);
      try {
        await scoringDataLoader.loadGender(gender);
      } catch (error) {
        console.error('Error loading scoring data for gender:', error);
        this.showError('Failed to load scoring tables. Please try again.');
        this.showLoading(false);
        return;
      }
      this.showLoading(false);
    }

    // If the user toggled to another gender while this one was loading,
    // don't clobber the newer selection.
    if (this.currentGender !== gender) {
      return;
    }

    // Update available events and unlock the event picker.
    this.filterAvailableEvents(this.currentGender);
    this.eventTrigger.disabled = false;
    this.eventTriggerText.textContent = 'Select event...';
  }

  filterAvailableEvents(gender) {
    // Get events available in scoring tables for this gender
    const scoringEvents = scoringDataLoader.getAllEvents(gender);
    const scoringEventNames = new Set(scoringEvents.map(e => e.event));

    // Filter event config to only include events that exist in scoring tables
    this.availableEvents = this.allEvents.filter(event =>
      scoringEventNames.has(event.key)
    );
  }

  handleEventTriggerClick() {
    if (this.eventTrigger.disabled) {
      return;
    }

    if (this.eventDropdown.classList.contains('hidden')) {
      this.showEventDropdown();
    } else {
      this.hideEventDropdown();
    }
  }

  handleEventSearchInput(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    this.renderEventDropdown(searchTerm);
  }

  handleEventSearchKeydown(e) {
    const options = this.eventList?.querySelectorAll('.event-dropdown__item') || [];

    if (e.key === 'Enter') {
      e.preventDefault();
      // Activate the highlighted option, or fall back to the first one
      const idx = this.highlightedOptionIndex >= 0 ? this.highlightedOptionIndex : 0;
      const target = options[idx];
      if (target) target.click();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.hideEventDropdown();
      this.eventTrigger.focus();
    } else if (e.key === 'Tab') {
      // Focus trap: don't let Tab leak to elements behind the overlay.
      // Close the dropdown and return focus to the trigger, then let the
      // browser continue its normal tab traversal from there.
      e.preventDefault();
      this.hideEventDropdown();
      this.eventTrigger.focus();
      // Reissue a synthetic tab-move after the trigger regains focus so the
      // user still progresses/regresses one field as they expected.
      const moveBackward = e.shiftKey;
      requestAnimationFrame(() => this.moveFocusFrom(this.eventTrigger, moveBackward));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (options.length === 0) return;
      const next = this.highlightedOptionIndex < 0
        ? 0
        : Math.min(this.highlightedOptionIndex + 1, options.length - 1);
      this.setHighlightedOption(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (options.length === 0) return;
      const next = Math.max(0, this.highlightedOptionIndex - 1);
      this.setHighlightedOption(next);
    } else if (e.key === 'Home') {
      if (options.length === 0) return;
      e.preventDefault();
      this.setHighlightedOption(0);
    } else if (e.key === 'End') {
      if (options.length === 0) return;
      e.preventDefault();
      this.setHighlightedOption(options.length - 1);
    }
  }

  setHighlightedOption(index) {
    const options = this.eventList?.querySelectorAll('.event-dropdown__item') || [];
    if (index < 0 || index >= options.length) return;

    // Remove highlight from previously highlighted option
    options.forEach(opt => opt.classList.remove('event-dropdown__item--highlighted'));

    const option = options[index];
    option.classList.add('event-dropdown__item--highlighted');
    option.scrollIntoView({ block: 'nearest' });
    this.highlightedOptionIndex = index;

    // Update aria-activedescendant on the search input so screen readers
    // announce the virtually-focused option.
    if (this.eventSearch && option.id) {
      this.eventSearch.setAttribute('aria-activedescendant', option.id);
    }
  }

  clearHighlightedOption() {
    this.highlightedOptionIndex = -1;
    this.eventSearch?.removeAttribute('aria-activedescendant');
  }

  /**
   * Move keyboard focus one step forward or backward from a reference element,
   * matching the browser's default Tab / Shift+Tab behaviour. Used after
   * closing the event dropdown on Tab so the user still advances by one
   * logical step instead of getting stuck on the trigger.
   */
  moveFocusFrom(fromElement, backward = false) {
    if (!fromElement) return;

    // Build a snapshot of the document's tabbable elements in tab order.
    const candidates = Array.from(
      document.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]),' +
        ' select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => {
      if (el.hasAttribute('disabled')) return false;
      if (el.getAttribute('aria-hidden') === 'true') return false;
      // Skip elements inside hidden containers. offsetParent is null when
      // display:none is applied anywhere up the ancestor chain.
      if (el.offsetParent === null && el !== document.activeElement) return false;
      return true;
    });

    const idx = candidates.indexOf(fromElement);
    if (idx === -1) return;

    const nextIdx = backward ? idx - 1 : idx + 1;
    if (nextIdx < 0 || nextIdx >= candidates.length) return;
    candidates[nextIdx].focus();
  }

  selectEvent(eventKey, displayName) {
    this.currentEvent = eventKey;
    this.currentEventKey = eventKey;
    this.eventTriggerText.textContent = displayName;
    this.hideEventDropdown();

    this.performanceInput.disabled = false;
    this.performanceInput.value = '';

    // Update placeholder based on event type
    const placeholder = getPerformancePlaceholder(eventKey);
    this.performanceInput.placeholder = placeholder;

    // Update help text based on event measurement format
    const eventInfo = eventConfigLoader.getEventInfo(eventKey);
    const helpText = this.performanceInput.nextElementSibling;
    if (helpText && helpText.classList.contains('form-help')) {
      const measurementFormat = eventInfo?.measurementFormat || 'time';
      if (measurementFormat === 'distance') {
        helpText.textContent = 'Enter distance in meters';
      } else if (measurementFormat === 'points') {
        helpText.textContent = 'Enter total points';
      } else {
        helpText.textContent = 'Enter time in seconds or (hh:)mm:ss(.SS) format';
      }
    }

    this.performanceInput.focus();
    this.calculateBtn.disabled = true;
    this.hideResults();
  }

  renderEventDropdown(searchTerm = '') {
    // Reset keyboard highlight whenever we re-render.
    this.clearHighlightedOption();

    // Filter events based on search term
    let filteredEvents = this.availableEvents;

    if (searchTerm) {
      filteredEvents = this.availableEvents.filter(event =>
        event.displayName.toLowerCase().includes(searchTerm) ||
        event.key.toLowerCase().includes(searchTerm)
      );
    }

    if (filteredEvents.length === 0) {
      this.eventList.innerHTML = '<div class="event-dropdown__empty" role="presentation">No events found</div>';
      return;
    }

    // Counter for unique option ids (used by aria-activedescendant).
    let optionCounter = 0;

    // Separate primary and non-primary events
    const primaryEvents = [];
    const otherEvents = [];

    for (const event of filteredEvents) {
      if (eventConfigLoader.isPrimaryEvent(event.key)) {
        primaryEvents.push(event);
      } else {
        otherEvents.push(event);
      }
    }

    // Group primary events by category
    const primaryByCategory = {};
    for (const event of primaryEvents) {
      const category = event.category || 'other';
      if (!primaryByCategory[category]) {
        primaryByCategory[category] = [];
      }
      primaryByCategory[category].push(event);
    }

    // Sort events within each category by distance (shortest to longest)
    for (const category in primaryByCategory) {
      primaryByCategory[category] = eventConfigLoader.sortEventsByDistance(primaryByCategory[category]);
    }

    // Define category order
    const categoryOrder = ['sprints', 'middle_distance', 'long_distance', 'race_walk', 'jumps', 'throws', 'relays', 'combined'];
    const sortedCategories = Object.keys(primaryByCategory).sort((a, b) => {
      const indexA = categoryOrder.indexOf(a);
      const indexB = categoryOrder.indexOf(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    // Render dropdown
    this.eventList.innerHTML = '';

    // Render primary events by category
    for (const category of sortedCategories) {
      const events = primaryByCategory[category];

      // Add category header — role="presentation" so screen readers don't
      // count it as a listbox option.
      const categoryHeader = document.createElement('div');
      categoryHeader.className = 'event-dropdown__category';
      categoryHeader.setAttribute('role', 'presentation');
      categoryHeader.textContent = this.formatCategoryName(category);
      this.eventList.appendChild(categoryHeader);

      // Add events in this category
      for (const event of events) {
        const item = document.createElement('div');
        item.className = 'event-dropdown__item';
        item.setAttribute('role', 'option');
        item.id = `${this.optionIdPrefix}${optionCounter++}`;

        const isSelected = event.key === this.currentEvent;
        item.setAttribute('aria-selected', isSelected ? 'true' : 'false');
        if (isSelected) {
          item.classList.add('event-dropdown__item--selected');
        }

        item.textContent = event.displayName;
        item.dataset.eventKey = event.key;

        item.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.selectEvent(event.key, event.displayName);
        });

        this.eventList.appendChild(item);
      }
    }

    // Render "Other" category for non-primary events
    if (otherEvents.length > 0) {
      // Sort other events by category, then by distance
      const otherByCategory = {};
      for (const event of otherEvents) {
        const category = event.category || 'other';
        if (!otherByCategory[category]) {
          otherByCategory[category] = [];
        }
        otherByCategory[category].push(event);
      }

      for (const category in otherByCategory) {
        otherByCategory[category] = eventConfigLoader.sortEventsByDistance(otherByCategory[category]);
      }

      // Sort categories
      const otherSortedCategories = Object.keys(otherByCategory).sort((a, b) => {
        const indexA = categoryOrder.indexOf(a);
        const indexB = categoryOrder.indexOf(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

      // Add "Other" category header (presentation so SR skips it)
      const otherHeader = document.createElement('div');
      otherHeader.className = 'event-dropdown__category';
      otherHeader.setAttribute('role', 'presentation');
      otherHeader.textContent = 'Other';
      this.eventList.appendChild(otherHeader);

      // Add all other events
      for (const category of otherSortedCategories) {
        const events = otherByCategory[category];
        for (const event of events) {
          const item = document.createElement('div');
          item.className = 'event-dropdown__item';
          item.setAttribute('role', 'option');
          item.id = `${this.optionIdPrefix}${optionCounter++}`;

          const isSelected = event.key === this.currentEvent;
          item.setAttribute('aria-selected', isSelected ? 'true' : 'false');
          if (isSelected) {
            item.classList.add('event-dropdown__item--selected');
          }

          item.textContent = event.displayName;
          item.dataset.eventKey = event.key;

          item.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.selectEvent(event.key, event.displayName);
          });

          this.eventList.appendChild(item);
        }
      }
    }
  }

  showEventDropdown() {
    // Clear search and render full list
    this.eventSearch.value = '';
    this.renderEventDropdown('');
    this.eventDropdown?.classList.remove('hidden');
    this.eventTrigger?.setAttribute('aria-expanded', 'true');
    // Auto-focus search field
    setTimeout(() => this.eventSearch.focus(), 0);
  }

  hideEventDropdown() {
    this.eventDropdown?.classList.add('hidden');
    this.eventTrigger?.setAttribute('aria-expanded', 'false');
    // Clear search field and keyboard highlight state
    this.eventSearch.value = '';
    this.clearHighlightedOption();
  }

  handlePerformanceInput(e) {
    const value = e.target.value.trim();
    this.calculateBtn.disabled = !value;
    // Clear error state when user starts typing (empties + re-hides the
    // inline error span, drops the border and resets aria-invalid).
    this.hideError();
    clearFieldError(this.performanceInput);
  }

  handleKeyPress(e) {
    if (e.key === 'Enter' && !this.calculateBtn.disabled) {
      this.handleCalculate();
    }
  }

  handleCalculate() {
    // Override in subclass
    throw new Error('handleCalculate() must be implemented by subclass');
  }

  showLoading(show) {
    if (show) {
      this.loadingIndicator?.classList.remove('hidden');
    } else {
      this.loadingIndicator?.classList.add('hidden');
    }
  }

  /**
   * Surface an error. When `inputs` are passed it's a field-level validation
   * failure: the message is rendered inline next to each offending field (in
   * a `role="alert"` span) and the field is flagged invalid — this both
   * identifies the error in text and announces it, satisfying WCAG SC 3.3.1.
   * With no inputs it's a general/system error (e.g. a failed data load) and
   * the central error panel is used instead. The tracked field set is cleared
   * again in hideError.
   *
   * @param {string} message
   * @param {HTMLElement|HTMLElement[]} [inputs]
   */
  showError(message, inputs = []) {
    const list = (Array.isArray(inputs) ? inputs : [inputs]).filter(Boolean);
    this._clearErroredInputs();

    if (list.length) {
      // Field error → inline spans only; keep the central panel quiet so the
      // message isn't announced twice.
      if (this.errorMessage) {
        this.errorMessage.textContent = '';
        this.errorMessage.classList.add('hidden');
      }
      list.forEach(input => showFieldError(input, message));
      this._erroredInputs = list;
      return;
    }

    if (!this.errorMessage) return;
    this.errorMessage.textContent = message;
    this.errorMessage.classList.remove('hidden');
  }

  hideError() {
    this.errorMessage?.classList.add('hidden');
    this._clearErroredInputs();
  }

  _clearErroredInputs() {
    if (!this._erroredInputs?.length) return;
    this._erroredInputs.forEach(input => clearFieldError(input));
    this._erroredInputs = [];
  }

  hideResults() {
    this.resultsContainer?.classList.add('hidden');
  }

  showResults() {
    this.resultsContainer?.classList.remove('hidden');
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  formatCategoryName(category) {
    return category
      .replace(/[-_]/g, ' ')
      .split(' ')
      .map(word => this.capitalizeFirst(word))
      .join(' ');
  }
}
