/**
 * Event Config Loader
 * Handles loading and caching of the events configuration JSON
 */

class EventConfigLoader {
  constructor() {
    this.data = null;
    this.isLoading = false;
    this.loadPromise = null;
  }

  /**
   * Load the event config data
   * @returns {Promise<Object>} The event config data
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
   * Fetch the event config JSON
   * @returns {Promise<Object>}
   */
  async fetchData() {
    try {
      const response = await fetch('/data/events_config.json');

      if (!response.ok) {
        throw new Error(`Failed to load event config: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Validate data structure
      if (!data || !data.events || typeof data.events !== 'object') {
        throw new Error('Invalid data format: expected object with events property');
      }

      return data;
    } catch (error) {
      console.error('Error loading event config:', error);
      throw new Error(`Could not load event config: ${error.message}`);
    }
  }

  /**
   * Get event information by event key
   * @param {string} eventKey - The event key (e.g., "100m", "lj")
   * @returns {Object|null} The event configuration
   */
  getEventInfo(eventKey) {
    if (!this.data || !this.data.events) {
      return null;
    }
    return this.data.events[eventKey] || null;
  }

  /**
   * Get all events
   * @returns {Array<{key: string, ...config}>} Array of event objects with keys
   */
  getAllEvents() {
    if (!this.data || !this.data.events) {
      return [];
    }

    return Object.entries(this.data.events).map(([key, config]) => ({
      key,
      ...config
    }));
  }

  /**
   * Get events grouped by category
   * @returns {Object} Events grouped by category
   */
  getEventsByCategory() {
    const events = this.getAllEvents();
    const grouped = {};

    for (const event of events) {
      const category = event.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(event);
    }

    return grouped;
  }

  /**
   * Get events sorted by distance (shortest to longest)
   * @param {Array} events - Array of event objects
   * @returns {Array} Sorted events
   */
  sortEventsByDistance(events) {
    return events.sort((a, b) => {
      // Convert all distances to meters for comparison
      const aDistance = this.getDistanceInMeters(a);
      const bDistance = this.getDistanceInMeters(b);

      // If distances are equal, sort by display name
      if (aDistance === bDistance) {
        return a.displayName.localeCompare(b.displayName);
      }

      return aDistance - bDistance;
    });
  }

  /**
   * Convert event distance to meters for comparison
   * @param {Object} event - Event object
   * @returns {number} Distance in meters
   */
  getDistanceInMeters(event) {
    // Handle field events (jumps and throws) - they don't have meaningful distance for sorting
    if (!event.distance) {
      // Return a high value to sort them after running events
      // Use different values for different field event types to keep them grouped
      if (event.category === 'jumps') return 1000000;
      if (event.category === 'throws') return 1000001;
      if (event.category === 'combined') return 1000002;
      return 1000003;
    }

    const distance = event.distance;
    const unit = event.unit;

    // Convert to meters
    switch (unit) {
      case 'metres':
        return distance;
      case 'km':
        return distance * 1000;
      case 'miles':
        return distance * 1609.34;
      default:
        return distance;
    }
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
export const eventConfigLoader = new EventConfigLoader();
