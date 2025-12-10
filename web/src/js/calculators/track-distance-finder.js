/**
 * Track Distance Finder
 * Finds pairs of track markings that match a specified distance
 */

import { getAllMarkings } from '../data/track-markings-data.js';
import { calculateMarkingDistance } from './track-geometry.js';
import { TRACK_400M } from '../data/track-constants.js';

/**
 * Result object for a matching distance pair
 * @typedef {Object} DistanceMatch
 * @property {Object} start - Start marking
 * @property {Object} end - End marking
 * @property {number} distance - Calculated distance in meters
 * @property {number} difference - Absolute difference from target distance
 * @property {string} lanesDisplay - Human-readable lane info (e.g., "All", "1, 3, 5")
 */

/**
 * Find all marking pairs that match the target distance within tolerance
 * @param {number} targetDistance - Target distance in meters
 * @param {number} tolerance - Tolerance in meters (default 0.5)
 * @param {Object} options - Search options
 * @param {string} options.waterJumpConfig - 'inside' or 'outside'
 * @param {boolean} options.includeCrossLane - Include cross-lane distances (default true)
 * @param {Object} options.trackConfig - Track configuration
 * @returns {Array<DistanceMatch>} Array of matching distance pairs
 */
export function findDistanceMatches(targetDistance, tolerance = 0.5, options = {}) {
  const {
    waterJumpConfig = 'inside',
    includeCrossLane = true,
    trackConfig = TRACK_400M
  } = options;

  const markings = getAllMarkings({ waterJumpConfig });
  const results = [];
  const seenPairs = new Map(); // For deduplication

  // Generate all pairs
  for (let i = 0; i < markings.length; i++) {
    for (let j = 0; j < markings.length; j++) {
      if (i === j) continue;

      const start = markings[i];
      const end = markings[j];

      // Skip if not including cross-lane and lanes differ
      if (!includeCrossLane && start.lane !== end.lane && start.lane !== 0 && end.lane !== 0) {
        continue;
      }

      // Calculate distance
      const distance = calculateMarkingDistance(start, end, trackConfig);
      const difference = Math.abs(distance - targetDistance);

      // Check if within tolerance
      if (difference <= tolerance) {
        // Create a unique key for this marking pair (ignoring lane)
        const pairKey = createPairKey(start, end);

        if (seenPairs.has(pairKey)) {
          // Add this lane combination to existing result
          const existingResult = seenPairs.get(pairKey);
          addLaneToResult(existingResult, start.lane, end.lane);
        } else {
          // New result
          const result = {
            start: { ...start },
            end: { ...end },
            distance,
            difference,
            lanes: new Set(),
            startLanes: new Set(),
            endLanes: new Set()
          };

          addLaneToResult(result, start.lane, end.lane);
          seenPairs.set(pairKey, result);
          results.push(result);
        }
      }
    }
  }

  // Process results: compute lane display strings
  for (const result of results) {
    result.lanesDisplay = formatLanesDisplay(result.startLanes, result.endLanes);
    // Clean up temporary sets
    delete result.lanes;
  }

  // Sort by difference (closest matches first), then by distance
  results.sort((a, b) => {
    if (Math.abs(a.difference - b.difference) < 0.001) {
      return a.distance - b.distance;
    }
    return a.difference - b.difference;
  });

  return results;
}

/**
 * Create a unique key for a marking pair (ignoring lane-specific info)
 * @param {Object} start - Start marking
 * @param {Object} end - End marking
 * @returns {string} Unique key
 */
function createPairKey(start, end) {
  // Extract base name (without lane)
  const startBase = getMarkingBaseName(start);
  const endBase = getMarkingBaseName(end);
  return `${startBase}|${endBase}`;
}

/**
 * Get base name for a marking (without lane info)
 * @param {Object} marking - Marking object
 * @returns {string} Base name
 */
function getMarkingBaseName(marking) {
  // For markings with lane = 0 (all lanes), use full name
  if (marking.lane === 0) {
    return marking.name;
  }

  // For lane-specific markings, strip lane info from ID
  // e.g., "200m-start-lane3" -> "200m-start"
  return marking.id.replace(/-lane\d+$/, '');
}

/**
 * Add lane info to a result
 * @param {Object} result - Result object
 * @param {number} startLane - Start lane (0 for all)
 * @param {number} endLane - End lane (0 for all)
 */
function addLaneToResult(result, startLane, endLane) {
  if (startLane === 0) {
    // All lanes
    for (let i = 1; i <= 9; i++) {
      result.startLanes.add(i);
    }
  } else {
    result.startLanes.add(startLane);
  }

  if (endLane === 0) {
    for (let i = 1; i <= 9; i++) {
      result.endLanes.add(i);
    }
  } else {
    result.endLanes.add(endLane);
  }
}

/**
 * Format lanes display string
 * @param {Set} startLanes - Start lanes
 * @param {Set} endLanes - End lanes
 * @returns {string} Display string
 */
function formatLanesDisplay(startLanes, endLanes) {
  const startArr = Array.from(startLanes).sort((a, b) => a - b);
  const endArr = Array.from(endLanes).sort((a, b) => a - b);

  // If both cover all lanes
  if (startArr.length === 9 && endArr.length === 9) {
    return 'All';
  }

  // If same lanes for start and end
  if (arraysEqual(startArr, endArr)) {
    return formatLaneArray(startArr);
  }

  // Different lanes - show both
  return `${formatLaneArray(startArr)} → ${formatLaneArray(endArr)}`;
}

/**
 * Format an array of lane numbers
 * @param {Array} lanes - Array of lane numbers
 * @returns {string} Formatted string
 */
function formatLaneArray(lanes) {
  if (lanes.length === 9) {
    return 'All';
  }

  if (lanes.length === 1) {
    return `Lane ${lanes[0]}`;
  }

  // Check if consecutive
  const isConsecutive = lanes.every((lane, i) =>
    i === 0 || lane === lanes[i - 1] + 1
  );

  if (isConsecutive && lanes.length > 2) {
    return `${lanes[0]}-${lanes[lanes.length - 1]}`;
  }

  return lanes.join(', ');
}

/**
 * Check if two arrays are equal
 * @param {Array} a - First array
 * @param {Array} b - Second array
 * @returns {boolean} True if equal
 */
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Paginate results
 * @param {Array} results - All results
 * @param {number} page - Page number (1-indexed)
 * @param {number} pageSize - Results per page
 * @returns {Object} Paginated result { items, page, totalPages, total }
 */
export function paginateResults(results, page = 1, pageSize = 20) {
  const total = results.length;
  const totalPages = Math.ceil(total / pageSize);
  const safePage = Math.max(1, Math.min(page, totalPages || 1));

  const startIndex = (safePage - 1) * pageSize;
  const items = results.slice(startIndex, startIndex + pageSize);

  return {
    items,
    page: safePage,
    totalPages,
    total,
    hasNext: safePage < totalPages,
    hasPrev: safePage > 1
  };
}

/**
 * Format distance for display
 * @param {number} distance - Distance in meters
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted distance
 */
export function formatDistance(distance, decimals = 2) {
  return `${distance.toFixed(decimals)}m`;
}

/**
 * Format difference for display
 * @param {number} difference - Difference in meters
 * @returns {string} Formatted difference with sign
 */
export function formatDifference(difference) {
  if (difference < 0.01) {
    return '0.00m';
  }
  return `±${difference.toFixed(2)}m`;
}

export default {
  findDistanceMatches,
  paginateResults,
  formatDistance,
  formatDifference
};
