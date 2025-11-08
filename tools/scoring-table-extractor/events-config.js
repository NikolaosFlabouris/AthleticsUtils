/**
 * World Athletics Scoring Tables - Event Configuration
 *
 * This file serves as the single source of truth for all athletics events,
 * their categorizations, and validation rules.
 */

export const eventsConfig = {
  /**
   * Event modifiers that can be appended to event names
   */
  modifiers: {
    h: 'hurdles',           // e.g., 100m h, 400m h
    sh: 'short track',      // e.g., 200m sh (short track/indoor)
    sc: 'steeplechase',     // e.g., 3000m sc
    w: 'walk',              // e.g., 3km w, 10km w (race walk)
    mix: 'mixed',           // e.g., 4x400mix (mixed gender relay)
  },

  /**
   * Track events - Running distances with times
   */
  trackEvents: {
    sprints: {
      category: 'sprints',
      description: 'Sprint distances up to 400m',
      events: [
        { distance: 50, unit: 'm', allowHurdles: true },
        { distance: 55, unit: 'm', allowHurdles: true },
        { distance: 60, unit: 'm', allowHurdles: true },
        { distance: 100, unit: 'm', allowHurdles: true },
        { distance: 110, unit: 'm', allowHurdles: true },
        { distance: 150, unit: 'm', allowHurdles: false },
        { distance: 200, unit: 'm', allowHurdles: true, allowShortTrack: true },
        { distance: 300, unit: 'm', allowHurdles: true, allowShortTrack: true },
        { distance: 400, unit: 'm', allowHurdles: true, allowShortTrack: true },
        { distance: 500, unit: 'm', allowHurdles: false, allowShortTrack: true},
      ]
    },

    middle_distance: {
      category: 'middle_distance',
      description: 'Middle distance events from 500m to 2000m',
      events: [
        { distance: 600, unit: 'm', allowHurdles: true, allowShortTrack: true, allowSteeplechase: false },
        { distance: 800, unit: 'm', allowHurdles: true, allowShortTrack: true, allowSteeplechase: false },
        { distance: 1000, unit: 'm', allowHurdles: true, allowShortTrack: true, allowSteeplechase: false },
        { distance: 1500, unit: 'm', allowHurdles: false, allowShortTrack: true, allowSteeplechase: false },
        { distance: 1, unit: 'mile', allowHurdles: false, allowShortTrack: true, allowSteeplechase: false },
        { distance: 2000, unit: 'm', allowHurdles: false, allowShortTrack: true, allowSteeplechase: true },
      ]
    },

    long_distance: {
      category: 'long_distance',
      description: 'Long distance events 3000m and above',
      events: [
        { distance: 3000, unit: 'm', allowHurdles: false, allowShortTrack: true, allowSteeplechase: true },
        { distance: 5000, unit: 'm', allowHurdles: false, allowShortTrack: true, allowSteeplechase: false },
        { distance: 10000, unit: 'm', allowHurdles: false, allowShortTrack: false, allowSteeplechase: false },
        { distance: 2, unit: 'km', allowHurdles: false, allowShortTrack: true, allowSteeplechase: false },
        { distance: 2, unit: 'mile', allowHurdles: false, allowShortTrack: true, allowSteeplechase: false },
        { distance: 5, unit: 'km', allowHurdles: false, allowShortTrack: true, allowSteeplechase: false },
        { distance: 10, unit: 'km', allowHurdles: false, allowShortTrack: true, allowSteeplechase: false },
        { distance: 10, unit: 'mile', allowHurdles: false, allowShortTrack: true, allowSteeplechase: false },
        { distance: 15, unit: 'km', allowHurdles: false, allowShortTrack: false, allowSteeplechase: false },
        { distance: 20, unit: 'km', allowHurdles: false, allowShortTrack: false, allowSteeplechase: false },
        { distance: 21.0975, unit: 'km', allowHurdles: false, allowShortTrack: false, allowSteeplechase: false, name: 'hm' },
        { distance: 25, unit: 'km', allowHurdles: false, allowShortTrack: false, allowSteeplechase: false },
        { distance: 30, unit: 'km', allowHurdles: false, allowShortTrack: false, allowSteeplechase: false },
        { distance: 42.195, unit: 'km', allowHurdles: false, allowShortTrack: false, allowSteeplechase: false, name: 'marathon' },
        { distance: 100, unit: 'km', allowHurdles: false, allowShortTrack: false, allowSteeplechase: false },
      ]
    },

    race_walk: {
      category: 'race_walk',
      description: 'Race walking events - distances with "w" modifier or "walk" suffix',
      events: [
        // Base walk events (can be referenced with "w" modifier or "walk" suffix)
        { distance: 3000, unit: 'm', allowWalkModifier: true },
        { distance: 5000, unit: 'm', allowWalkModifier: true },
        { distance: 10000, unit: 'm', allowWalkModifier: true, name: '10,000mW' },
        { distance: 15000, unit: 'm', allowWalkModifier: true, name: '15,000mW' },
        { distance: 20000, unit: 'm', allowWalkModifier: true, name: '20,000mW'  },
        { distance: 30000, unit: 'm', allowWalkModifier: true, name: '30,000mW'  },
        { distance: 35000, unit: 'm', allowWalkModifier: true, name: '35,000mW'  },
        { distance: 50000, unit: 'm', allowWalkModifier: true, name: '50,000mW'  },
        { distance: 3, unit: 'km', allowWalkModifier: true },
        { distance: 5, unit: 'km', allowWalkModifier: true },
        { distance: 10, unit: 'km', allowWalkModifier: true },
        { distance: 15, unit: 'km', allowWalkModifier: true },
        { distance: 20, unit: 'km', allowWalkModifier: true },
        { distance: 21.0975, unit: 'km', allowWalkModifier: true, name: 'hmw' },
        { distance: 30, unit: 'km', allowWalkModifier: true },
        { distance: 35, unit: 'km', allowWalkModifier: true },
        { distance: 42.195, unit: 'km', allowWalkModifier: true , name: 'marw' },
        { distance: 50, unit: 'km', allowWalkModifier: true },
      ]
    },
  },

  /**
   * Field events - Jumps and Throws
   */
  fieldEvents: {
    jumps: {
      category: 'jumps',
      description: 'Jumping events',
      events: [
        { abbr: 'hj', name: 'high jump' },
        { abbr: 'pv', name: 'pole vault' },
        { abbr: 'lj', name: 'long jump' },
        { abbr: 'tj', name: 'triple jump' },
      ]
    },

    throws: {
      category: 'throws',
      description: 'Throwing events',
      events: [
        { abbr: 'sp', name: 'shot put' },
        { abbr: 'dt', name: 'discus throw' },
        { abbr: 'ht', name: 'hammer throw' },
        { abbr: 'jt', name: 'javelin throw' },
        { abbr: 'wt', name: 'weight throw' },
      ]
    },
  },

  /**
   * Combined events - Multi-discipline competitions
   */
  combinedEvents: {
    category: 'combined',
    description: 'Combined/Multi-event competitions',
    events: [
      { abbr: 'dec', name: 'decathlon' },
      { abbr: 'hept', name: 'heptathlon', allowShortTrack: true },
      { abbr: 'pent', name: 'pentathlon', allowShortTrack: true },
    ]
  },

  /**
   * Relay events - Team running events
   */
  relayEvents: {
    category: 'relays',
    description: 'Relay races (4 runners)',
    events: [
      { distance: 100, unit: 'm', name: '4x100m', allowHurdles: false, allowShortTrack: false },
      { distance: 200, unit: 'm', name: '4x200m', allowHurdles: false, allowShortTrack: true },
      { distance: 400, unit: 'm', name: '4x400m', allowHurdles: false, allowShortTrack: true, allowMixed: true },
    ]
  },

  /**
   * Category detection keywords for PDF section headers
   * Maps text found in section headers to category names
   */
  categoryKeywords: {
    sprints: ['sprint'],
    hurdles: ['hurdle', 'haie'],
    middle_distance: ['demi-fond', 'middle'],
    long_distance: ['long distance', 'fond'],
    jumps: ['jump', 'saut'],
    throws: ['throw', 'lancer'],
    combined: ['combined', 'combinée'],
    relays: ['relay', 'relai'],
    race_walk: ['walk', 'marche'],
  },
};

