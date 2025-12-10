/**
 * Track Markings Data
 * Complete dataset of standard 400m track markings
 * All positions measured in meters from the finish line (counter-clockwise)
 *
 * Position 0 = Finish line
 * Position 100 = 100m from finish (100m start line)
 * Position 200 = 200m from finish (200m start line)
 * etc.
 */

import { TRACK_400M, getStaggerForRace, getLaneStagger } from './track-constants.js';

// Marking categories
export const MARKING_CATEGORIES = {
  START_LINE: 'start',
  FINISH_LINE: 'finish',
  HURDLE_MARK: 'hurdle',
  RELAY_ZONE: 'relay',
  STEEPLE_MARK: 'steeple',
  DISTANCE_MARKER: 'marker'
};

// Category display names
export const CATEGORY_NAMES = {
  [MARKING_CATEGORIES.START_LINE]: 'Start Line',
  [MARKING_CATEGORIES.FINISH_LINE]: 'Finish Line',
  [MARKING_CATEGORIES.HURDLE_MARK]: 'Hurdle Mark',
  [MARKING_CATEGORIES.RELAY_ZONE]: 'Relay Zone',
  [MARKING_CATEGORIES.STEEPLE_MARK]: 'Steeplechase',
  [MARKING_CATEGORIES.DISTANCE_MARKER]: 'Distance Marker'
};

/**
 * Generate finish line marking
 */
function generateFinishLine() {
  const markings = [];
  for (let lane = 1; lane <= TRACK_400M.numLanes; lane++) {
    markings.push({
      id: `finish-lane${lane}`,
      name: 'Finish Line',
      shortName: 'Finish',
      category: MARKING_CATEGORIES.FINISH_LINE,
      lane,
      position: 0,
      isMajor: true
    });
  }
  return markings;
}

/**
 * Generate start lines for sprint events (100m, 200m, 300m, 400m)
 */
function generateSprintStartLines() {
  const markings = [];
  const sprintDistances = [100, 200, 300, 400];

  for (const distance of sprintDistances) {
    for (let lane = 1; lane <= TRACK_400M.numLanes; lane++) {
      const stagger = getStaggerForRace(lane, distance);
      const basePosition = distance;
      const position = basePosition + stagger;

      markings.push({
        id: `${distance}m-start-lane${lane}`,
        name: `${distance}m Start`,
        shortName: `${distance}m`,
        category: MARKING_CATEGORIES.START_LINE,
        lane,
        position,
        isMajor: distance === 100 || distance === 400,
        raceDistance: distance
      });
    }
  }
  return markings;
}

/**
 * Generate start lines for middle distance events (800m, 1500m, Mile, 3000m)
 */
function generateMiddleDistanceStartLines() {
  const markings = [];

  // 800m - Waterfall start (all lanes start at same position, then break after 100m)
  // The start is 800m from finish, but with a break line at 100m
  for (let lane = 1; lane <= TRACK_400M.numLanes; lane++) {
    // 800m uses a one-turn stagger (lanes merge after first curve)
    const stagger = getLaneStagger(lane, 1);
    markings.push({
      id: `800m-start-lane${lane}`,
      name: '800m Start',
      shortName: '800m',
      category: MARKING_CATEGORIES.START_LINE,
      lane,
      position: 800 % 400 + stagger, // 800m = 2 laps, start at 0 + stagger
      isMajor: true,
      raceDistance: 800
    });
  }

  // 1500m - Common start (group start, all in lane 1 area)
  // Position: 1500m = 3 laps + 300m, so starts 300m from finish
  markings.push({
    id: '1500m-start',
    name: '1500m Start',
    shortName: '1500m',
    category: MARKING_CATEGORIES.START_LINE,
    lane: 0, // 0 indicates all lanes / waterfall
    position: 300, // 1500 % 400 = 300
    isMajor: true,
    raceDistance: 1500
  });

  // Mile - Similar to 1500m but different position
  // 1 mile = 1609.34m, so 1609.34 % 400 = 9.34m from a lap start
  // Typically starts ~9m after the finish line
  const milePosition = 1609.34 % 400;
  markings.push({
    id: 'mile-start',
    name: 'Mile Start',
    shortName: 'Mile',
    category: MARKING_CATEGORIES.START_LINE,
    lane: 0,
    position: milePosition,
    isMajor: true,
    raceDistance: 1609.34
  });

  // 3000m - Group start
  // 3000m = 7 laps + 200m, so starts 200m from finish
  markings.push({
    id: '3000m-start',
    name: '3000m Start',
    shortName: '3000m',
    category: MARKING_CATEGORIES.START_LINE,
    lane: 0,
    position: 200, // 3000 % 400 = 200
    isMajor: true,
    raceDistance: 3000
  });

  return markings;
}

