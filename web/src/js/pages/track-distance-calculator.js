/**
 * Track Distance Calculator Page Controller
 * Main entry point for the track distance calculator page
 */

import { Navigation } from '../components/navigation.js';
import { TrackSvgRenderer } from '../components/track-svg-renderer.js';
import { TrackMarkingSelector, SELECTION_STATE } from '../components/track-marking-selector.js';
import {
  findDistanceMatches,
  paginateResults,
  formatDistance,
  formatDifference
} from '../calculators/track-distance-finder.js';
import { getMarkingById } from '../data/track-markings-data.js';

/**
 * Track Distance Calculator class
 */
class TrackDistanceCalculator {
  constructor() {
    // Track renderer and selector
    this.renderer = null;
    this.selector = null;

    // State
    this.waterJumpConfig = 'inside';
    this.searchResults = [];
    this.currentPage = 1;
    this.pageSize = 20;
    this.selectedResultIndex = -1;

    // DOM elements (initialized in initializeElements)
    this.elements = {};
  }

  /**
   * Initialize the calculator
   */
  async initialize() {
    this.initializeElements();
    this.initializeTrackRenderer();
    this.initializeSelector();
    this.setupEventListeners();

    // Initialize navigation
    Navigation.initialize();
  }

  /**
   * Initialize DOM element references
   */
  initializeElements() {
    this.elements = {
      // Inputs
      distanceInput: document.getElementById('distance-input'),
      toleranceInput: document.getElementById('tolerance-input'),
      waterJumpInside: document.getElementById('water-jump-inside'),
      waterJumpOutside: document.getElementById('water-jump-outside'),
      findBtn: document.getElementById('find-btn'),

      // Track container
      trackContainer: document.getElementById('track-container'),

      // Selection panel
      selectionPanel: document.getElementById('selection-panel'),
      selectionStartValue: document.getElementById('selection-start-value'),
      selectionEndValue: document.getElementById('selection-end-value'),
      selectionDistanceValue: document.getElementById('selection-distance-value'),
      clearSelectionBtn: document.getElementById('clear-selection-btn'),

      // Results
      resultsContainer: document.getElementById('results-container'),
      matchCount: document.getElementById('match-count'),
      matchSummary: document.getElementById('match-summary'),
      resultsTableBody: document.getElementById('results-table-body'),
      resultsCount: document.getElementById('results-count'),

      // Pagination
      pagination: document.getElementById('pagination'),
      prevPageBtn: document.getElementById('prev-page-btn'),
      nextPageBtn: document.getElementById('next-page-btn'),
      paginationInfo: document.getElementById('pagination-info'),

      // Loading
      loadingIndicator: document.getElementById('loading-indicator')
    };
  }

  /**
   * Initialize the track SVG renderer
   */
  initializeTrackRenderer() {
    this.renderer = new TrackSvgRenderer(this.elements.trackContainer, {
      showLabels: true,
      interactive: true,
      waterJumpConfig: this.waterJumpConfig,
      onMarkingClick: (marking) => this.handleMarkingClick(marking),
      onMarkingHover: (marking, element, isHovering) => this.handleMarkingHover(marking, element, isHovering)
    });

    this.renderer.render();
  }

