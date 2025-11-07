/**
 * Scoring Data Loader
 * Handles loading and caching of the athletics scoring tables JSON
 */

class ScoringDataLoader {
  constructor() {
    this.data = null;
    this.isLoading = false;
    this.loadPromise = null;
  }

  /**
   * Load the scoring tables data
   * @returns {Promise<Object>} The scoring tables data
   */
  async load() {
    // Return cached data if available
    if (this.data) {
      return this.data;
    }

    // Return existing load promise if already loading
    if (this.isLoading) {
      return this.loadPromise;
    }

    this.isLoading = true;

    this.loadPromise = this.fetchData()
      .then(data => {
        this.data = data;
        this.isLoading = false;
        return data;
      })
      .catch(error => {
        this.isLoading = false;
        throw error;
      });

    return this.loadPromise;
  }

  /**
   * Fetch the scoring tables JSON
   * @returns {Promise<Object>}
   */
  async fetchData() {
    try {
      const response = await fetch('/data/athletics_scoring_tables.min.json');

      if (!response.ok) {
        throw new Error(`Failed to load scoring tables: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Validate data structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format: expected object');
      }

      return data;
    } catch (error) {
      console.error('Error loading scoring tables:', error);
      throw new Error(`Could not load scoring data: ${error.message}`);
    }
  }

  /**
   * Get all available genders
   * @returns {string[]}
   */
  getGenders() {
    if (!this.data) {
      return [];
    }
    return Object.keys(this.data);
  }

  /**
   * Get all categories for a given gender
   * @param {string} gender
   * @returns {string[]}
   */
  getCategories(gender) {
    if (!this.data || !this.data[gender]) {
      return [];
    }
    return Object.keys(this.data[gender]);
  }

  /**
   * Get all events for a given gender and category
   * @param {string} gender
   * @param {string} category
   * @returns {string[]}
   */
  getEvents(gender, category) {
    if (!this.data || !this.data[gender] || !this.data[gender][category]) {
      return [];
    }
    return Object.keys(this.data[gender][category]);
  }

  /**
   * Get all events across all categories for a gender
   * @param {string} gender
   * @returns {Array<{event: string, category: string}>}
   */
  getAllEvents(gender) {
    if (!this.data || !this.data[gender]) {
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
   * Get scoring data for a specific event
   * @param {string} gender
   * @param {string} category
   * @param {string} event
   * @returns {Array<[number, string]>} Array of [points, performance] pairs
   */
  getEventData(gender, category, event) {
    if (!this.data || !this.data[gender] || !this.data[gender][category] || !this.data[gender][category][event]) {
      return null;
    }
    return this.data[gender][category][event];
  }

  /**
   * Find the category for a given event and gender
   * @param {string} gender
   * @param {string} eventName
   * @returns {string|null}
   */
  findCategory(gender, eventName) {
    if (!this.data || !this.data[gender]) {
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
   * Check if data is loaded
   * @returns {boolean}
   */
  isDataLoaded() {
    return this.data !== null;
  }

  /**
   * Clear cached data
   */
  clear() {
    this.data = null;
    this.isLoading = false;
    this.loadPromise = null;
  }
}

// Export singleton instance
export const scoringDataLoader = new ScoringDataLoader();