/**
 * Generate steeplechase markings
 * @param {string} waterJumpPosition - 'inside' or 'outside'
 */
function generateSteeplechaseMarkings(waterJumpPosition = 'inside') {
  const markings = [];

  // 3000m Steeplechase start line (same as 3000m)
  markings.push({
    id: '3000m-sc-start',
    name: '3000m SC Start',
    shortName: '3000m SC',
    category: MARKING_CATEGORIES.STEEPLE_MARK,
    lane: 0,
    position: 200,
    isMajor: true,
    raceDistance: 3000
  });

  // Steeplechase has 5 barriers per lap (including water jump)
  // Water jump can be on inside or outside of track
  // Regular barriers are evenly spaced

  // Barrier positions (approximate, varies by water jump position)
  // Standard: barriers at approximately every 80m
  const barrierSpacing = 80; // Approximate spacing

  if (waterJumpPosition === 'inside') {
    // Water jump on inside (after first curve)
    // Barriers at: ~80m, ~160m, ~240m, ~320m from start of lap
    // Water jump at: between first and second curve
    const waterJumpPos = TRACK_400M.straightLength + (Math.PI * TRACK_400M.lane1RunningRadius) / 2;

    markings.push({
      id: 'water-jump-inside',
      name: 'Water Jump',
      shortName: 'Water',
      category: MARKING_CATEGORIES.STEEPLE_MARK,
      lane: 0,
      position: waterJumpPos,
      isMajor: true,
      waterJumpConfig: 'inside'
    });

    // Add barrier positions
    for (let i = 1; i <= 4; i++) {
      const pos = (i * barrierSpacing) % 400;
      markings.push({
        id: `barrier-${i}-inside`,
        name: `Barrier ${i}`,
        shortName: `B${i}`,
        category: MARKING_CATEGORIES.STEEPLE_MARK,
        lane: 0,
        position: pos,
        isMajor: false,
        waterJumpConfig: 'inside'
      });
    }
  } else {
    // Water jump on outside (after second curve)
    const waterJumpPos = TRACK_400M.straightLength * 2 + Math.PI * TRACK_400M.lane1RunningRadius +
                        (Math.PI * TRACK_400M.lane1RunningRadius) / 2;

    markings.push({
      id: 'water-jump-outside',
      name: 'Water Jump',
      shortName: 'Water',
      category: MARKING_CATEGORIES.STEEPLE_MARK,
      lane: 0,
      position: waterJumpPos % 400,
      isMajor: true,
      waterJumpConfig: 'outside'
    });

    // Add barrier positions for outside configuration
    for (let i = 1; i <= 4; i++) {
      const pos = (i * barrierSpacing + 40) % 400; // Offset for outside config
      markings.push({
        id: `barrier-${i}-outside`,
        name: `Barrier ${i}`,
        shortName: `B${i}`,
        category: MARKING_CATEGORIES.STEEPLE_MARK,
        lane: 0,
        position: pos,
        isMajor: false,
        waterJumpConfig: 'outside'
      });
    }
  }

  return markings;
}

