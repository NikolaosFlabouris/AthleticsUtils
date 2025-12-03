/**
 * Pace Formatter Utility
 * Handles parsing and formatting of pace-related values for the pace calculator
 */

/**
 * Format sub-60 second times with decimal precision
 * @param {number} seconds - Time in seconds (must be < 60)
 * @returns {string} Formatted time (e.g., "45.5 sec", "59.99 sec", "0.01 sec")
 * @private
 */
function formatSubMinuteTime(seconds) {
  // Round to 2 decimal places
  const rounded = Math.round(seconds * 100) / 100;

  // If rounding pushes to 60+, format as MM:SS instead
  if (rounded >= 60) {
    const minutes = Math.floor(rounded / 60);
    const secs = Math.round(rounded % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  // Format with up to 2 decimal places, removing trailing zeros
  let formatted = rounded.toFixed(2);

  // Remove all trailing zeros and decimal point if whole number
  formatted = formatted.replace(/\.?0+$/, '');

  return formatted + 's';
}

/**
 * Format pace time from seconds to MM:SS or HH:MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted pace time (e.g., "5:00", "12:34", "2:00:00")
 */
export function formatPaceTime(seconds) {
  if (seconds == null || isNaN(seconds) || seconds < 0) {
    return '';
  }

  // Handle sub-60 second times with decimal precision
  if (seconds < 60) {
    return formatSubMinuteTime(seconds);
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
 * Parse user pace input (MM:SS format or plain seconds) to seconds
 * @param {string} input - User input string
 * @returns {number|null} Pace in seconds, or null if invalid
 */
export function parsePaceInput(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // Remove whitespace
  const trimmed = input.trim();

  // Try to match plain seconds first (e.g., "30" or "45")
  const secondsMatch = trimmed.match(/^\d+$/);
  if (secondsMatch) {
    const seconds = parseInt(trimmed, 10);
    if (seconds > 0) {
      return seconds;
    }
  }

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

  // Handle sub-60 second times with decimal precision
  if (seconds < 60) {
    return formatSubMinuteTime(seconds);
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
 * Get singular or plural form of unit based on value
 * @param {number} value - Numeric value
 * @param {string} unit - Unit name (e.g., 'miles', 'feet', 'yards', 'km', 'm')
 * @returns {string} Appropriate unit form
 */
export function getSingularPluralUnit(value, unit) {
  // Metric abbreviations don't change
  if (unit === 'km' || unit === 'm') {
    return unit;
  }

  // For imperial units, use singular when value is exactly 1
  if (value === 1) {
    const singularMap = {
      'miles': 'mile',
      'feet': 'foot',
      'yards': 'yard'
    };
    return singularMap[unit] || unit;
  }

  return unit;
}

/**
 * Determine if spacing is needed between value and unit
 * @param {string} unit - Unit name
 * @returns {boolean} True if space should be added
 */
export function needsSpacing(unit) {
  // Imperial words need spacing
  const imperialWords = ['miles', 'mile', 'feet', 'foot', 'yards', 'yard'];
  return imperialWords.includes(unit);
}

/**
 * Format pace interval for display
 * @param {number} value - Interval value
 * @param {string} unit - Unit name
 * @returns {string} Formatted pace interval (e.g., "/km", "/1.5 miles", "/foot")
 */
export function formatPaceInterval(value, unit) {
  // Get appropriate singular/plural form
  const displayUnit = getSingularPluralUnit(value, unit);

  // If value is exactly 1, omit it
  if (value === 1) {
    return `/${displayUnit}`;
  }

  // Otherwise show value with appropriate spacing
  const spacing = needsSpacing(displayUnit) ? ' ' : '';
  return `/${value}${spacing}${displayUnit}`;
}

/**
 * Format distance with unit
 * @param {number} value - Distance value
 * @param {string} unit - Unit name
 * @returns {string} Formatted distance (e.g., "5km", "1 mile", "0.5 feet")
 */
export function formatDistanceWithUnit(value, unit) {
  // Get appropriate singular/plural form
  const displayUnit = getSingularPluralUnit(value, unit);

  // Determine spacing
  const spacing = needsSpacing(displayUnit) ? ' ' : '';

  return `${value}${spacing}${displayUnit}`;
}

/**
 * Format distance with unit (for display with decimal formatting)
 * @param {number} value - Distance value
 * @param {string} unit - Unit ('km', 'miles', or 'metres')
 * @returns {string} Formatted distance (e.g., "5km", "3.1 miles", "5000m")
 */
export function formatDistance(value, unit) {
  if (value == null || isNaN(value)) {
    return '';
  }

  // Get appropriate singular/plural form based on value
  const displayUnit = getSingularPluralUnit(value, unit);

  // Determine spacing based on unit type
  const spacing = needsSpacing(displayUnit) ? ' ' : '';

  // Format value based on unit type
  let formattedValue;

  if (unit === 'km' || unit === 'miles' || unit === 'mile') {
    // For kilometres and miles, show up to 4 decimal places if needed
    formattedValue = value.toFixed(4).replace(/\.?0+$/, '');
  } else if (unit === 'yards' || unit === 'yard' || unit === 'feet' || unit === 'foot') {
    // For yards and feet, show up to 2 decimal places if needed
    formattedValue = value.toFixed(2).replace(/\.?0+$/, '');
  } else {
    // For metres, show whole numbers
    formattedValue = Math.round(value);
  }

  return `${formattedValue}${spacing}${displayUnit}`;
}

/**
 * Get distance equivalent in different unit
 * Converts between km, miles, metres, yards, and feet
 * @param {number} distance - Distance value
 * @param {string} fromUnit - Source unit ('km', 'miles', 'metres', 'm', 'yards', 'feet')
 * @param {string} toUnit - Target unit ('km', 'miles', 'metres', 'm', 'yards', 'feet')
 * @returns {number} Converted distance
 */
export function convertDistance(distance, fromUnit, toUnit) {
  if (distance == null || isNaN(distance)) {
    return 0;
  }

  if (fromUnit === toUnit) {
    return distance;
  }

  // Normalize unit names
  const normalizeUnit = (unit) => {
    if (unit === 'metres') return 'm';
    return unit;
  };

  fromUnit = normalizeUnit(fromUnit);
  toUnit = normalizeUnit(toUnit);

  // Conversion factors to metres
  const toMetres = {
    'm': 1,
    'km': 1000,
    'miles': 1609.344,
    'yards': 0.9144,
    'feet': 0.3048
  };

  // Convert to metres first, then to target unit
  const metres = distance * (toMetres[fromUnit] || 1);
  return metres / (toMetres[toUnit] || 1);
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

/**
 * Parse speed input
 * @param {string} input - Speed input (e.g., "12.5", "15")
 * @returns {number|null} Speed as number, or null if invalid
 */
export function parseSpeedInput(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();
  const speed = parseFloat(trimmed);

  if (isNaN(speed) || speed <= 0) {
    return null;
  }

  return speed;
}

/**
 * Format speed with appropriate precision
 * @param {number} speed - Speed value
 * @param {string} unit - Speed unit ('kmh', 'mph', 'ms', 'fts', 'yds')
 * @returns {string} Formatted speed
 */
export function formatSpeedValue(speed, unit) {
  if (speed == null || isNaN(speed)) {
    return '';
  }

  // Different units need different precision
  const precision = {
    'kmh': 1,  // km/h: 1 decimal place (12.5 km/h)
    'mph': 1,  // mph: 1 decimal place (7.8 mph)
    'ms': 2,   // m/s: 2 decimal places (3.47 m/s)
    'fts': 2,  // ft/s: 2 decimal places (11.38 ft/s)
    'yds': 2   // yd/s: 2 decimal places (3.79 yd/s)
  };

  const decimals = precision[unit] || 1;
  return speed.toFixed(decimals);
}

/**
 * Get speed unit display name
 * @param {string} unit - Speed unit code
 * @returns {string} Display name
 */
export function getSpeedUnitDisplay(unit) {
  const displays = {
    'kmh': 'km/h',
    'mph': 'mph',
    'ms': 'm/s',
    'fts': 'ft/s',
    'yds': 'yd/s'
  };
  return displays[unit] || unit;
}

/**
 * Format speed with unit for display
 * @param {number} speed - Speed value
 * @param {string} unit - Speed unit
 * @returns {string} Formatted speed with unit (e.g., "12.5 km/h")
 */
export function formatSpeedWithUnit(speed, unit) {
  const formattedValue = formatSpeedValue(speed, unit);
  const displayUnit = getSpeedUnitDisplay(unit);
  return `${formattedValue} ${displayUnit}`;
}

/**
 * Get placeholder for speed input
 * @param {string} unit - Speed unit
 * @returns {string} Placeholder text
 */
export function getSpeedPlaceholder(unit) {
  const examples = {
    'kmh': 'e.g., 12.5',
    'mph': 'e.g., 7.8',
    'ms': 'e.g., 3.47',
    'fts': 'e.g., 11.38',
    'yds': 'e.g., 3.79'
  };
  return examples[unit] || 'e.g., 12.5';
}
