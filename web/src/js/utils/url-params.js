const SCORE_PARAM_MAP = {
  gender: 'g',
  event: 'e',
  mode: 'm',
  value: 'v',
  handTimed: 'ht'
};

const PACE_PARAM_MAP = {
  measurementMode: 'mm',
  calculateMode: 'cm',
  subMode: 'sm',
  distanceKey: 'dk',
  distance: 'd',
  distanceUnit: 'du',
  time: 't',
  pace: 'p',
  paceUnit: 'pu',
  paceInterval: 'pi',
  paceIntervalUnit: 'piu',
  speed: 'sp',
  speedUnit: 'su'
};

const AGE_PARAM_MAP = {
  mode: 'md',            // 'forward' | 'reverse'
  reverseSubMode: 'rmd', // 'from' | 'target' (reverse only)
  fromDate: 'fd',        // forward: from-date as YYYY-MM-DD
  targetDate: 'td',      // forward: target-date as YYYY-MM-DD
  singleDate: 'd',       // reverse: the single date as YYYY-MM-DD
  years: 'y',            // reverse: age years
  months: 'mo',          // reverse: age months
  days: 'dy'             // reverse: age days
};

const TIME_PARAM_MAP = {
  mode: 'm',      // 'as' (add/subtract) | 'md' (multiply/divide)
  times: 'ts',    // add/sub: serialised rows, e.g. "+5:00,-3:00,+1:30"
  time: 't',      // mul/div: the single time value (seconds or MM:SS)
  operator: 'op', // mul/div: 'mul' | 'div'
  number: 'n'     // mul/div: the multiplier/divisor
};

const COMBINED_EVENTS_PARAM_MAP = {
  gender: 'g',        // 'men' | 'women'
  event: 'e',         // combined-event key, e.g. 'decathlon', 'heptathlon sh'
  performances: 'pf'  // packed: `eventKey,value[,1]|eventKey,value[,1]|...`
                      // where the optional trailing `,1` flags hand timing.
                      // `|` between events and `,` within an event are safe —
                      // neither appears in event keys or performance values.
                      // Time values like "4:30" pass through untouched because
                      // we never split on `:`.
};

/**
 * Build a shareable URL from calculator params.
 * @param {string} calculatorPath - e.g., '/calculators/score.html'
 * @param {Object} params - Raw calculation parameters
 * @param {Object} paramMap - Short name mapping
 * @returns {string} Full URL with query params
 */
export function buildShareUrl(calculatorPath, params, paramMap) {
  const url = new URL(calculatorPath, window.location.origin);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      const shortKey = paramMap[key] || key;
      url.searchParams.set(shortKey, String(value));
    }
  }
  return url.toString();
}

/**
 * Parse URL search params back into a params object.
 * @param {Object} paramMap - Short name mapping
 * @returns {Object|null} Parsed params, or null if no relevant params found
 */
export function parseUrlParams(paramMap) {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.size === 0) return null;

  const reverseMap = {};
  for (const [longKey, shortKey] of Object.entries(paramMap)) {
    reverseMap[shortKey] = longKey;
  }

  const params = {};
  let foundAny = false;
  for (const [shortKey, value] of urlParams.entries()) {
    const longKey = reverseMap[shortKey];
    if (longKey) {
      params[longKey] = value;
      foundAny = true;
    }
  }

  return foundAny ? params : null;
}

/**
 * Clear URL params without triggering navigation.
 */
export function clearUrlParams() {
  const url = new URL(window.location.href);
  url.search = '';
  window.history.replaceState({}, '', url.toString());
}

/**
 * Copy text to clipboard with fallback.
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Whether copy succeeded
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  }
}

export { SCORE_PARAM_MAP, PACE_PARAM_MAP, AGE_PARAM_MAP, TIME_PARAM_MAP, COMBINED_EVENTS_PARAM_MAP };
