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
 * @param {string} paceUnit - Unit for pace ('km', 'mile', or '400m')
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
  } else if (paceUnit === '400m') {
    targetUnit = 'm';
  } else {
    targetUnit = 'km';
  }

  const distanceInPaceUnit = convertDistance(distanceMetres, 'metres', targetUnit);

  // For 400m pace, divide by 400 (since we converted to metres)
  const divisor = paceUnit === '400m' ? 400 : 1;
  const adjustedDistance = paceUnit === '400m' ? distanceInPaceUnit / 400 : distanceInPaceUnit;

  // Calculate pace (seconds per unit)
  return totalTimeSeconds / adjustedDistance;
}

/**
 * Calculate total time from pace and distance
 * @param {number} distanceMetres - Total distance in metres
 * @param {number} paceSecondsPerUnit - Pace in seconds per unit
 * @param {string} paceUnit - Unit for pace ('km', 'mile', or '400m')
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
  } else if (paceUnit === '400m') {
    targetUnit = 'm';
  } else {
    targetUnit = 'km';
  }

  const distanceInPaceUnit = convertDistance(distanceMetres, 'metres', targetUnit);

  // For 400m pace, divide by 400 (since we converted to metres)
  const adjustedDistance = paceUnit === '400m' ? distanceInPaceUnit / 400 : distanceInPaceUnit;

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
