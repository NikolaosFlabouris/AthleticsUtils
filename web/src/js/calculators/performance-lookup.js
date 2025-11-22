/**
 * Performance Lookup Calculator
 * Calculate points for a given performance and find equivalent performances
 */

import { scoringDataLoader } from '../data/scoring-data-loader.js';
import { eventConfigLoader } from '../data/event-config-loader.js';

/**
 * Find points for a given performance in an event
 * Per World Athletics rules: When a performance falls between two table entries,
 * the lower score shall be assigned.
 * @param {string} gender
 * @param {string} event
 * @param {string} performance - Normalized performance value
 * @param {boolean} isHandTimed - Whether to apply hand timing offset
 * @returns {Object|null} {points, exactMatch, closestPerformance, appliedOffset?, originalPerformance?}
 */
export function lookupPoints(gender, event, performance, isHandTimed = false) {
  // Find the category for this event
  const category = scoringDataLoader.findCategory(gender, event);

  if (!category) {
    return null;
  }

  // Get the event data
  const eventData = scoringDataLoader.getEventData(gender, category, event);

  if (!eventData || eventData.length === 0) {
    return null;
  }

  // Convert performance to number for comparison
  let perfNum = parseFloat(performance);
  let appliedOffset = null;
  let originalPerformance = null;

  // Apply hand timing offset if applicable
  if (isHandTimed) {
    const offset = eventConfigLoader.getHandTimingOffset(event);
    if (offset) {
      originalPerformance = perfNum;
      perfNum += offset;
      appliedOffset = offset;
    }
  }

  if (isNaN(perfNum)) {
    return null;
  }

  // Determine if this is a "lower is better" event (times) or "higher is better" (distances)
  const isDistanceEvent = isFieldEvent(event);

  // Find exact match or closest worse performance (per World Athletics rules)
  let lowerPointsEntry = null;

  for (const [points, perf] of eventData) {
    const perfValue = parseFloat(perf);

    // Check for exact match (within small tolerance for floating point)
    if (Math.abs(perfValue - perfNum) < 0.005) {
      const result = {
        points,
        exactMatch: true,
        closestPerformance: perf
      };
      if (appliedOffset !== null) {
        result.appliedOffset = appliedOffset;
        result.originalPerformance = originalPerformance;
      }
      return result;
    }

    // Track the entry that should be used based on World Athletics rules
    // When performance falls between table entries, use the lower score
    if (isDistanceEvent) {
      // For distance events (higher is better):
      // Find table entries that are worse than user's performance (shorter distance)
      // Among these, select the one with highest points (closest worse performance)
      if (perfNum > perfValue) {
        // Table entry is shorter - user performed better than this entry
        // This entry represents a worse performance, potentially applicable
        if (!lowerPointsEntry || points > lowerPointsEntry[0]) {
          lowerPointsEntry = [points, perf];
        }
      }
    } else {
      // For time events (lower is better):
      // Find table entries that are worse than user's performance (slower time)
      // Among these, select the one with highest points (closest worse performance)
      if (perfNum < perfValue) {
        // Table entry is slower - user performed better than this entry
        // This entry represents a worse performance, potentially applicable
        if (!lowerPointsEntry || points > lowerPointsEntry[0]) {
          lowerPointsEntry = [points, perf];
        }
      }
    }
  }

  // If no entry found where table performance is worse than user's,
  // the user performed worse than all table entries - return the worst (lowest points) entry
  if (!lowerPointsEntry) {
    for (const [points, perf] of eventData) {
      if (!lowerPointsEntry || points < lowerPointsEntry[0]) {
        lowerPointsEntry = [points, perf];
      }
    }
  }

  if (lowerPointsEntry) {
    const result = {
      points: lowerPointsEntry[0],
      exactMatch: false,
      closestPerformance: lowerPointsEntry[1]
    };
    if (appliedOffset !== null) {
      result.appliedOffset = appliedOffset;
      result.originalPerformance = originalPerformance;
    }
    return result;
  }

  return null;
}

