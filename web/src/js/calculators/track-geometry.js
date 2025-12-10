/**
 * Track Geometry Calculator
 * Handles position-to-coordinate conversion and distance calculations
 */

import {
  TRACK_400M,
  SVG_CONFIG,
  getLaneRadius,
  getLaneCurveLength
} from '../data/track-constants.js';

/**
 * Track section enumeration
 */
export const TRACK_SECTION = {
  HOME_STRAIGHT: 'home_straight',     // 0 to straightLength (finish line side)
  FIRST_CURVE: 'first_curve',         // After home straight
  BACK_STRAIGHT: 'back_straight',     // Top of track
  SECOND_CURVE: 'second_curve'        // Returns to finish
};

/**
 * Get which section of track a position is in
 * @param {number} position - Position in meters from finish (0-400)
 * @param {number} lane - Lane number (1-9)
 * @param {Object} trackConfig - Track configuration
 * @returns {Object} Section info { section, positionInSection, sectionLength }
 */
export function getTrackSection(position, lane = 1, trackConfig = TRACK_400M) {
  const normalizedPos = ((position % 400) + 400) % 400;
  const straightLen = trackConfig.straightLength;
  const curveLen = getLaneCurveLength(lane, trackConfig);

  // Section boundaries
  const homeStraightEnd = straightLen;
  const firstCurveEnd = straightLen + curveLen;
  const backStraightEnd = firstCurveEnd + straightLen;
  const secondCurveEnd = backStraightEnd + curveLen; // Should be ~400

  if (normalizedPos < homeStraightEnd) {
    return {
      section: TRACK_SECTION.HOME_STRAIGHT,
      positionInSection: normalizedPos,
      sectionLength: straightLen
    };
  } else if (normalizedPos < firstCurveEnd) {
    return {
      section: TRACK_SECTION.FIRST_CURVE,
      positionInSection: normalizedPos - homeStraightEnd,
      sectionLength: curveLen
    };
  } else if (normalizedPos < backStraightEnd) {
    return {
      section: TRACK_SECTION.BACK_STRAIGHT,
      positionInSection: normalizedPos - firstCurveEnd,
      sectionLength: straightLen
    };
  } else {
    return {
      section: TRACK_SECTION.SECOND_CURVE,
      positionInSection: normalizedPos - backStraightEnd,
      sectionLength: curveLen
    };
  }
}

/**
 * Convert track position to SVG coordinates
 * Track orientation:
 * - Finish line on right side of bottom straight
 * - Running counter-clockwise
 * - Home straight at bottom, back straight at top
 *
 * @param {number} position - Position in meters from finish (0-400)
 * @param {number} lane - Lane number (1-9)
 * @param {Object} trackConfig - Track configuration
 * @returns {Object} SVG coordinates { x, y, angle }
 */
export function positionToCoordinates(position, lane = 1, trackConfig = TRACK_400M) {
  const scale = SVG_CONFIG.scale;
  const offsetX = SVG_CONFIG.trackOffsetX;
  const offsetY = SVG_CONFIG.trackOffsetY;

  const normalizedPos = ((position % 400) + 400) % 400;
  const laneRadius = getLaneRadius(lane, trackConfig);
  const straightLen = trackConfig.straightLength;
  const curveLen = getLaneCurveLength(lane, trackConfig);

  // Lane offset from center (for rendering width of lanes)
  const laneOffset = (lane - 1) * trackConfig.laneWidth;

  // Center of the track curves
  const leftCurveCenter = {
    x: offsetX + straightLen * scale,
    y: offsetY + laneRadius * scale
  };
  const rightCurveCenter = {
    x: offsetX,
    y: offsetY + laneRadius * scale
  };

  // Get section and position within section
  const sectionInfo = getTrackSection(normalizedPos, lane, trackConfig);

  let x, y, angle;

  switch (sectionInfo.section) {
    case TRACK_SECTION.HOME_STRAIGHT:
      // Bottom straight, running left to right (finish on right)
      x = offsetX + (straightLen - sectionInfo.positionInSection) * scale;
      y = offsetY + (laneRadius * 2 + laneOffset) * scale;
      angle = 0; // Pointing right
      break;

    case TRACK_SECTION.FIRST_CURVE:
      // Left curve (bottom-left), running counter-clockwise (upward)
      const angle1 = Math.PI - (sectionInfo.positionInSection / curveLen) * Math.PI;
      x = rightCurveCenter.x + Math.cos(angle1) * (laneRadius + laneOffset) * scale;
      y = rightCurveCenter.y - Math.sin(angle1) * (laneRadius + laneOffset) * scale;
      angle = angle1 - Math.PI / 2; // Tangent angle
      break;

    case TRACK_SECTION.BACK_STRAIGHT:
      // Top straight, running right to left
      x = offsetX + sectionInfo.positionInSection * scale;
      y = offsetY + laneOffset * scale;
      angle = Math.PI; // Pointing left
      break;

    case TRACK_SECTION.SECOND_CURVE:
      // Right curve (top-right), running counter-clockwise (downward)
      const angle2 = (sectionInfo.positionInSection / curveLen) * Math.PI;
      x = leftCurveCenter.x + Math.cos(angle2) * (laneRadius + laneOffset) * scale;
      y = leftCurveCenter.y - Math.sin(angle2) * (laneRadius + laneOffset) * scale;
      angle = angle2 + Math.PI / 2; // Tangent angle
      break;
  }

  return { x, y, angle };
}

