/**
 * Pace Calculation Engine
 * Core calculation logic for pace calculator
 */

import { convertDistance } from '../utils/pace-formatter.js';

/**
 * Get distance in metres from event configuration
 * @param {string} eventKey - Event key from config
 * @param {Object} eventsConfig - Events configuration object
 * @returns {number} Distance in metres
 */
export function getDistanceInMetres(eventKey, eventsConfig) {
  const event = eventsConfig.events[eventKey];
  if (!event) {
    throw new Error(`Event not found: ${eventKey}`);
  }

  const { distance, unit } = event;
  return convertDistance(distance, unit, 'metres');
}

/**
 * Calculate pace per unit distance
 * @param {number} distanceMetres - Total distance in metres
 * @param {number} totalTimeSeconds - Total time in seconds
 * @param {string} paceUnit - Unit for pace ('km', 'mile', '400m', '200m', or '100m')
 * @returns {number} Pace in seconds per unit
 */
export function calculatePace(distanceMetres, totalTimeSeconds, paceUnit) {
  if (distanceMetres <= 0 || totalTimeSeconds <= 0) {
    throw new Error('Distance and time must be greater than 0');
  }

  // Convert distance to the desired pace unit
  let targetUnit;
  if (paceUnit === 'mile') {
    targetUnit = 'miles';
  } else if (paceUnit === '400m' || paceUnit === '200m' || paceUnit === '100m') {
    targetUnit = 'm';
  } else {
    targetUnit = 'km';
  }

  const distanceInPaceUnit = convertDistance(distanceMetres, 'metres', targetUnit);

  // For specific metre pace units, divide by the unit distance
  let adjustedDistance = distanceInPaceUnit;
  if (paceUnit === '400m') {
    adjustedDistance = distanceInPaceUnit / 400;
  } else if (paceUnit === '200m') {
    adjustedDistance = distanceInPaceUnit / 200;
  } else if (paceUnit === '100m') {
    adjustedDistance = distanceInPaceUnit / 100;
  }

  // Calculate pace (seconds per unit)
  return totalTimeSeconds / adjustedDistance;
}

/**
 * Calculate total time from pace and distance
 * @param {number} distanceMetres - Total distance in metres
 * @param {number} paceSecondsPerUnit - Pace in seconds per unit
 * @param {string} paceUnit - Unit for pace ('km', 'mile', '400m', '200m', or '100m')
 * @returns {number} Total time in seconds
 */
export function calculateTotalTime(distanceMetres, paceSecondsPerUnit, paceUnit) {
  if (distanceMetres <= 0 || paceSecondsPerUnit <= 0) {
    throw new Error('Distance and pace must be greater than 0');
  }

  // Convert distance to the pace unit
  let targetUnit;
  if (paceUnit === 'mile') {
    targetUnit = 'miles';
  } else if (paceUnit === '400m' || paceUnit === '200m' || paceUnit === '100m') {
    targetUnit = 'm';
  } else {
    targetUnit = 'km';
  }

  const distanceInPaceUnit = convertDistance(distanceMetres, 'metres', targetUnit);

  // For specific metre pace units, divide by the unit distance
  let adjustedDistance = distanceInPaceUnit;
  if (paceUnit === '400m') {
    adjustedDistance = distanceInPaceUnit / 400;
  } else if (paceUnit === '200m') {
    adjustedDistance = distanceInPaceUnit / 200;
  } else if (paceUnit === '100m') {
    adjustedDistance = distanceInPaceUnit / 100;
  }

  // Calculate total time
  return paceSecondsPerUnit * adjustedDistance;
}

/**
 * Convert pace between different units
 * @param {number} paceSeconds - Pace in seconds
 * @param {string} fromUnit - Source unit ('km' or 'mile')
 * @param {string} toUnit - Target unit ('km' or 'mile')
 * @returns {number} Converted pace in seconds
 */