/**
 * Find performance for a given score in an event (reverse lookup)
 * When a score falls between two table entries, returns the performance with LOWER points
 * @param {string} gender
 * @param {string} event
 * @param {number} points - Score to look up (will be rounded to whole number)
 * @param {boolean} isHandTimed - Whether to subtract hand timing offset from result
 * @returns {Object|null} {performance, exactMatch, points, appliedOffset?, originalPerformance?}
 */
export function lookupPerformance(gender, event, points, isHandTimed = false) {
  // Round points to whole number
  const targetPoints = Math.round(points);

  // Find the category for this event
  const category = scoringDataLoader.findCategory(gender, event);

  if (!category) {
    return null;
  }

  // Get the event data
  const eventData = scoringDataLoader.getEventData(gender, category, event);

  if (!eventData || eventData.length === 0) {
    return null;
  }

  // Find exact match or the entry with lower points when between two values
  let exactMatchEntry = null;
  let lowerPointsEntry = null;

  for (const [entryPoints, perf] of eventData) {
    // Check for exact match
    if (entryPoints === targetPoints) {
      exactMatchEntry = [entryPoints, perf];
      break;
    }

    // Track the entry with highest points that is still lower than target
    // This is the entry we want when score falls between values
    if (entryPoints < targetPoints) {
      if (!lowerPointsEntry || entryPoints > lowerPointsEntry[0]) {
        lowerPointsEntry = [entryPoints, perf];
      }
    }
  }

  // Use exact match if found, otherwise use lower points entry
  const selectedEntry = exactMatchEntry || lowerPointsEntry;

  // If still no entry found (score is lower than all table entries), use the lowest score entry
  if (!selectedEntry) {
    let lowestEntry = null;
    for (const [entryPoints, perf] of eventData) {
      if (!lowestEntry || entryPoints < lowestEntry[0]) {
        lowestEntry = [entryPoints, perf];
      }
    }
    if (lowestEntry) {
      let performance = lowestEntry[1];
      let appliedOffset = null;
      let originalPerformance = null;

      // Apply hand timing adjustment if requested
      if (isHandTimed) {
        const offset = eventConfigLoader.getHandTimingOffset(event);
        if (offset) {
          originalPerformance = performance;
          const perfNum = parseFloat(performance);
          // Subtract offset for hand timing (opposite of adding for FAT)
          const adjustedPerf = perfNum - offset;
          performance = adjustedPerf.toFixed(2);
          appliedOffset = -offset; // Negative to indicate subtraction
        }
      }

      const result = {
        performance,
        exactMatch: false,
        points: lowestEntry[0]
      };
      if (appliedOffset !== null) {
        result.appliedOffset = appliedOffset;
        result.originalPerformance = originalPerformance;
      }
      return result;
    }
    return null;
  }

  let performance = selectedEntry[1];
  let appliedOffset = null;
  let originalPerformance = null;

  // Apply hand timing adjustment if requested
  if (isHandTimed) {
    const offset = eventConfigLoader.getHandTimingOffset(event);
    if (offset) {
      originalPerformance = performance;
      const perfNum = parseFloat(performance);
      // Subtract offset for hand timing (opposite of adding for FAT)
      const adjustedPerf = perfNum - offset;
      performance = adjustedPerf.toFixed(2);
      appliedOffset = -offset; // Negative to indicate subtraction
    }
  }

  const result = {
    performance,
    exactMatch: exactMatchEntry !== null,
    points: selectedEntry[0]
  };
  if (appliedOffset !== null) {
    result.appliedOffset = appliedOffset;
    result.originalPerformance = originalPerformance;
  }
  return result;
}

/**
 * Find all equivalent performances across all events for a given point value
 * @param {string} gender
 * @param {number} points
 * @returns {Array<{event, category, performance, points}>}
 */
