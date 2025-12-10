/**
 * Track Marking Selector
 * Manages the selection state for manual marking selection on the track
 *
 * State Machine:
 * NONE → click → ONE_SELECTED
 * ONE_SELECTED → click same → NONE
 * ONE_SELECTED → click different → TWO_SELECTED
 * TWO_SELECTED → click first → ONE_SELECTED (second remains)
 * TWO_SELECTED → click second → ONE_SELECTED (first remains)
 * TWO_SELECTED → click third → TWO_SELECTED (third replaces first)
 * Any → clear → NONE
 */

import { calculateMarkingDistance } from '../calculators/track-geometry.js';

/**
 * Selection states
 */
export const SELECTION_STATE = {
  NONE: 'none',
  ONE_SELECTED: 'one_selected',
  TWO_SELECTED: 'two_selected'
};

/**
 * Track Marking Selector class
 */
export class TrackMarkingSelector {
  constructor(options = {}) {
    this.firstMarking = null;
    this.secondMarking = null;
    this.state = SELECTION_STATE.NONE;

    // Callbacks
    this.onSelectionChange = options.onSelectionChange || null;
    this.onDistanceCalculated = options.onDistanceCalculated || null;

    // Track renderer reference (set later)
    this.renderer = null;
  }

  /**
   * Set the track renderer reference
   * @param {TrackSvgRenderer} renderer - Track SVG renderer instance
   */
  setRenderer(renderer) {
    this.renderer = renderer;
  }

  /**
   * Handle marking click
   * @param {Object} marking - The marking that was clicked
   */
  handleMarkingClick(marking) {
    if (!marking) return;

    switch (this.state) {
      case SELECTION_STATE.NONE:
        this._selectFirst(marking);
        break;

      case SELECTION_STATE.ONE_SELECTED:
        if (this._isSameMarking(this.firstMarking, marking)) {
          // Clicking same marking - deselect
          this._deselectFirst();
        } else {
          // Clicking different marking - select as second
          this._selectSecond(marking);
        }
        break;

      case SELECTION_STATE.TWO_SELECTED:
        if (this._isSameMarking(this.firstMarking, marking)) {
          // Clicking first - deselect it, second becomes first
          this._promoteSecondToFirst();
        } else if (this._isSameMarking(this.secondMarking, marking)) {
          // Clicking second - deselect it
          this._deselectSecond();
        } else {
          // Clicking third - replaces first, second stays
          this._replaceFirst(marking);
        }
        break;
    }
  }

  /**
   * Select a marking as first
   */
  _selectFirst(marking) {
    this.firstMarking = marking;
    this.state = SELECTION_STATE.ONE_SELECTED;

    if (this.renderer) {
      this.renderer.clearSelections();
      this.renderer.selectMarking(marking.id, true);
    }

    this._notifySelectionChange();
  }

  /**
   * Deselect first marking
   */
  _deselectFirst() {
    if (this.renderer && this.firstMarking) {
      this.renderer.deselectMarking(this.firstMarking.id);
    }

    this.firstMarking = null;
    this.state = SELECTION_STATE.NONE;

    this._notifySelectionChange();
  }

  /**
   * Select a marking as second
   */
  _selectSecond(marking) {
    this.secondMarking = marking;
    this.state = SELECTION_STATE.TWO_SELECTED;

    if (this.renderer) {
      this.renderer.selectMarking(marking.id, false);
      this.renderer.highlightRoute(this.firstMarking, this.secondMarking);
    }

    this._notifySelectionChange();
    this._calculateAndNotifyDistance();
  }

  /**
   * Deselect second marking
   */
  _deselectSecond() {
    if (this.renderer && this.secondMarking) {
      this.renderer.deselectMarking(this.secondMarking.id);
      this.renderer.clearHighlights();
    }

    this.secondMarking = null;
    this.state = SELECTION_STATE.ONE_SELECTED;

    this._notifySelectionChange();
  }

  /**
   * Promote second marking to first (when first is deselected)
   */
  _promoteSecondToFirst() {
    if (this.renderer) {
      this.renderer.clearSelections();
    }

    this.firstMarking = this.secondMarking;
    this.secondMarking = null;
    this.state = SELECTION_STATE.ONE_SELECTED;

    if (this.renderer && this.firstMarking) {
      this.renderer.selectMarking(this.firstMarking.id, true);
    }

    this._notifySelectionChange();
  }

  /**
   * Replace first marking with a new one
   */
  _replaceFirst(marking) {
    if (this.renderer && this.firstMarking) {
      this.renderer.deselectMarking(this.firstMarking.id);
    }

    this.firstMarking = this.secondMarking;
    this.secondMarking = marking;

    if (this.renderer) {
      this.renderer.clearSelections();
      this.renderer.selectMarking(this.firstMarking.id, true);
      this.renderer.selectMarking(this.secondMarking.id, false);
      this.renderer.highlightRoute(this.firstMarking, this.secondMarking);
    }

    this._notifySelectionChange();
    this._calculateAndNotifyDistance();
  }

  /**
   * Clear all selections
   */
  clearSelection() {
    if (this.renderer) {
      this.renderer.clearSelections();
    }

    this.firstMarking = null;
    this.secondMarking = null;
    this.state = SELECTION_STATE.NONE;

    this._notifySelectionChange();
  }

  /**
   * Check if two markings are the same
   */
  _isSameMarking(m1, m2) {
    if (!m1 || !m2) return false;
    return m1.id === m2.id;
  }

  /**
   * Notify selection change callback
   */
  _notifySelectionChange() {
    if (this.onSelectionChange) {
      this.onSelectionChange({
        state: this.state,
        first: this.firstMarking,
        second: this.secondMarking
      });
    }
  }

  /**
   * Calculate distance and notify callback
   */
  _calculateAndNotifyDistance() {
    if (!this.firstMarking || !this.secondMarking) return;

    const distance = calculateMarkingDistance(this.firstMarking, this.secondMarking);

    if (this.onDistanceCalculated) {
      this.onDistanceCalculated({
        start: this.firstMarking,
        end: this.secondMarking,
        distance
      });
    }
  }

  /**
   * Get current selection state
   * @returns {Object} Current state with markings
   */
  getSelection() {
    return {
      state: this.state,
      first: this.firstMarking,
      second: this.secondMarking,
      distance: this.state === SELECTION_STATE.TWO_SELECTED
        ? calculateMarkingDistance(this.firstMarking, this.secondMarking)
        : null
    };
  }

  /**
   * Set selection programmatically (for highlighting search results)
   * @param {Object} start - Start marking
   * @param {Object} end - End marking
   */
  setSelection(start, end) {
    this.clearSelection();

    if (start) {
      this._selectFirst(start);
    }

    if (end) {
      this._selectSecond(end);
    }
  }

  /**
   * Check if a marking is currently selected
   * @param {string} markingId - Marking ID
   * @returns {boolean}
   */
  isSelected(markingId) {
    return (this.firstMarking && this.firstMarking.id === markingId) ||
           (this.secondMarking && this.secondMarking.id === markingId);
  }

  /**
   * Get the display name for a marking
   * @param {Object} marking - Marking object
   * @returns {string} Display name
   */
  static getMarkingDisplayName(marking) {
    if (!marking) return '-';

    let name = marking.shortName || marking.name;

    if (marking.lane && marking.lane !== 0) {
      name += ` (L${marking.lane})`;
    }

    return name;
  }
}

export default TrackMarkingSelector;
