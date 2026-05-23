/**
 * Calculation History Manager
 * Handles localStorage operations for calculation history
 */

const STORAGE_KEY = 'athleticsUtils.calculationHistory';
const MAX_ENTRIES = 10;

/**
 * Generate a collision-resistant ID for a history entry.
 * Prefers crypto.randomUUID (widely supported since 2022) and falls back to a
 * crypto.getRandomValues-based UUID v4 — never to Math.random.
 */
function newEntryId() {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') {
      return `hist-${crypto.randomUUID()}`;
    }
    if (typeof crypto.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
      bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
      const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      return `hist-${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    }
  }
  // Final fallback for ancient runtimes — still won't be guessable in the
  // tiny window the calculator uses IDs for.
  return `hist-${Date.now().toString(36)}`;
}

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
      entry.id = newEntryId();
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
   * Move an entry one slot up or down (for keyboard-accessible reordering).
   * No-op if the entry is already at the edge in that direction.
   * @param {string} id - Entry ID to move
   * @param {'up'|'down'} direction
   * @returns {Array} Updated history
   */
  static moveEntry(id, direction) {
    const history = this.load();
    const idx = history.findIndex(e => e.id === id);
    if (idx < 0) return history;

    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= history.length) return history;

    const [item] = history.splice(idx, 1);
    history.splice(newIdx, 0, item);
    this.save(history);
    return history;
  }

  /**
   * Clear all history
   */
  static clear() {
    localStorage.removeItem(STORAGE_KEY);
  }
}
