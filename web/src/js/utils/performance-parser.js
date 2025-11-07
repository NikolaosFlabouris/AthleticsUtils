/**
 * Performance Parser Utilities
 * Parse and format athletic performance values
 */

/**
 * Parse a performance string and normalize it
 * @param {string} input - Raw input (e.g., "10.5", "10.50", "1:30.5", "7.50m")
 * @param {string} event - Event name to determine if it's time or distance
 * @returns {string|null} Normalized performance string or null if invalid
 */
export function parsePerformance(input, event) {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // Remove whitespace and convert to lowercase
  const cleaned = input.trim().toLowerCase();

  // Remove common units (m, s, sec, meters, seconds)
  const withoutUnits = cleaned.replace(/[ms]$|sec$|meters?$|seconds?$/i, '').trim();

  // Check if it's a field event (distance) or track event (time)
  const isFieldEvent = isDistanceEvent(event);

  if (isFieldEvent) {
    // Distance event - parse as decimal number
    return parseDistance(withoutUnits);
  } else {
    // Time event - parse as time (could be MM:SS.ss or SS.ss)
    return parseTime(withoutUnits);
  }
}

/**
 * Parse a distance value
 * @param {string} value
 * @returns {string|null}
 */
function parseDistance(value) {
  const num = parseFloat(value);

  if (isNaN(num) || num <= 0) {
    return null;
  }

  // Format with 2 decimal places for consistency
  return num.toFixed(2);
}

/**
 * Parse a time value (handles MM:SS.ss or SS.ss formats)
 * @param {string} value
 * @returns {string|null}
 */
function parseTime(value) {
  // Check if it contains a colon (MM:SS format)
  if (value.includes(':')) {
    const parts = value.split(':');

    if (parts.length !== 2) {
      return null;
    }

    const minutes = parseInt(parts[0], 10);
    const seconds = parseFloat(parts[1]);

    if (isNaN(minutes) || isNaN(seconds) || minutes < 0 || seconds < 0 || seconds >= 60) {
      return null;
    }

    // Convert to total seconds
    const totalSeconds = minutes * 60 + seconds;

    // Format with 2 decimal places
    return totalSeconds.toFixed(2);
  }

  // Simple seconds format
  const num = parseFloat(value);

  if (isNaN(num) || num <= 0) {
    return null;
  }

  // Format with 2 decimal places
  return num.toFixed(2);
}

/**
 * Check if an event is a distance (field) event
 * @param {string} event
 * @returns {boolean}
 */
function isDistanceEvent(event) {
  const distanceEvents = ['LJ', 'TJ', 'SP', 'DT', 'HT', 'JT', 'PV', 'HJ'];

  // Check if event name contains any of the distance event codes
  return distanceEvents.some(code => event.toUpperCase().includes(code));
}

/**
 * Format a performance value for display
 * @param {string} performance - Performance value from data
 * @param {string} event - Event name
 * @returns {string} Formatted performance with units
 */
export function formatPerformance(performance, event) {
  if (!performance) {
    return '';
  }

  const isFieldEvent = isDistanceEvent(event);

  if (isFieldEvent) {
    // Distance - add 'm' suffix
    return `${performance}m`;
  } else {
    // Time - format as MM:SS.ss if >= 60 seconds, otherwise SS.ss
    const num = parseFloat(performance);

    if (isNaN(num)) {
      return performance;
    }

    if (num >= 60) {
      const minutes = Math.floor(num / 60);
      const seconds = num % 60;
      return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`;
    }

    return `${num.toFixed(2)}s`;
  }
}

/**
 * Get the unit for an event
 * @param {string} event
 * @returns {string}
 */
export function getEventUnit(event) {
  return isDistanceEvent(event) ? 'm' : 's';
}

/**
 * Validate if a performance is in valid range for an event
 * @param {string} performance
 * @param {string} event
 * @returns {boolean}
 */
export function isValidPerformance(performance, event) {
  const num = parseFloat(performance);

  if (isNaN(num) || num <= 0) {
    return false;
  }

  const isFieldEvent = isDistanceEvent(event);

  if (isFieldEvent) {
    // Distance events: reasonable range 0.01m to 100m
    return num >= 0.01 && num <= 100;
  } else {
    // Time events: reasonable range 0.01s to 7200s (2 hours)
    return num >= 0.01 && num <= 7200;
  }
}
