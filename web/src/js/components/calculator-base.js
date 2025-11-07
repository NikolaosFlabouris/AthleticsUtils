/**
 * Base Calculator Component
 * Shared functionality for all calculator pages
 */

import { scoringDataLoader } from '../data/scoring-data-loader.js';
import { eventConfigLoader } from '../data/event-config-loader.js';

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
    this.genderSelect = document.querySelector(this.selectors.genderSelect);
    this.eventInput = document.querySelector(this.selectors.eventInput);
    this.eventDropdown = document.querySelector(this.selectors.eventDropdown);
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
    this.genderSelect?.addEventListener('change', (e) => this.handleGenderChange(e));
    this.eventInput?.addEventListener('input', (e) => this.handleEventInputChange(e));
    this.eventInput?.addEventListener('focus', () => this.handleEventInputFocus());
    this.eventInput?.addEventListener('blur', (e) => this.handleEventInputBlur(e));
    this.eventInput?.addEventListener('keydown', (e) => this.handleEventInputKeydown(e));
    this.performanceInput?.addEventListener('input', (e) => this.handlePerformanceInput(e));
    this.performanceInput?.addEventListener('keypress', (e) => this.handleKeyPress(e));
    this.calculateBtn?.addEventListener('click', () => this.handleCalculate());

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (e.target !== this.eventInput && !this.eventDropdown?.contains(e.target)) {
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
      this.populateGenderDropdown();
      this.showLoading(false);
    } catch (error) {
      console.error('Error loading scoring data:', error);
      this.showError('Failed to load scoring tables. Please refresh the page.');
      this.showLoading(false);
    }
  }

  populateGenderDropdown() {
    const genders = scoringDataLoader.getGenders();
    this.genderSelect.innerHTML = '<option value="">Select gender...</option>';

    for (const gender of genders) {
      const option = document.createElement('option');
      option.value = gender;
      option.textContent = this.capitalizeFirst(gender);
      this.genderSelect.appendChild(option);
    }
  }

  handleGenderChange(e) {
    this.currentGender = e.target.value;

    if (!this.currentGender) {
      this.eventInput.disabled = true;
      this.eventInput.value = '';
      this.performanceInput.disabled = true;
      this.calculateBtn.disabled = true;
      this.hideResults();
      this.hideEventDropdown();
      return;
    }

    this.filterAvailableEvents(this.currentGender);
    this.eventInput.disabled = false;
    this.eventInput.value = '';
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

  handleEventInputChange(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    this.renderEventDropdown(searchTerm);

    // Clear current selection if user is typing
    if (this.currentEvent && this.eventInput.value !== this.currentEvent) {
      this.currentEvent = '';
      this.currentEventKey = '';
      this.performanceInput.disabled = true;
      this.calculateBtn.disabled = true;
    }
  }

  handleEventInputFocus() {
    if (this.currentGender && this.availableEvents.length > 0) {
      const searchTerm = this.eventInput.value.toLowerCase().trim();
      this.renderEventDropdown(searchTerm);
    }
  }

  handleEventInputBlur(e) {
    // Use setTimeout to allow click events on dropdown items to fire first
    setTimeout(() => {
      this.hideEventDropdown();
    }, 200);
  }

  handleEventInputKeydown(e) {
    // Handle Enter key to select first filtered event
    if (e.key === 'Enter') {
      e.preventDefault();
      const firstItem = this.eventDropdown.querySelector('.event-dropdown__item');
      if (firstItem) {
        firstItem.click();
      }
    } else if (e.key === 'Escape') {
      this.hideEventDropdown();
      this.eventInput.blur();
    }
  }

  selectEvent(eventKey, displayName) {
    this.currentEvent = eventKey;
    this.currentEventKey = eventKey;
    this.eventInput.value = displayName;
    this.hideEventDropdown();

    this.performanceInput.disabled = false;
    this.performanceInput.value = '';
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
      this.eventDropdown.innerHTML = '<div class="event-dropdown__empty">No events found</div>';
      this.showEventDropdown();
      return;
    }

    // Group events by category
    const eventsByCategory = {};
    for (const event of filteredEvents) {
      const category = event.category || 'other';
      if (!eventsByCategory[category]) {
        eventsByCategory[category] = [];
      }
      eventsByCategory[category].push(event);
    }

    // Sort events within each category by distance (shortest to longest)
    for (const category in eventsByCategory) {
      eventsByCategory[category] = eventConfigLoader.sortEventsByDistance(eventsByCategory[category]);
    }

    // Define category order
    const categoryOrder = ['sprints', 'middle_distance', 'long_distance', 'race_walk', 'jumps', 'throws', 'relays', 'combined'];
    const sortedCategories = Object.keys(eventsByCategory).sort((a, b) => {
      const indexA = categoryOrder.indexOf(a);
      const indexB = categoryOrder.indexOf(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    // Render dropdown
    this.eventDropdown.innerHTML = '';

    for (const category of sortedCategories) {
      const events = eventsByCategory[category];

      // Add category header
      const categoryHeader = document.createElement('div');
      categoryHeader.className = 'event-dropdown__category';
      categoryHeader.textContent = this.formatCategoryName(category);
      this.eventDropdown.appendChild(categoryHeader);

      // Add events in this category
      for (const event of events) {
        const item = document.createElement('div');
        item.className = 'event-dropdown__item';
        item.textContent = event.displayName;
        item.dataset.eventKey = event.key;

        item.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.selectEvent(event.key, event.displayName);
        });

        this.eventDropdown.appendChild(item);
      }
    }

    this.showEventDropdown();
  }

  showEventDropdown() {
    this.eventDropdown?.classList.remove('hidden');
  }

  hideEventDropdown() {
    this.eventDropdown?.classList.add('hidden');
  }

  handlePerformanceInput(e) {
    const value = e.target.value.trim();
    this.calculateBtn.disabled = !value;
    this.hideError();
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