export function findEquivalentPerformances(gender, points) {
  const equivalents = [];

  const allEvents = scoringDataLoader.getAllEvents(gender);

  for (const { event, category } of allEvents) {
    const eventData = scoringDataLoader.getEventData(gender, category, event);

    if (!eventData || eventData.length === 0) {
      continue;
    }

    // Find the performance that matches these points (or closest)
    let closestEntry = null;
    let exactMatch = false;

    for (const [eventPoints, perf] of eventData) {
      // Check for exact match
      if (eventPoints === points) {
        closestEntry = [eventPoints, perf];
        exactMatch = true;
        break;
      }

      // Track closest entry
      if (!closestEntry) {
        closestEntry = [eventPoints, perf];
      } else {
        const currentDiff = Math.abs(eventPoints - points);
        const closestDiff = Math.abs(closestEntry[0] - points);

        if (currentDiff < closestDiff) {
          closestEntry = [eventPoints, perf];
        }
      }
    }

    if (closestEntry) {
      equivalents.push({
        event,
        category,
        performance: closestEntry[1],
        points: closestEntry[0],
        exactMatch
      });
    }
  }

  // Filter to only include primary events
  const primaryEvents = eventConfigLoader.getPrimaryEvents();
  const filteredEquivalents = equivalents.filter(equiv =>
    primaryEvents.includes(equiv.event)
  );

  // Group by category
  const byCategory = {};
  for (const equiv of filteredEquivalents) {
    const category = equiv.category || 'other';
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(equiv);
  }

  // Sort events within each category by distance (same as event dropdown)
  for (const category in byCategory) {
    const eventsWithInfo = byCategory[category].map(equiv => {
      const eventInfo = eventConfigLoader.getEventInfo(equiv.event);
      return { ...equiv, eventInfo };
    });

    // Sort using the same logic as the event dropdown
    byCategory[category] = eventConfigLoader.sortEventsByDistance(
      eventsWithInfo.map(e => ({ ...e.eventInfo, key: e.event }))
    ).map((sortedEvent, index) => {
      // Find the corresponding equivalent
      return eventsWithInfo.find(e => e.event === sortedEvent.key);
    });
  }

  // Define category order (same as event dropdown)
  const categoryOrder = ['sprints', 'middle_distance', 'long_distance', 'race_walk', 'jumps', 'throws', 'relays', 'combined'];
  const sortedCategories = Object.keys(byCategory).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  // Flatten back to a single array
  const sortedEquivalents = [];
  for (const category of sortedCategories) {
    sortedEquivalents.push(...byCategory[category]);
  }

  return sortedEquivalents;
}

/**
 * Get the range of points available for an event
 * @param {string} gender
 * @param {string} event
 * @returns {Object|null} {min, max}
 */
export function getPointsRange(gender, event) {
  const category = scoringDataLoader.findCategory(gender, event);

  if (!category) {
    return null;
  }

  const eventData = scoringDataLoader.getEventData(gender, category, event);

  if (!eventData || eventData.length === 0) {
    return null;
  }

  let min = Infinity;
  let max = -Infinity;

  for (const [points] of eventData) {
    min = Math.min(min, points);
    max = Math.max(max, points);
  }

  return { min, max };
}

/**
 * Get performance range for an event
 * @param {string} gender
 * @param {string} event
 * @returns {Object|null} {min, max, minPerformance, maxPerformance}
 */
export function getPerformanceRange(gender, event) {
  const category = scoringDataLoader.findCategory(gender, event);

  if (!category) {
    return null;
  }

  const eventData = scoringDataLoader.getEventData(gender, category, event);

  if (!eventData || eventData.length === 0) {
    return null;
  }

  const performances = eventData.map(([_, perf]) => parseFloat(perf));
  const min = Math.min(...performances);
  const max = Math.max(...performances);

  // Find the actual performance strings for min and max
  let minPerformance = null;
  let maxPerformance = null;

  for (const [_, perf] of eventData) {
    const perfNum = parseFloat(perf);
    if (perfNum === min) minPerformance = perf;
    if (perfNum === max) maxPerformance = perf;
  }

  return {
    min,
    max,
    minPerformance,
    maxPerformance
  };
}

/**
 * Check if an event is a field (distance) event
 * @param {string} event
 * @returns {boolean}
 */
function isFieldEvent(event) {
  const distanceEvents = ['LJ', 'TJ', 'SP', 'DT', 'HT', 'JT', 'PV', 'HJ'];
  return distanceEvents.some(code => event.toUpperCase().includes(code));
}