export function convertPaceUnit(paceSeconds, fromUnit, toUnit) {
  if (fromUnit === toUnit) {
    return paceSeconds;
  }

  // Convert km/mile ratio (1 mile = 1.609344 km)
  if (fromUnit === 'km' && toUnit === 'mile') {
    return paceSeconds * 1.609344;
  } else if (fromUnit === 'mile' && toUnit === 'km') {
    return paceSeconds / 1.609344;
  }

  return paceSeconds;
}

/**
 * Convert pace to speed (km/h or mph)
 * @param {number} paceSecondsPerUnit - Pace in seconds per unit
 * @param {string} paceUnit - Pace unit ('km' or 'mile')
 * @returns {Object} Object with km/h and mph values
 */
export function convertPaceToSpeed(paceSecondsPerUnit, paceUnit) {
  if (paceSecondsPerUnit <= 0) {
    return { kmh: 0, mph: 0 };
  }

  // Calculate speed in the pace unit per hour
  const unitsPerHour = 3600 / paceSecondsPerUnit;

  if (paceUnit === 'km') {
    return {
      kmh: unitsPerHour,
      mph: unitsPerHour * 0.621371
    };
  } else {
    return {
      kmh: unitsPerHour * 1.609344,
      mph: unitsPerHour
    };
  }
}

/**
 * Calculate intelligent splits based on distance
 * Returns split times at appropriate intervals
 * @param {number} distanceMetres - Total distance in metres
 * @param {number} paceSecondsPerKm - Pace in seconds per kilometre
 * @param {Object} eventConfig - Event configuration
 * @returns {Array} Array of split objects { distance, distanceLabel, time, pace }
 */
export function calculateSplits(distanceMetres, paceSecondsPerKm, eventConfig) {
  const splits = [];
  const distanceKm = distanceMetres / 1000;

  // Determine split interval based on total distance
  let splitInterval;
  if (distanceKm <= 5) {
    splitInterval = 1; // 1km splits for 5km and under
  } else if (distanceKm <= 15) {
    splitInterval = 5; // 5km splits for 10km-15km
  } else if (distanceKm <= 30) {
    splitInterval = 5; // 5km splits for HM, 20km, 25km, 30km
  } else {
    splitInterval = 10; // 10km splits for marathon and longer
  }

  // Generate splits at intervals
  let currentKm = splitInterval;
  while (currentKm < distanceKm) {
    const elapsedTime = paceSecondsPerKm * currentKm;
    splits.push({
      distance: currentKm * 1000,
      distanceLabel: `${currentKm}km`,
      time: elapsedTime,
      pace: paceSecondsPerKm
    });
    currentKm += splitInterval;
  }

  // Always add the final split (total distance)
  const totalTime = paceSecondsPerKm * distanceKm;
  splits.push({
    distance: distanceMetres,
    distanceLabel: eventConfig.displayName,
    time: totalTime,
    pace: paceSecondsPerKm,
    isFinal: true
  });

  return splits;
}

/**
 * Get equivalent pace in different format
 * @param {number} paceSecondsPerKm - Pace in seconds per kilometre
 * @returns {Object} Object with different pace formats
 */
export function getEquivalentPaces(paceSecondsPerKm) {
  const paceSecondsPerMile = convertPaceUnit(paceSecondsPerKm, 'km', 'mile');
  const speed = convertPaceToSpeed(paceSecondsPerKm, 'km');

  // Calculate pace per meter, yard, and foot
  const paceSecondsPerMeter = paceSecondsPerKm / 1000;
  const paceSecondsPerYard = paceSecondsPerMeter * 0.9144;
  const paceSecondsPerFoot = paceSecondsPerMeter * 0.3048;

  // Calculate meters per second and other speed measurements
  const metersPerSecond = 1000 / paceSecondsPerKm;
  const feetPerSecond = metersPerSecond * 3.28084;
  const yardsPerSecond = metersPerSecond / 0.9144;

  return {
    perKm: paceSecondsPerKm,
    perMile: paceSecondsPerMile,
    perMeter: paceSecondsPerMeter,
    perYard: paceSecondsPerYard,
    perFoot: paceSecondsPerFoot,
    kmh: speed.kmh,
    mph: speed.mph,
    metersPerSecond: metersPerSecond,
    feetPerSecond: feetPerSecond,
    yardsPerSecond: yardsPerSecond
  };
}

