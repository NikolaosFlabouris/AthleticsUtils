/**
 * Time Calculator — pure calculation utilities.
 *
 * All functions here deal with times as *seconds* (floating-point, so
 * sub-second precision is preserved through the pipeline). The formatter
 * knows how to render those back to strings.
 *
 * DOM-free and side-effect free so they can be unit-tested in isolation.
 */

/**
 * Parse a time string into seconds. Returns null for empty/invalid input.
 *
 * Accepted formats (mirrors the pace calculator for consistency):
 *   - Bare seconds:           "112", "112.5"         → 112 / 112.5
 *   - MM:SS(.ss):             "1:52", "1:52.50"       → 112 / 112.5
 *   - HH:MM:SS(.ss):          "1:23:45", "1:23:45.5"  → 5025 / 5025.5
 *   - Leading minus allowed:  "-1:52"                 → -112
 *
 * Whitespace is tolerated. Colons with non-numeric parts are rejected.
 *
 * @param {string} input
 * @returns {number|null} seconds, possibly negative or fractional
 */
export function parseTimeFlexible(input) {
  if (input == null) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;

  // Optional leading minus
  let sign = 1;
  let body = trimmed;
  if (body.startsWith('-')) {
    sign = -1;
    body = body.slice(1).trim();
  }
  if (!body) return null;

  const parts = body.split(':');
  if (parts.length > 3) return null;

  // Validate each part is a non-negative number. The seconds slot may be
  // a decimal; hours/minutes must be whole integers.
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!p.length) return null;
    if (i < parts.length - 1) {
      // integer segment (h or m)
      if (!/^\d+$/.test(p)) return null;
    } else {
      // last segment may be decimal
      if (!/^\d+(\.\d+)?$/.test(p)) return null;
    }
  }

  let h = 0;
  let m = 0;
  let s = 0;
  if (parts.length === 1) {
    s = parseFloat(parts[0]);
  } else if (parts.length === 2) {
    m = parseInt(parts[0], 10);
    s = parseFloat(parts[1]);
  } else {
    h = parseInt(parts[0], 10);
    m = parseInt(parts[1], 10);
    s = parseFloat(parts[2]);
  }

  // In MM:SS and HH:MM:SS form, seconds and minutes must be within [0, 60).
  // "1:75" is user error, not 2:15 — reject it.
  if (parts.length >= 2 && (s < 0 || s >= 60)) return null;
  if (parts.length === 3 && (m < 0 || m >= 60)) return null;
  if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(s)) return null;

  return sign * (h * 3600 + m * 60 + s);
}

/**
 * Format a number of seconds as a time string.
 *
 * Rules:
 *   - Negative values get a leading "−" (unicode minus, visually cleaner
 *     than a hyphen).
 *   - ≥ 1 hour → HH:MM:SS, otherwise MM:SS.
 *   - Fractional seconds are shown with up to 2 decimals when they exist
 *     (and are not effectively zero due to float drift).
 *
 * @param {number} seconds
 * @returns {string}
 */
export function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '—';
  const negative = seconds < 0;
  const abs = Math.abs(seconds);

  const totalWhole = Math.floor(abs);
  let frac = abs - totalWhole;

  // Round fractional to 2 dp and watch for rollover (e.g. 0.996 → 1.00).
  frac = Math.round(frac * 100) / 100;
  let adjusted = totalWhole;
  if (frac >= 1) {
    adjusted += 1;
    frac = 0;
  }

  const h = Math.floor(adjusted / 3600);
  const m = Math.floor((adjusted % 3600) / 60);
  const s = adjusted % 60;

  let fracPart = '';
  if (frac > 0) {
    // Strip trailing zeros from two-decimal representation: 0.50 → .5
    let fs = frac.toFixed(2).slice(1); // ".50"
    fs = fs.replace(/0+$/, '');
    if (fs === '.') fs = '';
    fracPart = fs;
  }

  let core;
  if (h > 0) {
    core = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  } else {
    core = `${m}:${String(s).padStart(2, '0')}`;
  }
  return (negative ? '\u2212' : '') + core + fracPart;
}

/**
 * Compute the running total for an add/subtract expression.
 *
 * @param {Array<{operator:'+'|'-', seconds:number}>} rows
 *   List of rows. The first row is typically "+" but the function
 *   doesn't enforce that — it just applies each operator in sequence.
 * @returns {{runningTotals:number[], final:number}}
 *   `runningTotals[i]` is the subtotal after applying row i. `final`
 *   is the last element (or 0 if no rows).
 */
