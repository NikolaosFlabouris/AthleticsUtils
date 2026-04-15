/**
 * Scoring Data Loader
 * Handles lazy, per-gender loading and caching of the athletics scoring tables.
 *
 * The scoring tables are split by gender on disk (scoring-{gender}.min.json)
 * so we only download the data the user actually needs. Each gender file is
 * ~1.5 MB (men / women) or ~40 KB (mixed relays).
 */

const GENDER_FILES = {
  men: 'scoring-men.min.json',
  women: 'scoring-women.min.json',
  mixed: 'scoring-mixed.min.json'
};

class ScoringDataLoader {
  constructor() {
    // Per-gender scoring tables merged into a single object as they are loaded.
    // Shape after loading, e.g., 'men': { men: { sprints: { '100m': [[pts, perf], ...] } } }
    this.data = {};
    // Map of gender -> in-flight fetch promise (prevents duplicate concurrent fetches).
    this.loadPromises = {};
  }

  /**
   * Ensure the scoring data for a given gender is loaded and cached.
   * @param {string} gender - 'men' | 'women' | 'mixed'
   * @returns {Promise<Object>} The scoring data subtree for that gender.
   */
  loadGender(gender) {
    if (!gender || !(gender in GENDER_FILES)) {
      return Promise.reject(new Error(`Unknown gender: ${gender}`));
    }

    // Already cached
    if (this.data[gender]) {
      return Promise.resolve(this.data[gender]);
    }

    // Already fetching
    if (this.loadPromises[gender]) {
      return this.loadPromises[gender];
    }

    const baseUrl = import.meta.env?.BASE_URL || '/';
    const url = `${baseUrl}data/${GENDER_FILES[gender]}`;

    const promise = fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load scoring tables (${gender}): ${response.status} ${response.statusText}`);
        }
        return response.json();
      })
      .then((subtree) => {
        if (!subtree || typeof subtree !== 'object') {
          throw new Error(`Invalid scoring data format for ${gender}`);
        }
        this.data[gender] = subtree;
        delete this.loadPromises[gender];
        return subtree;
      })
      .catch((error) => {
        delete this.loadPromises[gender];
        console.error(`Error loading scoring tables for ${gender}:`, error);
        throw new Error(`Could not load scoring data for ${gender}: ${error.message}`);
      });

    this.loadPromises[gender] = promise;
    return promise;
  }

  /**
   * Get all available genders (all genders that the app supports, not just loaded ones).
   * @returns {string[]}
   */
  getGenders() {
    return Object.keys(GENDER_FILES);
  }

  /**
   * Check whether a gender's scoring data is currently loaded.
   * @param {string} gender
   * @returns {boolean}
   */
  isGenderLoaded(gender) {
    return Boolean(this.data[gender]);
  }

  /**
   * Get all categories for a given gender. Requires the gender to be loaded.
   * @param {string} gender
   * @returns {string[]}
   */
  getCategories(gender) {
    if (!this.data[gender]) {
      return [];
    }
    return Object.keys(this.data[gender]);
  }

  /**
   * Get all events for a given gender and category. Requires the gender to be loaded.
   * @param {string} gender
   * @param {string} category
   * @returns {string[]}
   */
  getEvents(gender, category) {
    if (!this.data[gender] || !this.data[gender][category]) {
      return [];
    }
    return Object.keys(this.data[gender][category]);
  }

  /**
   * Get all events across all categories for a gender. Requires the gender to be loaded.
   * @param {string} gender
   * @returns {Array<{event: string, category: string}>}
   */
  getAllEvents(gender) {
    if (!this.data[gender]) {
      return [];
    }

    const events = [];
    const categories = this.getCategories(gender);

    for (const category of categories) {
      const categoryEvents = this.getEvents(gender, category);
      for (const event of categoryEvents) {
        events.push({ event, category });
      }
    }

    return events;
  }

  /**
   * Get scoring data for a specific event. Requires the gender to be loaded.
   * @param {string} gender
   * @param {string} category
   * @param {string} event
   * @returns {Array<[number, string]>|null}
   */
  getEventData(gender, category, event) {
    if (!this.data[gender] || !this.data[gender][category] || !this.data[gender][category][event]) {
      return null;
    }
    return this.data[gender][category][event];
  }

  /**
   * Find the category for a given event and gender. Requires the gender to be loaded.
   * @param {string} gender
   * @param {string} eventName
   * @returns {string|null}
   */
  findCategory(gender, eventName) {
    if (!this.data[gender]) {
      return null;
    }

    const categories = this.getCategories(gender);
    for (const category of categories) {
      const events = this.getEvents(gender, category);
      if (events.includes(eventName)) {
        return category;
      }
    }

    return null;
  }

  /**
   * Clear cached data (for tests).
   */
  clear() {
    this.data = {};
    this.loadPromises = {};
  }
}

// Export singleton instance
export const scoringDataLoader = new ScoringDataLoader();