/**
 * Generate hurdle markings for all events
 */
function generateHurdleMarkings() {
  const markings = [];

  // Hurdle event specifications
  // Format: { distance, numHurdles, firstHurdle, hurdleSpacing, runIn, lanes }
  const hurdleEvents = [
    // 80m hurdles (youth)
    { distance: 80, numHurdles: 8, firstHurdle: 12, spacing: 8, runIn: 12, lanes: [1, 2, 3, 4, 5, 6, 7, 8] },
    // 100m hurdles (women)
    { distance: 100, numHurdles: 10, firstHurdle: 13, spacing: 8.5, runIn: 10.5, lanes: [1, 2, 3, 4, 5, 6, 7, 8] },
    // 110m hurdles (men)
    { distance: 110, numHurdles: 10, firstHurdle: 13.72, spacing: 9.14, runIn: 14.02, lanes: [1, 2, 3, 4, 5, 6, 7, 8] },
    // 200m hurdles (rarely run, but included)
    { distance: 200, numHurdles: 10, firstHurdle: 22, spacing: 19, runIn: 13, lanes: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
    // 300m hurdles (youth)
    { distance: 300, numHurdles: 8, firstHurdle: 50, spacing: 35, runIn: 40, lanes: [1, 2, 3, 4, 5, 6, 7, 8] },
    // 400m hurdles
    { distance: 400, numHurdles: 10, firstHurdle: 45, spacing: 35, runIn: 40, lanes: [1, 2, 3, 4, 5, 6, 7, 8] }
  ];

  for (const event of hurdleEvents) {
    for (const lane of event.lanes) {
      const stagger = getStaggerForRace(lane, event.distance);

      for (let hurdleNum = 1; hurdleNum <= event.numHurdles; hurdleNum++) {
        // Position from finish line
        // Start position + stagger - distance to hurdle
        const distanceToHurdle = event.firstHurdle + (hurdleNum - 1) * event.spacing;
        const positionFromStart = event.distance - distanceToHurdle;
        const position = positionFromStart + stagger;

        markings.push({
          id: `${event.distance}h-h${hurdleNum}-lane${lane}`,
          name: `${event.distance}m Hurdle ${hurdleNum}`,
          shortName: `${event.distance}H H${hurdleNum}`,
          category: MARKING_CATEGORIES.HURDLE_MARK,
          lane,
          position: (position + 400) % 400, // Normalize to 0-400
          isMajor: hurdleNum === 1 || hurdleNum === event.numHurdles,
          hurdleEvent: event.distance,
          hurdleNumber: hurdleNum
        });
      }
    }
  }

  return markings;
}

/**
 * Generate relay zone markings
 */
function generateRelayZoneMarkings() {
  const markings = [];

  // 4x100m relay zones
  // Exchange zones: 20m with 10m acceleration zone before
  // Zones at 100m, 200m, 300m marks
  const relay4x100Zones = [
    { name: '1st Exchange', position: 100, zoneStart: 90, zoneEnd: 110 },
    { name: '2nd Exchange', position: 200, zoneStart: 190, zoneEnd: 210 },
    { name: '3rd Exchange', position: 300, zoneStart: 290, zoneEnd: 310 }
  ];

  for (const zone of relay4x100Zones) {
    for (let lane = 1; lane <= TRACK_400M.numLanes; lane++) {
      const stagger = getStaggerForRace(lane, zone.position);

      // Acceleration zone start (10m before exchange zone)
      markings.push({
        id: `4x100-accel-${zone.position}-lane${lane}`,
        name: `4x100 Accel Zone ${zone.name}`,
        shortName: `4x100 Accel`,
        category: MARKING_CATEGORIES.RELAY_ZONE,
        lane,
        position: (zone.zoneStart - 10 + stagger + 400) % 400,
        isMajor: false,
        relayEvent: '4x100',
        zoneType: 'acceleration'
      });

      // Exchange zone start
      markings.push({
        id: `4x100-zone-start-${zone.position}-lane${lane}`,
        name: `4x100 Zone Start ${zone.name}`,
        shortName: `4x100 Start`,
        category: MARKING_CATEGORIES.RELAY_ZONE,
        lane,
        position: (zone.zoneStart + stagger + 400) % 400,
        isMajor: true,
        relayEvent: '4x100',
        zoneType: 'exchange-start'
      });

      // Exchange zone end
      markings.push({
        id: `4x100-zone-end-${zone.position}-lane${lane}`,
        name: `4x100 Zone End ${zone.name}`,
        shortName: `4x100 End`,
        category: MARKING_CATEGORIES.RELAY_ZONE,
        lane,
        position: (zone.zoneEnd + stagger + 400) % 400,
        isMajor: true,
        relayEvent: '4x100',
        zoneType: 'exchange-end'
      });
    }
  }

  // 4x200m relay zones (similar structure but different positions)
  const relay4x200Zones = [
    { name: '1st Exchange', position: 200 },
    { name: '2nd Exchange', position: 400 }, // Actually at 0/400
    { name: '3rd Exchange', position: 200 }  // Second lap
  ];

  // For 4x200, exchanges happen at 200m, 400m (0), 600m (200m second lap)
  for (let zoneIdx = 0; zoneIdx < relay4x200Zones.length; zoneIdx++) {
    const zone = relay4x200Zones[zoneIdx];
    for (let lane = 1; lane <= TRACK_400M.numLanes; lane++) {
      const stagger = getStaggerForRace(lane, 200);
      const basePos = zone.position % 400;

      markings.push({
        id: `4x200-zone-start-${zoneIdx + 1}-lane${lane}`,
        name: `4x200 Zone Start ${zone.name}`,
        shortName: `4x200 Start`,
        category: MARKING_CATEGORIES.RELAY_ZONE,
        lane,
        position: (basePos - 10 + stagger + 400) % 400,
        isMajor: true,
        relayEvent: '4x200',
        zoneType: 'exchange-start'
      });

      markings.push({
        id: `4x200-zone-end-${zoneIdx + 1}-lane${lane}`,
        name: `4x200 Zone End ${zone.name}`,
        shortName: `4x200 End`,
        category: MARKING_CATEGORIES.RELAY_ZONE,
        lane,
        position: (basePos + 10 + stagger + 400) % 400,
        isMajor: true,
        relayEvent: '4x200',
        zoneType: 'exchange-end'
      });
    }
  }

  // 4x400m relay zones
  // First runner: stays in lane
  // Second, third, fourth runners: exchange in zone, break to lane 1
  const relay4x400Zones = [
    { name: '1st Exchange', position: 0 },   // 400m mark = finish line
    { name: '2nd Exchange', position: 0 },   // 800m mark = finish line
    { name: '3rd Exchange', position: 0 }    // 1200m mark = finish line
  ];

  for (let zoneIdx = 0; zoneIdx < relay4x400Zones.length; zoneIdx++) {
    for (let lane = 1; lane <= TRACK_400M.numLanes; lane++) {
      markings.push({
        id: `4x400-zone-start-${zoneIdx + 1}-lane${lane}`,
        name: `4x400 Zone Start`,
        shortName: `4x400 Start`,
        category: MARKING_CATEGORIES.RELAY_ZONE,
        lane,
        position: (400 - 20 + 400) % 400, // 20m before finish
        isMajor: true,
        relayEvent: '4x400',
        zoneType: 'exchange-start'
      });

      markings.push({
        id: `4x400-zone-end-${zoneIdx + 1}-lane${lane}`,
        name: `4x400 Zone End`,
        shortName: `4x400 End`,
        category: MARKING_CATEGORIES.RELAY_ZONE,
        lane,
        position: 10, // 10m after finish
        isMajor: true,
        relayEvent: '4x400',
        zoneType: 'exchange-end'
      });
    }
  }

  return markings;
}

/**
 * Generate distance markers (50m-110m on both straights)
 */
function generateDistanceMarkers() {
  const markings = [];

  // Home straight markers (50m to 110m from finish)
  for (let distance = 50; distance <= 110; distance += 10) {
    for (let lane = 1; lane <= TRACK_400M.numLanes; lane++) {
      markings.push({
        id: `marker-${distance}m-home-lane${lane}`,
        name: `${distance}m Mark (Home)`,
        shortName: `${distance}m`,
        category: MARKING_CATEGORIES.DISTANCE_MARKER,
        lane,
        position: distance,
        isMajor: distance === 50 || distance === 100,
        straight: 'home'
      });
    }
  }

  // Back straight markers
  // Back straight starts after first curve
  const backStraightStart = TRACK_400M.straightLength + Math.PI * TRACK_400M.lane1RunningRadius;

  for (let distance = 50; distance <= 110; distance += 10) {
    for (let lane = 1; lane <= TRACK_400M.numLanes; lane++) {
      const position = backStraightStart + distance;
      markings.push({
        id: `marker-${distance}m-back-lane${lane}`,
        name: `${distance}m Mark (Back)`,
        shortName: `${distance}m`,
        category: MARKING_CATEGORIES.DISTANCE_MARKER,
        lane,
        position: position % 400,
        isMajor: distance === 50 || distance === 100,
        straight: 'back'
      });
    }
  }

  return markings;
}

/**
 * Get all markings
 * @param {Object} options - Filter options
 * @param {string} options.waterJumpConfig - 'inside' or 'outside' for steeplechase
 * @param {Array<string>} options.categories - Categories to include
 * @returns {Array} Array of marking objects
 */
export function getAllMarkings(options = {}) {
  const { waterJumpConfig = 'inside', categories = null } = options;

  let markings = [
    ...generateFinishLine(),
    ...generateSprintStartLines(),
    ...generateMiddleDistanceStartLines(),
    ...generateSteeplechaseMarkings(waterJumpConfig),
    ...generateHurdleMarkings(),
    ...generateRelayZoneMarkings(),
    ...generateDistanceMarkers()
  ];

  // Filter by categories if specified
  if (categories && categories.length > 0) {
    markings = markings.filter(m => categories.includes(m.category));
  }

  return markings;
}

/**
 * Get markings grouped by category
 * @param {Object} options - Filter options
 * @returns {Object} Markings grouped by category
 */
export function getMarkingsByCategory(options = {}) {
  const markings = getAllMarkings(options);
  const grouped = {};

  for (const category of Object.values(MARKING_CATEGORIES)) {
    grouped[category] = markings.filter(m => m.category === category);
  }

  return grouped;
}

/**
 * Get a specific marking by ID
 * @param {string} id - Marking ID
 * @param {Object} options - Options (for steeplechase config)
 * @returns {Object|null} Marking object or null
 */
export function getMarkingById(id, options = {}) {
  const markings = getAllMarkings(options);
  return markings.find(m => m.id === id) || null;
}

/**
 * Get unique marking names (for display purposes, consolidating lanes)
 * @param {Object} options - Filter options
 * @returns {Array} Array of unique marking descriptions
 */
export function getUniqueMarkingNames(options = {}) {
  const markings = getAllMarkings(options);
  const nameMap = new Map();

  for (const marking of markings) {
    const key = `${marking.name}-${marking.category}`;
    if (!nameMap.has(key)) {
      nameMap.set(key, {
        name: marking.name,
        shortName: marking.shortName,
        category: marking.category,
        lanes: []
      });
    }
    if (marking.lane > 0) {
      nameMap.get(key).lanes.push(marking.lane);
    }
  }

  return Array.from(nameMap.values());
}

export default {
  MARKING_CATEGORIES,
  CATEGORY_NAMES,
  getAllMarkings,
  getMarkingsByCategory,
  getMarkingById,
  getUniqueMarkingNames
};