export function runAddSubtract(rows) {
  const runningTotals = [];
  let total = 0;
  for (const row of rows) {
    if (!row || !Number.isFinite(row.seconds)) {
      // Skip invalid rows entirely — the UI is responsible for flagging
      // them. runningTotals still advances so indices line up with the
      // visible row order, which makes it simpler for the renderer.
      runningTotals.push(total);
      continue;
    }
    if (row.operator === '-') {
      total -= row.seconds;
    } else {
      total += row.seconds;
    }
    runningTotals.push(total);
  }
  return { runningTotals, final: total };
}

/**
 * Compute the step-by-step multiply breakdown.
 *
 * For an integer multiplier N we emit N cumulative steps:
 *   1:15 × 4 → [1:15, 2:30, 3:45, 5:00]
 *
 * For a non-integer multiplier we emit ⌊N⌋ whole steps plus a final
 * step at the exact product:
 *   1:15 × 1.5 → [1:15, 1:52.5]        (one whole multiple, then remainder)
 *   1:15 × 2.75 → [1:15, 2:30, 3:26.25] (two whole multiples, then remainder)
 *
 * Multiplier can be 0 (result = just [0]) or negative (steps walk the
 * other direction). For negative the UI will probably not expose it but
 * the math holds.
 *
 * @param {number} timeSeconds
 * @param {number} multiplier
 * @returns {{steps:number[], final:number}}
 */
export function multiplyTime(timeSeconds, multiplier) {
  if (!Number.isFinite(timeSeconds) || !Number.isFinite(multiplier)) {
    return { steps: [], final: NaN };
  }

  if (multiplier === 0) {
    return { steps: [0], final: 0 };
  }

  const steps = [];
  const sign = multiplier < 0 ? -1 : 1;
  const abs = Math.abs(multiplier);
  const whole = Math.floor(abs);

  for (let i = 1; i <= whole; i++) {
    steps.push(sign * i * timeSeconds);
  }

  // Append the final step if there's a fractional part (e.g. ×1.5, ×2.75).
  const hasFraction = abs - whole > 1e-9;
  if (hasFraction) {
    steps.push(sign * abs * timeSeconds);
  }

  return { steps, final: steps[steps.length - 1] ?? 0 };
}

/**
 * Compute the reducing breakdown for divide.
 *
 * For an integer divisor N we emit N steps starting with the original
 * time and subtracting one "portion" each step, stopping one step
 * before 0:
 *   2:00 ÷ 4 → [2:00, 1:30, 1:00, 0:30]       (N=4 steps, last = quotient)
 *
 * For a non-integer divisor we emit ⌈N⌉ integer "portion" steps (each
 * subtracting `time/N`) followed by a final 0 to show the exact
 * remainder hitting zero. The intermediate steps are still whole
 * portions of `time/N`:
 *   2:00 ÷ 4.5 → [2:00, 1:33.33, 1:06.67, 0:40, 0:13.33, 0:00]
 *
 * @param {number} timeSeconds
 * @param {number} divisor
 * @returns {{steps:number[], final:number, quotient:number}}
 */
export function divideTime(timeSeconds, divisor) {
  if (!Number.isFinite(timeSeconds) || !Number.isFinite(divisor)) {
    return { steps: [], final: NaN, quotient: NaN };
  }
  if (divisor === 0) {
    return { steps: [], final: NaN, quotient: NaN };
  }

  const quotient = timeSeconds / divisor;
  const steps = [];
  const absDivisor = Math.abs(divisor);

  // If the divisor is an integer, produce `divisor` steps (the start
  // plus `divisor-1` subtractions). The last step equals the quotient.
  if (Number.isInteger(absDivisor)) {
    for (let i = 0; i < absDivisor; i++) {
      steps.push(timeSeconds - i * quotient);
    }
    return { steps, final: steps[steps.length - 1] ?? timeSeconds, quotient };
  }

  // Non-integer divisor: ⌈divisor⌉ integer "portion" subtractions, then
  // a final 0 row to show the last fractional portion reaching zero.
  const whole = Math.floor(absDivisor);
  for (let i = 0; i <= whole; i++) {
    steps.push(timeSeconds - i * quotient);
  }
  // Final 0 (the remainder after the last fractional portion).
  steps.push(0);
  return { steps, final: steps[steps.length - 1] ?? 0, quotient };
}