/**
 * Helper function to generate all valid event name variations
 * @returns {Object} Map of normalized event names to their metadata
 */
export function buildEventMap() {
  const eventMap = new Map();

  // Track events
  Object.values(eventsConfig.trackEvents).forEach(categoryGroup => {
    categoryGroup.events.forEach(event => {
      const baseName = event.name || `${event.distance}${event.unit}`;

      // Skip base event for race_walk (only create with "w" or "walk" modifier)
      if (categoryGroup.category !== 'race_walk') {
        // Add base event
        eventMap.set(baseName, {
          category: categoryGroup.category,
          type: 'track',
          ...event
        });
      }

      // Add hurdles variant
      if (event.allowHurdles) {
        eventMap.set(`${baseName} h`, {
          category: categoryGroup.category,
          type: 'track',
          modifier: 'h',
          ...event
        });
      }

      // Add short track variant
      if (event.allowShortTrack) {
        eventMap.set(`${baseName} sh`, {
          category: categoryGroup.category,
          type: 'track',
          modifier: 'sh',
          ...event
        });
      }

      // Add steeplechase variant
      if (event.allowSteeplechase) {
        eventMap.set(`${baseName} sc`, {
          category: categoryGroup.category,
          type: 'track',
          modifier: 'sc',
          ...event
        });
      }

      // Walk events are handled separately in race_walk category
    });
  });

  // Field events
  Object.values(eventsConfig.fieldEvents).forEach(categoryGroup => {
    categoryGroup.events.forEach(event => {
      eventMap.set(event.abbr, {
        category: categoryGroup.category,
        type: 'field',
        ...event
      });
    });
  });

  // Combined events
  eventsConfig.combinedEvents.events.forEach(event => {
    eventMap.set(event.abbr, {
      category: 'combined',
      type: 'combined',
      ...event
    });

    // Add 'sh' (short track) variant for women's combined events
    if (event.allowShortTrack) {
      eventMap.set(`${event.abbr} sh`, {
        category: 'combined',
        type: 'combined',
        modifier: 'sh',
        ...event
      });
    }
  });

  // Relay events
  eventsConfig.relayEvents.events.forEach(event => {
    const baseName = event.name;

    eventMap.set(baseName, {
      category: 'relays',
      type: 'relay',
      ...event
    });

    // Add short track variant
    if (event.allowShortTrack) {
      eventMap.set(`${baseName} sh`, {
        category: 'relays',
        type: 'relay',
        modifier: 'sh',
        ...event
      });
    }

    // Add mixed variant
    if (event.allowMixed) {
      // Add 'mix' after the 'm': "4x400m" -> "4x400m mix"
      const mixName = `${baseName} mix`;
      eventMap.set(mixName, {
        category: 'relays',
        type: 'relay',
        modifier: 'mix',
        gender: 'mixed',
        ...event
      });

      // Mixed + short track
      if (event.allowShortTrack) {
        eventMap.set(`${mixName} sh`, {
          category: 'relays',
          type: 'relay',
          modifier: 'mix+sh',
          gender: 'mixed',
          ...event
        });
      }
    }
  });

  // Race walk events - generate both "w" modifier and "walk" suffix variants
  eventsConfig.trackEvents.race_walk.events.forEach(event => {
    const baseName = event.name || `${event.distance}${event.unit}`;

    if (event.allowWalkModifier) {
      // If event has a special name (like "hmw", "marw", "5,000mW"), add it as a base entry
      if (event.name) {
        eventMap.set(baseName, {
          category: 'race_walk',
          type: 'race_walk',
          ...event
        });
      }

      // Add "w" modifier variant (e.g., "3km w", "10km w")
      eventMap.set(`${baseName} w`, {
        category: 'race_walk',
        type: 'race_walk',
        modifier: 'w',
        ...event
      });

      // Add "walk" suffix variant (e.g., "3km walk", "10km walk")
      eventMap.set(`${baseName} walk`, {
        category: 'race_walk',
        type: 'race_walk',
        modifier: 'walk',
        ...event
      });
    }
  });

  return eventMap;
}

/**
 * Get category for a specific event name
 * @param {string} eventName - Normalized event name
 * @returns {string|null} Category name or null if unknown
 */
export function getCategoryForEvent(eventName) {
  const eventMap = buildEventMap();
  const eventInfo = eventMap.get(eventName);
  return eventInfo ? eventInfo.category : null;
}

/**
 * Validate if an event name is known/supported
 * @param {string} eventName - Normalized event name
 * @returns {boolean} True if event is recognized
 */
export function isKnownEvent(eventName) {
  const eventMap = buildEventMap();
  return eventMap.has(eventName);
}

/**
 * Get full event information
 * @param {string} eventName - Normalized event name
 * @returns {Object|null} Event metadata or null if unknown
 */
export function getEventInfo(eventName) {
  const eventMap = buildEventMap();
  return eventMap.get(eventName) || null;
}
