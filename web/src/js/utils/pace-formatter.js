/**
 * Pace Formatter Utility
 * Handles parsing and formatting of pace-related values for the pace calculator
 */

/**
 * Format pace time from seconds to MM:SS or HH:MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted pace time (e.g., "5:00", "12:34", "2:00:00")
 */
export function formatPaceTime(seconds) {
  if (seconds == null || isNaN(seconds) || seconds < 0) {
    return '';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * Format speed value with unit
 * @param {number} value - Speed value
 * @param {string} unit - Unit ('km/h' or 'mph')
 * @returns {string} Formatted speed (e.g., "12.0 km/h", "7.5 mph")
 */
export function formatSpeed(value, unit) {
  if (value == null || isNaN(value)) {
    return '';
  }

  return `${value.toFixed(1)} ${unit}`;
}

/**
 * Parse user pace input (MM:SS format) to seconds
 * @param {string} input - User input string
 * @returns {number|null} Pace in seconds, or null if invalid
 */
export function parsePaceInput(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // Remove whitespace
  const trimmed = input.trim();

  // Try to match MM:SS or M:SS format
  const paceMatch = trimmed.match(/^(\d+):([0-5]?\d)$/);
  if (paceMatch) {
    const minutes = parseInt(paceMatch[1], 10);
    const seconds = parseInt(paceMatch[2], 10);
    return minutes * 60 + seconds;
  }

  return null;
}

/**
 * Parse time input (supports (HH):(MM):SS.(SS) format) to seconds
 * @param {string} input - User input string
 * @returns {number|null} Time in seconds, or null if invalid
 */
export function parseTimeInput(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // Remove whitespace and common units
  let trimmed = input.trim()
    .replace(/\s*(h|hr|hrs|hours?|m|min|mins|minutes?|s|sec|secs|seconds?)\s*/gi, '')
    .trim();

  // Handle different time formats
  // Format: H:MM:SS or H:MM:SS.SS (hours)
  let match = trimmed.match(/^(\d+):([0-5]?\d):([0-5]?\d)(?:\.(\d{1,2}))?$/);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);
    const decimal = match[4] ? parseInt(match[4].padEnd(2, '0'), 10) / 100 : 0;
    return hours * 3600 + minutes * 60 + seconds + decimal;
  }

  // Format: MM:SS or MM:SS.SS (minutes)
  match = trimmed.match(/^(\d+):([0-5]?\d)(?:\.(\d{1,2}))?$/);
  if (match) {
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    const decimal = match[3] ? parseInt(match[3].padEnd(2, '0'), 10) / 100 : 0;
    return minutes * 60 + seconds + decimal;
  }

  // Format: SS or SS.SS (seconds only)
  match = trimmed.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (match) {
    const seconds = parseInt(match[1], 10);
    const decimal = match[2] ? parseInt(match[2].padEnd(2, '0'), 10) / 100 : 0;
    return seconds + decimal;
  }

  return null;
}

/**
 * Format total time from seconds to readable format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time (e.g., "25:00", "1:23:45")
 */
export function formatTotalTime(seconds) {
  if (seconds == null || isNaN(seconds) || seconds < 0) {
    return '';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * Format distance with unit
 * @param {number} value - Distance value
 * @param {string} unit - Unit ('km', 'miles', or 'metres')
 * @returns {string} Formatted distance (e.g., "5 km", "3.1 miles", "5000 m")
 */
export function formatDistance(value, unit) {
  if (value == null || isNaN(value)) {
    return '';
  }

  // For kilometres and miles, show up to 4 decimal places if needed
  if (unit === 'km' || unit === 'miles') {
    // Remove trailing zeros
    const formatted = value.toFixed(4).replace(/\.?0+$/, '');
    return `${formatted} ${unit}`;
  }

  // For metres, show whole numbers
  return `${Math.round(value)} ${unit}`;
}

/**
 * Get distance equivalent in different unit
 * Converts between km, miles, and metres
 * @param {number} distance - Distance value
 * @param {string} fromUnit - Source unit ('km', 'miles', or 'metres')
 * @param {string} toUnit - Target unit ('km', 'miles', or 'metres')
 * @returns {number} Converted distance
 */
export function convertDistance(distance, fromUnit, toUnit) {
  if (distance == null || isNaN(distance)) {
    return 0;
  }

  if (fromUnit === toUnit) {
    return distance;
  }

  // Convert to metres first
  let metres;
  if (fromUnit === 'km') {
    metres = distance * 1000;
  } else if (fromUnit === 'miles') {
    metres = distance * 1609.344;
  } else {
    metres = distance;
  }

  // Convert from metres to target unit
  if (toUnit === 'km') {
    return metres / 1000;
  } else if (toUnit === 'miles') {
    return metres / 1609.344;
  } else {
    return metres;
  }
}

/**
 * Get placeholder text for time input
 * @returns {string} Placeholder text
 */
export function getTimePlaceholder() {
  return 'e.g., 25:00 or 1:23:45';
}

/**
 * Get placeholder text for pace input
 * @returns {string} Placeholder text
 */
export function getPacePlaceholder() {
  return 'e.g., 5:00 or 4:30';
}
