/**
 * Calculation History Manager
 * Handles localStorage operations for calculation history
 */

const STORAGE_KEY = 'athleticsUtils.calculationHistory';
const MAX_ENTRIES = 10;

export class HistoryManager {
  /**
   * Load history from localStorage
   * @returns {Array} Array of history entries
   */
  static load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error loading history:', error);
      return [];
    }
  }

  /**
   * Save history to localStorage
   * @param {Array} history - Array of history entries
   */
  static save(history) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving history:', error);
      // Handle quota exceeded error
      if (error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, clearing old entries');
        // Keep only last 5 entries
        const trimmed = history.slice(0, 5);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      }
    }
  }

  /**
   * Add a new entry to history
   * @param {Object} entry - History entry object
   * @returns {Array} Updated history
   */
  static addEntry(entry) {
    const history = this.load();

    // Add ID if not present
    if (!entry.id) {
      entry.id = `hist-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Add to beginning of array
    history.unshift(entry);

    // Trim to max entries
    if (history.length > MAX_ENTRIES) {
      history.splice(MAX_ENTRIES);
    }

    this.save(history);
    return history;
  }

  /**
   * Remove an entry by ID
   * @param {string} id - Entry ID
   * @returns {Array} Updated history
   */
  static removeEntry(id) {
    const history = this.load();
    const filtered = history.filter(entry => entry.id !== id);
    this.save(filtered);
    return filtered;
  }

  /**
   * Reorder history (for drag-and-drop)
   * @param {Array} newOrder - New array order
   */
  static reorder(newOrder) {
    this.save(newOrder);
  }

  /**
   * Clear all history
   */
  static clear() {
    localStorage.removeItem(STORAGE_KEY);
  }
}
