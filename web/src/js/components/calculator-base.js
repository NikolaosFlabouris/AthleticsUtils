/**
 * Base Calculator Component
 * Shared functionality for all calculator pages
 */

import { scoringDataLoader } from '../data/scoring-data-loader.js';
import { eventConfigLoader } from '../data/event-config-loader.js';
import { getPerformancePlaceholder } from '../utils/performance-parser.js';

export class BaseCalculator {
  constructor(selectors) {
    this.selectors = selectors;
    this.currentGender = '';
    this.currentEvent = '';
    this.currentEventKey = '';
    this.allEvents = [];
    this.availableEvents = [];
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
    await this.loadScoringData();
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
      await Promise.all([
        scoringDataLoader.load(),
        eventConfigLoader.load()
      ]);
      this.allEvents = eventConfigLoader.getAllEvents();
      this.initializeGenderToggle();
      this.showLoading(false);
    } catch (error) {
      console.error('Error loading scoring data:', error);
      this.showError('Failed to load scoring tables. Please refresh the page.');
      this.showLoading(false);
    }
  }

  initializeGenderToggle() {
    // Load saved gender from session storage, default to 'men'
    const savedGender = sessionStorage.getItem('selectedGender') || 'men';

    // Set the initial gender and trigger UI update
    this.handleGenderToggle(savedGender);
  }

  handleGenderToggle(gender) {
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
    if (gender === 'men') {
      this.genderToggleMen?.classList.add('gender-toggle__option--active');
    } else if (gender === 'women') {
      this.genderToggleWomen?.classList.add('gender-toggle__option--active');
    } else if (gender === 'mixed') {
      this.genderToggleMixed?.classList.add('gender-toggle__option--active');
    }

    // Update available events and reset event selection
    this.filterAvailableEvents(this.currentGender);
    this.eventTrigger.disabled = false;
    this.eventTriggerText.textContent = 'Select event...';
    this.performanceInput.disabled = true;
    this.calculateBtn.disabled = true;
    this.hideResults();
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
    // Handle Enter key to select first filtered event
    if (e.key === 'Enter') {
      e.preventDefault();
      const firstItem = this.eventList.querySelector('.event-dropdown__item');
      if (firstItem) {
        firstItem.click();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.hideEventDropdown();
      this.eventTrigger.focus();
    }
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
    // Filter events based on search term
    let filteredEvents = this.availableEvents;

    if (searchTerm) {
      filteredEvents = this.availableEvents.filter(event =>
        event.displayName.toLowerCase().includes(searchTerm) ||
        event.key.toLowerCase().includes(searchTerm)
      );
    }

    if (filteredEvents.length === 0) {
      this.eventList.innerHTML = '<div class="event-dropdown__empty">No events found</div>';
      return;
    }

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

      // Add category header
      const categoryHeader = document.createElement('div');
      categoryHeader.className = 'event-dropdown__category';
      categoryHeader.textContent = this.formatCategoryName(category);
      this.eventList.appendChild(categoryHeader);

      // Add events in this category
      for (const event of events) {
        const item = document.createElement('div');
        item.className = 'event-dropdown__item';

        // Mark as selected if this is the current event
        if (event.key === this.currentEvent) {
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

      // Add "Other" category header
      const otherHeader = document.createElement('div');
      otherHeader.className = 'event-dropdown__category';
      otherHeader.textContent = 'Other';
      this.eventList.appendChild(otherHeader);

      // Add all other events
      for (const category of otherSortedCategories) {
        const events = otherByCategory[category];
        for (const event of events) {
          const item = document.createElement('div');
          item.className = 'event-dropdown__item';

          // Mark as selected if this is the current event
          if (event.key === this.currentEvent) {
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
    // Auto-focus search field
    setTimeout(() => this.eventSearch.focus(), 0);
  }

  hideEventDropdown() {
    this.eventDropdown?.classList.add('hidden');
    // Clear search field
    this.eventSearch.value = '';
  }

  handlePerformanceInput(e) {
    const value = e.target.value.trim();
    this.calculateBtn.disabled = !value;
    this.hideError();
    // Clear error state when user starts typing
    this.performanceInput?.classList.remove('input-error');
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

  showError(message) {
    if (this.errorMessage) {
      this.errorMessage.textContent = message;
      this.errorMessage.classList.remove('hidden');
    }
  }

  hideError() {
    this.errorMessage?.classList.add('hidden');
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
