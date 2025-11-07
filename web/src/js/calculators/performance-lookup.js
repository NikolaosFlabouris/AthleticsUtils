/**
 * Performance Lookup Calculator
 * Calculate points for a given performance and find equivalent performances
 */

import { scoringDataLoader } from '../data/scoring-data-loader.js';

/**
 * Find points for a given performance in an event
 * @param {string} gender
 * @param {string} event
 * @param {string} performance - Normalized performance value
 * @returns {Object|null} {points, exactMatch, closestPerformance}
 */
export function lookupPoints(gender, event, performance) {
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
  const perfNum = parseFloat(performance);

  if (isNaN(perfNum)) {
    return null;
  }

  // Determine if this is a "lower is better" event (times) or "higher is better" (distances)
  const isDistanceEvent = isFieldEvent(event);

  // Find exact match or closest performance
  let closestEntry = null;
  let exactMatch = false;

  for (const [points, perf] of eventData) {
    const perfValue = parseFloat(perf);

    // Check for exact match (within small tolerance for floating point)
    if (Math.abs(perfValue - perfNum) < 0.005) {
      return {
        points,
        exactMatch: true,
        closestPerformance: perf
      };
    }

    // Track closest entry
    if (!closestEntry) {
      closestEntry = [points, perf];
    } else {
      const closestValue = parseFloat(closestEntry[1]);
      const currentDiff = Math.abs(perfValue - perfNum);
      const closestDiff = Math.abs(closestValue - perfNum);

      if (currentDiff < closestDiff) {
        closestEntry = [points, perf];
      }
    }
  }

  if (closestEntry) {
    return {
      points: closestEntry[0],
      exactMatch: false,
      closestPerformance: closestEntry[1]
    };
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