/**
 * Calculate speed from distance and time
 * @param {number} distanceMetres - Total distance in metres
 * @param {number} totalTimeSeconds - Total time in seconds
 * @param {string} speedUnit - Unit for speed ('kmh', 'mph', 'ms', 'fts', 'yds')
 * @returns {number} Speed in the specified unit
 */
export function calculateSpeed(distanceMetres, totalTimeSeconds, speedUnit) {
  if (distanceMetres <= 0 || totalTimeSeconds <= 0) {
    throw new Error('Distance and time must be greater than 0');
  }

  // Calculate metres per second
  const metresPerSecond = distanceMetres / totalTimeSeconds;

  // Convert to target unit
  const conversions = {
    'ms': 1,                    // m/s (base)
    'kmh': 3.6,                 // m/s * 3.6 = km/h
    'mph': 2.23694,             // m/s * 2.23694 = mph
    'fts': 3.28084,             // m/s * 3.28084 = ft/s
    'yds': 1.09361              // m/s * 1.09361 = yd/s
  };

  return metresPerSecond * (conversions[speedUnit] || 1);
}

/**
 * Calculate total time from distance and speed
 * @param {number} distanceMetres - Total distance in metres
 * @param {number} speed - Speed value
 * @param {string} speedUnit - Unit for speed ('kmh', 'mph', 'ms', 'fts', 'yds')
 * @returns {number} Total time in seconds
 */
export function calculateTotalTimeFromSpeed(distanceMetres, speed, speedUnit) {
  if (distanceMetres <= 0 || speed <= 0) {
    throw new Error('Distance and speed must be greater than 0');
  }

  // Convert speed to metres per second
  const conversions = {
    'ms': 1,                    // m/s (base)
    'kmh': 1 / 3.6,             // km/h → m/s
    'mph': 1 / 2.23694,         // mph → m/s
    'fts': 1 / 3.28084,         // ft/s → m/s
    'yds': 1 / 1.09361          // yd/s → m/s
  };

  const metresPerSecond = speed * (conversions[speedUnit] || 1);

  // Calculate time (distance / speed)
  return distanceMetres / metresPerSecond;
}

/**
 * Convert pace to speed
 * @param {number} paceSecondsPerKm - Pace in seconds per kilometre
 * @param {string} speedUnit - Target speed unit ('kmh', 'mph', 'ms', 'fts', 'yds')
 * @returns {number} Speed in target unit
 */
export function convertPaceToSpeedUnit(paceSecondsPerKm, speedUnit) {
  if (paceSecondsPerKm <= 0) {
    return 0;
  }

  // Speed in km/h = 3600 / (pace in seconds per km)
  const kmh = 3600 / paceSecondsPerKm;

  const conversions = {
    'kmh': 1,
    'mph': 0.621371,
    'ms': 1000 / 3600,           // km/h → m/s
    'fts': 3280.84 / 3600,       // km/h → ft/s
    'yds': 1093.61 / 3600        // km/h → yd/s
  };

  return kmh * (conversions[speedUnit] || 1);
}

/**
 * Convert speed to pace per km
 * @param {number} speed - Speed value
 * @param {string} speedUnit - Speed unit ('kmh', 'mph', 'ms', 'fts', 'yds')
 * @returns {number} Pace in seconds per kilometre
 */
export function convertSpeedToPace(speed, speedUnit) {
  if (speed <= 0) {
    return 0;
  }

  // Convert to km/h first
  const conversions = {
    'kmh': 1,
    'mph': 1.609344,
    'ms': 3.6,
    'fts': 1.09728,
    'yds': 3.28084
  };

  const kmh = speed * (conversions[speedUnit] || 1);

  // Pace per km = 3600 / km/h
  return 3600 / kmh;
}

