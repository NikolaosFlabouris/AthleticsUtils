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

  // Find exact match or the entry with lower points when between two values
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
      // If user's performance is better than table entry, skip it (they deserve higher points)
      // If user's performance is worse than table entry, this could be their score
      if (perfNum < perfValue) {
        // User threw/jumped shorter - this entry or worse applies
        if (!lowerPointsEntry || points < lowerPointsEntry[0]) {
          lowerPointsEntry = [points, perf];
        }
      }
    } else {
      // For time events (lower is better):
      // If user's performance is better than table entry, skip it (they deserve higher points)
      // If user's performance is worse than table entry, this could be their score
      if (perfNum > perfValue) {
        // User ran slower - this entry or worse applies
        if (!lowerPointsEntry || points < lowerPointsEntry[0]) {
          lowerPointsEntry = [points, perf];
        }
      }
    }
  }

  // If no entry found where user performance is worse, they may have performed
  // better than all table entries - find the best (highest points) entry
  if (!lowerPointsEntry) {
    for (const [points, perf] of eventData) {
      if (!lowerPointsEntry || points > lowerPointsEntry[0]) {
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

  // Sort by category and event name
  equivalents.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.event.localeCompare(b.event);
  });

  return equivalents;
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