/**
 * Calculate running distance between two positions on the track
 * Running counter-clockwise (normal race direction)
 *
 * @param {number} startPos - Start position (meters from finish)
 * @param {number} endPos - End position (meters from finish)
 * @param {number} lane - Lane number (1-9)
 * @param {Object} trackConfig - Track configuration
 * @returns {number} Running distance in meters
 */
export function calculateRunningDistance(startPos, endPos, lane = 1, trackConfig = TRACK_400M) {
  const lapDistance = getLapDistanceForLane(lane, trackConfig);

  // Normalize positions
  const normalizedStart = ((startPos % lapDistance) + lapDistance) % lapDistance;
  const normalizedEnd = ((endPos % lapDistance) + lapDistance) % lapDistance;

  // Counter-clockwise: end should be "before" start in terms of position
  // If running from 300m mark to 100m mark, we run 200m (not -200m or 300m)
  let distance;
  if (normalizedEnd <= normalizedStart) {
    // Simple case: end is at a lower position number
    distance = normalizedStart - normalizedEnd;
  } else {
    // Wrapping case: run past finish line
    distance = normalizedStart + (lapDistance - normalizedEnd);
  }

  return distance;
}

/**
 * Calculate running distance between two markings
 * Handles cross-lane calculations
 *
 * @param {Object} startMarking - Start marking object
 * @param {Object} endMarking - End marking object
 * @param {Object} trackConfig - Track configuration
 * @returns {number} Running distance in meters
 */
export function calculateMarkingDistance(startMarking, endMarking, trackConfig = TRACK_400M) {
  const startLane = startMarking.lane || 1;
  const endLane = endMarking.lane || 1;

  if (startLane === endLane || startLane === 0 || endLane === 0) {
    // Same lane or all-lanes marking: simple calculation
    const lane = startLane || endLane || 1;
    return calculateRunningDistance(startMarking.position, endMarking.position, lane, trackConfig);
  }

  // Cross-lane calculation
  // This calculates the distance if running from a marking in one lane
  // to a marking in another lane (e.g., for training reps)
  // We calculate based on the runner staying in the end lane
  return calculateCrossLaneDistance(startMarking, endMarking, trackConfig);
}

/**
 * Calculate cross-lane distance
 * Distance from a marking in one lane to a marking in another lane
 * Assumes runner runs in the end marking's lane
 *
 * @param {Object} startMarking - Start marking
 * @param {Object} endMarking - End marking
 * @param {Object} trackConfig - Track configuration
 * @returns {number} Distance in meters
 */
function calculateCrossLaneDistance(startMarking, endMarking, trackConfig = TRACK_400M) {
  const startLane = startMarking.lane || 1;
  const endLane = endMarking.lane || 1;

  // Calculate positions relative to lane 1 equivalent
  const startLaneRadius = getLaneRadius(startLane, trackConfig);
  const endLaneRadius = getLaneRadius(endLane, trackConfig);

  // Get start position in terms of the end lane
  // We need to find where on the end lane corresponds to the start marking's position

  const startSectionInfo = getTrackSection(startMarking.position, startLane, trackConfig);

  // If on a curve, adjust position for lane difference
  let adjustedStartPos = startMarking.position;

  if (startSectionInfo.section === TRACK_SECTION.FIRST_CURVE ||
      startSectionInfo.section === TRACK_SECTION.SECOND_CURVE) {
    // On curves, outer lanes cover more distance
    // Adjust the position proportionally
    const startCurveLen = getLaneCurveLength(startLane, trackConfig);
    const endCurveLen = getLaneCurveLength(endLane, trackConfig);
    const proportionInCurve = startSectionInfo.positionInSection / startCurveLen;

    // Recalculate position based on end lane's curve length
    const straightsBefore = startSectionInfo.section === TRACK_SECTION.FIRST_CURVE
      ? trackConfig.straightLength
      : trackConfig.straightLength * 2 + getLaneCurveLength(endLane, trackConfig);

    adjustedStartPos = straightsBefore + proportionInCurve * endCurveLen;
  }

  // Now calculate distance in the end lane
  return calculateRunningDistance(adjustedStartPos, endMarking.position, endLane, trackConfig);
}