  /**
   * Initialize the marking selector
   */
  initializeSelector() {
    this.selector = new TrackMarkingSelector({
      onSelectionChange: (selection) => this.handleSelectionChange(selection),
      onDistanceCalculated: (result) => this.handleDistanceCalculated(result)
    });

    this.selector.setRenderer(this.renderer);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Find button
    this.elements.findBtn.addEventListener('click', () => this.handleFindClick());

    // Enter key on inputs
    this.elements.distanceInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleFindClick();
    });

    this.elements.toleranceInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleFindClick();
    });

    // Water jump toggle
    this.elements.waterJumpInside.addEventListener('click', () => this.setWaterJumpConfig('inside'));
    this.elements.waterJumpOutside.addEventListener('click', () => this.setWaterJumpConfig('outside'));

    // Clear selection button
    this.elements.clearSelectionBtn.addEventListener('click', () => this.handleClearSelection());

    // Pagination
    this.elements.prevPageBtn.addEventListener('click', () => this.goToPage(this.currentPage - 1));
    this.elements.nextPageBtn.addEventListener('click', () => this.goToPage(this.currentPage + 1));
  }

  /**
   * Handle find button click
   */
  handleFindClick() {
    const distance = parseFloat(this.elements.distanceInput.value);
    const tolerance = parseFloat(this.elements.toleranceInput.value) || 0.5;

    // Validate input
    if (isNaN(distance) || distance <= 0) {
      this.showError('Please enter a valid distance');
      return;
    }

    if (distance > 400) {
      this.showError('Distance must be 400m or less');
      return;
    }

    // Clear any existing selection
    this.selector.clearSelection();

    // Perform search
    this.showLoading(true);

    // Use setTimeout to allow UI to update
    setTimeout(() => {
      try {
        this.searchResults = findDistanceMatches(distance, tolerance, {
          waterJumpConfig: this.waterJumpConfig
        });

        this.currentPage = 1;
        this.displayResults();
      } catch (error) {
        console.error('Search error:', error);
        this.showError('An error occurred while searching');
      } finally {
        this.showLoading(false);
      }
    }, 10);
  }

  /**
   * Display search results
   */
  displayResults() {
    const paginated = paginateResults(this.searchResults, this.currentPage, this.pageSize);

    // Update match count
    this.elements.matchCount.textContent = paginated.total;
    this.elements.matchSummary.textContent = paginated.total === 0
      ? 'No matches found. Try increasing the tolerance.'
      : `Found ${paginated.total} matching distance${paginated.total === 1 ? '' : 's'}`;

    // Update results count in header
    this.elements.resultsCount.textContent = paginated.total > 0
      ? `${paginated.total} matches`
      : '';

    // Clear and populate table
    this.elements.resultsTableBody.innerHTML = '';

    for (let i = 0; i < paginated.items.length; i++) {
      const result = paginated.items[i];
      const globalIndex = (this.currentPage - 1) * this.pageSize + i;
      const row = this.createResultRow(result, globalIndex);
      this.elements.resultsTableBody.appendChild(row);
    }

    // Update pagination
    this.updatePagination(paginated);

    // Show results container
    this.elements.resultsContainer.classList.remove('hidden');
  }

  /**
   * Create a result table row
   */
  createResultRow(result, index) {
    const row = document.createElement('tr');
    row.dataset.index = index;

    // Start marking
    const startCell = document.createElement('td');
    startCell.innerHTML = `
      <span class="marking-name">${result.start.shortName || result.start.name}</span>
    `;
    row.appendChild(startCell);

    // End marking
    const endCell = document.createElement('td');
    endCell.innerHTML = `
      <span class="marking-name">${result.end.shortName || result.end.name}</span>
    `;
    row.appendChild(endCell);

    // Lanes
    const lanesCell = document.createElement('td');
    lanesCell.innerHTML = `<span class="marking-lane">${result.lanesDisplay}</span>`;
    row.appendChild(lanesCell);

    // Distance
    const distanceCell = document.createElement('td');
    distanceCell.innerHTML = `<span class="distance-value">${formatDistance(result.distance)}</span>`;
    row.appendChild(distanceCell);

    // Difference
    const diffCell = document.createElement('td');
    const diffClass = result.difference < 0.01 ? 'diff-value--exact' : 'diff-value--close';
    diffCell.innerHTML = `<span class="diff-value ${diffClass}">${formatDifference(result.difference)}</span>`;
    row.appendChild(diffCell);

    // Click handler
    row.addEventListener('click', () => this.handleResultClick(result, index));

    return row;
  }

  /**
   * Handle result row click
   */
  handleResultClick(result, index) {
    // Update selected state in table
    const rows = this.elements.resultsTableBody.querySelectorAll('tr');
    rows.forEach(r => r.classList.remove('selected'));

    const selectedRow = this.elements.resultsTableBody.querySelector(`tr[data-index="${index}"]`);
    if (selectedRow) {
      selectedRow.classList.add('selected');
    }

    this.selectedResultIndex = index;

    // Get full marking objects for highlighting
    const startMarking = getMarkingById(result.start.id, { waterJumpConfig: this.waterJumpConfig })
      || result.start;
    const endMarking = getMarkingById(result.end.id, { waterJumpConfig: this.waterJumpConfig })
      || result.end;

    // Highlight on track
    this.selector.setSelection(startMarking, endMarking);
  }

  /**
   * Update pagination controls
   */
  updatePagination(paginated) {
    this.elements.prevPageBtn.disabled = !paginated.hasPrev;
    this.elements.nextPageBtn.disabled = !paginated.hasNext;
    this.elements.paginationInfo.textContent = `Page ${paginated.page} of ${paginated.totalPages || 1}`;

    // Show/hide pagination based on total pages
    this.elements.pagination.style.display = paginated.totalPages > 1 ? 'flex' : 'none';
  }

  /**
   * Go to a specific page
   */
  goToPage(page) {
    this.currentPage = page;
    this.displayResults();

    // Scroll to results
    this.elements.resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Handle marking click on track
   */
  handleMarkingClick(marking) {
    this.selector.handleMarkingClick(marking);

    // Clear search result selection when manually selecting
    if (this.selectedResultIndex >= 0) {
      const rows = this.elements.resultsTableBody.querySelectorAll('tr');
      rows.forEach(r => r.classList.remove('selected'));
      this.selectedResultIndex = -1;
    }
  }

  /**
   * Handle marking hover
   */
  handleMarkingHover(marking, element, isHovering) {
    // Could add tooltip or status display here
    if (isHovering) {
      element.style.cursor = 'pointer';
    }
  }

  /**
   * Handle selection change from selector
   */
  handleSelectionChange(selection) {
    // Update selection panel
    this.elements.selectionStartValue.textContent =
      TrackMarkingSelector.getMarkingDisplayName(selection.first);

    this.elements.selectionEndValue.textContent =
      TrackMarkingSelector.getMarkingDisplayName(selection.second);

    // Update distance display
    if (selection.state === SELECTION_STATE.TWO_SELECTED) {
      // Distance will be updated by handleDistanceCalculated
    } else {
      this.elements.selectionDistanceValue.textContent = '-';
    }
  }

  /**
   * Handle distance calculated from selector
   */
  handleDistanceCalculated(result) {
    this.elements.selectionDistanceValue.textContent = formatDistance(result.distance);
  }

  /**
   * Handle clear selection button
   */
  handleClearSelection() {
    this.selector.clearSelection();

    // Also clear table selection
    const rows = this.elements.resultsTableBody.querySelectorAll('tr');
    rows.forEach(r => r.classList.remove('selected'));
    this.selectedResultIndex = -1;
  }

  /**
   * Set water jump configuration
   */
  setWaterJumpConfig(config) {
    if (config === this.waterJumpConfig) return;

    this.waterJumpConfig = config;

    // Update toggle buttons
    this.elements.waterJumpInside.classList.toggle('mode-toggle__option--active', config === 'inside');
    this.elements.waterJumpOutside.classList.toggle('mode-toggle__option--active', config === 'outside');

    // Re-render track
    this.selector.clearSelection();
    this.renderer.setWaterJumpConfig(config);

    // Clear results if searching
    if (this.searchResults.length > 0) {
      this.handleFindClick();
    }
  }

  /**
   * Show/hide loading indicator
   */
  showLoading(show) {
    this.elements.loadingIndicator.classList.toggle('hidden', !show);
  }

  /**
   * Show error message
   */
  showError(message) {
    // Simple alert for now - could be enhanced with toast notification
    alert(message);
  }
}

// Initialize when DOM is ready
const calculator = new TrackDistanceCalculator();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => calculator.initialize());
} else {
  calculator.initialize();
}

export default TrackDistanceCalculator;
