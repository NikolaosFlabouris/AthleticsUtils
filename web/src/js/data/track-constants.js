/**
 * Track Constants
 * Based on World Athletics Track and Field Facilities Manual
 * All measurements in meters unless otherwise specified
 */

// Standard 400m outdoor track dimensions
export const TRACK_400M = {
  // Track geometry
  straightLength: 84.39,           // Length of each straight section
  curveRadius: 36.50,              // Radius to inner edge of lane 1
  laneWidth: 1.22,                 // Standard lane width
  numLanes: 9,                     // Number of lanes

  // Measurement line offset from inner edge
  measurementOffset: 0.20,         // Lane 1 measured 20cm from inner edge
  measurementOffsetOuter: 0.20,    // Lanes 2+ measured 20cm from inner lane line

  // Lane 1 running radius (inner edge + measurement offset)
  lane1RunningRadius: 36.70,       // 36.50 + 0.20

  // Total lap distance
  lapDistance: 400,

  // Calculated values
  get curveLength() {
    // Semi-circle arc length for lane 1: π * radius
    return Math.PI * this.lane1RunningRadius;
  },

  get totalStraightLength() {
    return this.straightLength * 2;
  }
};

// Future: 200m indoor track (placeholder for extensibility)
export const TRACK_200M = {
  straightLength: 35.0,
  curveRadius: 17.5,
  laneWidth: 1.22,
  numLanes: 6,
  measurementOffset: 0.20,
  lane1RunningRadius: 17.70,
  lapDistance: 200
};

/**
 * Calculate the running radius for a given lane
 * @param {number} lane - Lane number (1-9)
 * @param {Object} trackConfig - Track configuration (default: TRACK_400M)
 * @returns {number} Running radius in meters
 */
export function getLaneRadius(lane, trackConfig = TRACK_400M) {
  if (lane === 1) {
    return trackConfig.lane1RunningRadius;
  }
  // For lanes 2+: inner edge radius + (lane-1) * laneWidth + measurementOffset
  return trackConfig.curveRadius + (lane - 1) * trackConfig.laneWidth + trackConfig.measurementOffsetOuter;
}

/**
 * Calculate the curve length for a given lane
 * @param {number} lane - Lane number (1-9)
 * @param {Object} trackConfig - Track configuration
 * @returns {number} Semi-circle arc length in meters
 */
export function getLaneCurveLength(lane, trackConfig = TRACK_400M) {
  return Math.PI * getLaneRadius(lane, trackConfig);
}

/**
 * Calculate the full lap distance for a given lane
 * @param {number} lane - Lane number (1-9)
 * @param {Object} trackConfig - Track configuration
 * @returns {number} Full lap distance in meters
 */
export function getLaneFullLapDistance(lane, trackConfig = TRACK_400M) {
  const curveLength = getLaneCurveLength(lane, trackConfig);
  return (curveLength * 2) + (trackConfig.straightLength * 2);
}

/**
 * Calculate stagger (head start) for a given lane relative to lane 1
 * @param {number} lane - Lane number (1-9)
 * @param {number} raceCurves - Number of curves in the race (1 for 200m, 2 for 400m, etc.)
 * @param {Object} trackConfig - Track configuration
 * @returns {number} Stagger distance in meters
 */
export function getLaneStagger(lane, raceCurves, trackConfig = TRACK_400M) {
  if (lane === 1) return 0;

  const lane1CurveLength = getLaneCurveLength(1, trackConfig);
  const laneNCurveLength = getLaneCurveLength(lane, trackConfig);

  // Stagger is the difference in curve distance for each curve run in lanes
  return (laneNCurveLength - lane1CurveLength) * raceCurves;
}

/**
 * Get stagger for common race distances
 * @param {number} lane - Lane number (1-9)
 * @param {number} raceDistance - Race distance in meters
 * @param {Object} trackConfig - Track configuration
 * @returns {number} Stagger distance in meters
 */
export function getStaggerForRace(lane, raceDistance, trackConfig = TRACK_400M) {
  const staggerCurves = {
    100: 0,    // No curves
    110: 0,    // No curves (hurdles)
    200: 1,    // One curve
    300: 2,    // Two curves (300m starts on back straight)
    400: 2,    // Two curves (one full lap, staggered start)
    800: 0.5,  // 800m has waterfall start after first curve
  };

  const curves = staggerCurves[raceDistance] ?? 0;
  return getLaneStagger(lane, curves, trackConfig);
}

// SVG rendering constants
export const SVG_CONFIG = {
  // Scale: 1 meter = 10 SVG units
  scale: 10,

  // ViewBox dimensions for 400m track
  viewBoxWidth: 2000,
  viewBoxHeight: 1100,

  // Track positioning within viewBox
  trackOffsetX: 150,
  trackOffsetY: 100,

  // Colors
  colors: {
    trackSurface: '#c75050',      // Track red/brown
    infield: '#4a9c4a',           // Green grass
    laneLines: '#ffffff',         // White lane lines

    // Marking category colors
    startLine: '#22c55e',         // Green
    finishLine: '#ffffff',        // White
    hurdleMark: '#f59e0b',        // Orange/Yellow
    relayZone: '#3b82f6',         // Blue
    steepleMark: '#a855f7',       // Purple
    distanceMarker: '#ffffff',    // White

    // Selection states
    selected: '#ef4444',          // Red for selected
    selectedGlow: 'rgba(239, 68, 68, 0.5)',
    highlight: '#1a73e8',         // Primary blue for highlights
    highlightGlow: 'rgba(26, 115, 232, 0.5)'
  },

  // Stroke widths
  strokeWidths: {
    laneLine: 0.5,
    marking: 2,
    selectedMarking: 3,
    routePath: 3
  }
};

// Track sections for position calculations
export const TRACK_SECTIONS = {
  // Positions are measured counter-clockwise from finish line
  // The finish line is at position 0
  // Home straight: 0 to straightLength (84.39m)
  // First curve: straightLength to straightLength + curveLength
  // Back straight: after first curve to before second curve
  // Second curve: completes the lap back to finish

  HOME_STRAIGHT_START: 0,
  HOME_STRAIGHT_END: TRACK_400M.straightLength,
  FIRST_CURVE_START: TRACK_400M.straightLength,
  get FIRST_CURVE_END() {
    return TRACK_400M.straightLength + Math.PI * TRACK_400M.lane1RunningRadius;
  },
  get BACK_STRAIGHT_START() {
    return this.FIRST_CURVE_END;
  },
  get BACK_STRAIGHT_END() {
    return this.FIRST_CURVE_END + TRACK_400M.straightLength;
  },
  get SECOND_CURVE_START() {
    return this.BACK_STRAIGHT_END;
  },
  get SECOND_CURVE_END() {
    return 400; // Full lap
  }
};

export default TRACK_400M;