/**
 * Get total lap distance for a specific lane
 * @param {number} lane - Lane number (1-9)
 * @param {Object} trackConfig - Track configuration
 * @returns {number} Lap distance in meters
 */
export function getLapDistanceForLane(lane, trackConfig = TRACK_400M) {
  if (lane === 1 || lane === 0) {
    return trackConfig.lapDistance;
  }

  const curveLen = getLaneCurveLength(lane, trackConfig);
  return (curveLen * 2) + (trackConfig.straightLength * 2);
}

/**
 * Generate SVG path for the track outline
 * @param {number} lane - Lane number (1-9)
 * @param {Object} trackConfig - Track configuration
 * @returns {string} SVG path data
 */
export function generateLanePath(lane, trackConfig = TRACK_400M) {
  const scale = SVG_CONFIG.scale;
  const offsetX = SVG_CONFIG.trackOffsetX;
  const offsetY = SVG_CONFIG.trackOffsetY;

  const laneRadius = getLaneRadius(lane, trackConfig);
  const straightLen = trackConfig.straightLength;
  const laneOffset = (lane - 1) * trackConfig.laneWidth;
  const r = (laneRadius + laneOffset) * scale;

  // Build path: start at bottom-left of home straight
  // Move counter-clockwise around the track
  const pathParts = [
    // Start at bottom-left (end of home straight)
    `M ${offsetX} ${offsetY + r + laneRadius * scale}`,

    // Home straight (bottom) - moving right
    `L ${offsetX + straightLen * scale} ${offsetY + r + laneRadius * scale}`,

    // First curve (right semicircle) - going up
    `A ${r} ${r} 0 0 0 ${offsetX + straightLen * scale} ${offsetY + laneRadius * scale - r + laneRadius * scale}`,

    // Back straight (top) - moving left
    `L ${offsetX} ${offsetY + laneRadius * scale - r + laneRadius * scale}`,

    // Second curve (left semicircle) - going down
    `A ${r} ${r} 0 0 0 ${offsetX} ${offsetY + r + laneRadius * scale}`,

    'Z' // Close path
  ];

  return pathParts.join(' ');
}

/**
 * Generate SVG path for a route between two markings
 * @param {Object} startMarking - Start marking
 * @param {Object} endMarking - End marking
 * @param {Object} trackConfig - Track configuration
 * @returns {string} SVG path data
 */
export function generateRoutePath(startMarking, endMarking, trackConfig = TRACK_400M) {
  const lane = endMarking.lane || startMarking.lane || 1;
  const startCoords = positionToCoordinates(startMarking.position, lane, trackConfig);
  const endCoords = positionToCoordinates(endMarking.position, lane, trackConfig);

  // For simplicity, generate path points along the route
  const distance = calculateMarkingDistance(startMarking, endMarking, trackConfig);
  const numPoints = Math.max(20, Math.ceil(distance / 5)); // At least 20 points, or 1 per 5m

  const pathPoints = [];
  for (let i = 0; i <= numPoints; i++) {
    const progress = i / numPoints;
    const pos = startMarking.position - progress * distance;
    const normalizedPos = ((pos % 400) + 400) % 400;
    const coords = positionToCoordinates(normalizedPos, lane, trackConfig);
    pathPoints.push(`${i === 0 ? 'M' : 'L'} ${coords.x.toFixed(2)} ${coords.y.toFixed(2)}`);
  }

  return pathPoints.join(' ');
}

/**
 * Check if a position is on a straight section
 * @param {number} position - Position in meters from finish
 * @param {number} lane - Lane number
 * @param {Object} trackConfig - Track configuration
 * @returns {boolean}
 */
export function isOnStraight(position, lane = 1, trackConfig = TRACK_400M) {
  const section = getTrackSection(position, lane, trackConfig);
  return section.section === TRACK_SECTION.HOME_STRAIGHT ||
         section.section === TRACK_SECTION.BACK_STRAIGHT;
}

/**
 * Check if a position is on a curve section
 * @param {number} position - Position in meters from finish
 * @param {number} lane - Lane number
 * @param {Object} trackConfig - Track configuration
 * @returns {boolean}
 */
export function isOnCurve(position, lane = 1, trackConfig = TRACK_400M) {
  return !isOnStraight(position, lane, trackConfig);
}

export default {
  TRACK_SECTION,
  getTrackSection,
  positionToCoordinates,
  calculateRunningDistance,
  calculateMarkingDistance,
  getLapDistanceForLane,
  generateLanePath,
  generateRoutePath,
  isOnStraight,
  isOnCurve
};
