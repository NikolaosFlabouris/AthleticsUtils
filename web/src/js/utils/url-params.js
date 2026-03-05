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

export { SCORE_PARAM_MAP, PACE_PARAM_MAP };