/**
 * Get split interval for speed unit
 * @param {string} speedUnit - Speed unit ('kmh', 'mph', 'ms', 'fts', 'yds')
 * @returns {Object} Object with interval in metres and display info
 */
export function getSpeedUnitSplitInterval(speedUnit) {
  const intervals = {
    'kmh': { metres: 1000, value: 1, unit: 'km' },
    'mph': { metres: 1609.344, value: 1, unit: 'miles' },
    'ms': { metres: 1, value: 1, unit: 'm' },
    'fts': { metres: 0.3048, value: 1, unit: 'feet' },
    'yds': { metres: 0.9144, value: 1, unit: 'yards' }
  };

  return intervals[speedUnit] || intervals['kmh'];
}

/**
 * Calculate smart split times with automatic interval adjustment
 * Multiplies interval by 10 until number of splits < 100
 * @param {number} distanceMetres - Total distance in metres
 * @param {number} pacePerKm - Pace in seconds per km
 * @param {Object} eventConfig - Event configuration
 * @param {number} initialSplitIntervalMetres - Initial split interval in metres
 * @param {Object} splitIntervalInfo - Split interval display info { metres, value, unit }
 * @returns {Array} Array of split objects
 */
export function calculateSmartSplits(distanceMetres, pacePerKm, eventConfig, initialSplitIntervalMetres, splitIntervalInfo) {
  let splitIntervalMetres = initialSplitIntervalMetres;
  let adjustedIntervalInfo = { ...splitIntervalInfo };

  // Calculate how many splits we'd get with this interval
  let numSplits = Math.floor(distanceMetres / splitIntervalMetres);

  // Keep multiplying interval by 10 until we have < 100 splits
  let multiplier = 1;
  while (numSplits >= 100) {
    multiplier *= 10;
    splitIntervalMetres *= 10;
    adjustedIntervalInfo.value *= 10;
    numSplits = Math.floor(distanceMetres / splitIntervalMetres);
  }

  // If we made adjustments, log for debugging
  if (multiplier > 1) {
    console.log(`Adjusted split interval from ${initialSplitIntervalMetres}m to ${splitIntervalMetres}m (×${multiplier}) to keep splits < 100`);
  }

  // Generate splits
  const splits = [];
  let currentDistanceMetres = 0;
  let previousDistanceMetres = 0;
  let previousTime = 0;

  while (currentDistanceMetres < distanceMetres) {
    currentDistanceMetres += splitIntervalMetres;

    // Don't exceed total distance
    if (currentDistanceMetres > distanceMetres) {
      currentDistanceMetres = distanceMetres;
    }

    // Calculate cumulative time for this split
    const cumulativeTime = (currentDistanceMetres / 1000) * pacePerKm;

    // Calculate split distance and split time (delta from previous)
    const splitDistanceMetres = currentDistanceMetres - previousDistanceMetres;
    const splitTime = cumulativeTime - previousTime;

    // Format cumulative distance label
    const distanceInIntervalUnits = currentDistanceMetres / splitIntervalMetres * adjustedIntervalInfo.value;
    const formattedValue = parseFloat(distanceInIntervalUnits.toFixed(2));

    // Use formatDistanceWithUnit from pace-formatter.js (imported at top)
    const distanceLabel = `${formattedValue}${adjustedIntervalInfo.unit}`;

    // Format split distance label
    const splitDistanceInIntervalUnits = splitDistanceMetres / splitIntervalMetres * adjustedIntervalInfo.value;
    const splitFormattedValue = parseFloat(splitDistanceInIntervalUnits.toFixed(2));
    const splitDistanceLabel = `${splitFormattedValue}${adjustedIntervalInfo.unit}`;

    splits.push({
      distanceLabel,
      splitDistanceLabel,
      splitTime,
      time: cumulativeTime
    });

    // Update previous values for next iteration
    previousDistanceMetres = currentDistanceMetres;
    previousTime = cumulativeTime;
  }

  return splits;
}
