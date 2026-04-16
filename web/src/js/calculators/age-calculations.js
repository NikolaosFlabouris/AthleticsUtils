/**
 * Age Calculator — pure calculation utilities.
 *
 * All functions in this module are side-effect free and DOM-free so they
 * can be unit-tested easily and shared between the forward (date + date →
 * age) and reverse (date ± age → date) flows.
 *
 * Dates are handled in the browser's local timezone because the user is
 * entering calendar dates (birthdays, anniversaries), not instants. Using
 * UTC would shift dates for users east/west of UTC.
 */

/**
 * Parse an ISO-ish date string ("YYYY-MM-DD") into a local-midnight Date.
 * Returns null for empty/invalid input. We avoid `new Date("YYYY-MM-DD")`
 * because that parses as UTC midnight, which shifts the date for most
 * timezones.
 * @param {string} value
 * @returns {Date|null}
 */
export function parseDateInput(value) {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  // Reject nonsense like Feb 30: the Date constructor will silently roll
  // over to March 2, so we compare the parts back out.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/**
 * Format a Date back to "YYYY-MM-DD" in local time (for <input type="date">).
 * @param {Date} date
 * @returns {string}
 */
export function formatDateInput(date) {
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

/**
 * Compare two dates by calendar day only (ignores time of day). Returns
 * -1/0/1 like a sort comparator.
 */
export function compareDates(a, b) {
  const ay = a.getFullYear();
  const by = b.getFullYear();
  if (ay !== by) return ay < by ? -1 : 1;
  const am = a.getMonth();
  const bm = b.getMonth();
  if (am !== bm) return am < bm ? -1 : 1;
  const ad = a.getDate();
  const bd = b.getDate();
  if (ad !== bd) return ad < bd ? -1 : 1;
  return 0;
}

/**
 * Number of days in the given month (1-12) of a year. Handles leap years.
 */
export function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * Calendar age difference between two dates.
 *
 * Uses the "clamp-then-diff" convention that matches how most mainstream
 * age calculators (and what `addAge` below reverses) work:
 *   1. Count whole years/months from `from` to `target`. A month is
 *      "whole" once `target` has reached the anniversary day in the
 *      current month (with end-of-month clamping — Jan 31 → Feb 28/29
 *      counts as exactly one month).
 *   2. The remaining days are measured from that last anniversary date
 *      (i.e. `addAge(from, {years, months, 0})`) to `target`.
 *
 * On someone's 30th birthday this reads exactly 30 years, 0 months, 0
 * days. Adding the returned age to `from` via `addAge` round-trips back
 * to `target` for all well-formed inputs.
 *
 * Caller is expected to verify `from <= target`; this function assumes so.
 *
 * @param {Date} from
 * @param {Date} target
 * @returns {{years:number, months:number, days:number}}
 */
export function calculateAge(from, target) {
  let years = target.getFullYear() - from.getFullYear();
  let months = target.getMonth() - from.getMonth();

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  // Have we passed the from-day-of-month (clamped to target's month
  // length) within target's month? If not, we haven't completed this
  // calendar month yet — roll back one month.
  const daysInTargetMonth = daysInMonth(target.getFullYear(), target.getMonth() + 1);
  const clampedFromDay = Math.min(from.getDate(), daysInTargetMonth);
  if (target.getDate() < clampedFromDay) {
    months -= 1;
    if (months < 0) {
      months += 12;
      years -= 1;
    }
  }

  // Remaining days = whole days between the last "anniversary" of `from`
  // and `target`. Using addAge here keeps this function perfectly
  // symmetric with the add/subtract helpers below.
  const lastAnniv = addAge(from, { years, months, days: 0 });
  const msPerDay = 24 * 60 * 60 * 1000;
  // Math.round absorbs ±1h DST shifts between the two dates.
  const days = Math.round((target.getTime() - lastAnniv.getTime()) / msPerDay);

  return { years, months, days };
}

/**
 * Age a person born on `from` will be at the end of the given calendar
 * year (on 31 December of that year). Returns the full {years, months,
 * days} decomposition even though most callers only want the years.
 *
 * @param {Date} from
 * @param {number} year
 * @returns {{years:number, months:number, days:number}}
 */
export function ageAtEndOfYear(from, year) {
  const dec31 = new Date(year, 11, 31);
  // If the birth date is after Dec 31 of the target year, the person
  // isn't born yet at that point. We still return a structural answer
  // so the display layer can decide how to label it.
  if (compareDates(from, dec31) > 0) {
    return { years: 0, months: 0, days: 0 };
  }
  return calculateAge(from, dec31);
}

/**
 * Add an age ({years, months, days}) to a Date and return a new Date.
 * The months step is applied first, then years, then days, so that
 * adding "1 month" to 31 Jan yields 28/29 Feb as expected (clamped).
 *
 * @param {Date} date
 * @param {{years:number, months:number, days:number}} age
 * @returns {Date}
 */
export function addAge(date, age) {
  const y = age.years || 0;
  const mo = age.months || 0;
  const d = age.days || 0;

  // Start from calendar parts so we can clamp day-of-month correctly
  // after shifting years/months.
  let newYear = date.getFullYear() + y;
  let newMonth = date.getMonth() + mo;
  while (newMonth > 11) {
    newMonth -= 12;
    newYear += 1;
  }
  while (newMonth < 0) {
    newMonth += 12;
    newYear -= 1;
  }

  // Clamp day-of-month to the last valid day of the resulting month.
  // Example: 31 Jan + 1 month → 28/29 Feb.
  const maxDay = daysInMonth(newYear, newMonth + 1);
  const clampedDay = Math.min(date.getDate(), maxDay);

  const shifted = new Date(newYear, newMonth, clampedDay);
  // Days are added last, letting the Date object handle rollover cleanly.
  shifted.setDate(shifted.getDate() + d);
  return shifted;
}

/**
 * Subtract an age from a Date. Used by the reverse calculator's
 * "Target Date" sub-mode (date − age → from date).
 *
 * Operation order: days → months → years. This produces sensible
 * real-world results for the common cases (e.g. subtracting 32y 4m from
 * "5 April 2034" yields "5 December 2001"). Because month-clamping is
 * lossy, subtract-then-add is *not* strictly invertible at month-end
 * boundaries — e.g. `subtract(2020-03-01, {0,1,1}) → 2020-01-29`, while
 * `add(2020-01-31, {0,1,1}) → 2020-03-01`. Both answers are defensible;
 * we pick the ordering that keeps the more common case intuitive.
 *
 * @param {Date} date
 * @param {{years:number, months:number, days:number}} age
 * @returns {Date}
 */
export function subtractAge(date, age) {
  const y = age.years || 0;
  const mo = age.months || 0;
  const d = age.days || 0;

  // Subtract days first using Date's native rollover.
  const afterDays = new Date(date.getFullYear(), date.getMonth(), date.getDate() - d);

  // Then subtract months/years with clamping.
  let newYear = afterDays.getFullYear() - y;
  let newMonth = afterDays.getMonth() - mo;
  while (newMonth < 0) {
    newMonth += 12;
    newYear -= 1;
  }
  while (newMonth > 11) {
    newMonth -= 12;
    newYear += 1;
  }

  const maxDay = daysInMonth(newYear, newMonth + 1);
  const clampedDay = Math.min(afterDays.getDate(), maxDay);
  return new Date(newYear, newMonth, clampedDay);
}

/**
 * Format an age ({years, months, days}) as "32 years, 4 months, 17 days".
 * Singular units are used when the count is exactly 1. Zero-unit segments
 * are dropped unless *all* segments are zero, in which case we return
 * "0 days" so the result card never shows an empty string.
 *
 * @param {{years:number, months:number, days:number}} age
 * @returns {string}
 */
export function formatAgeParts(age) {
  const parts = [];
  const unit = (n, singular) => `${n} ${n === 1 ? singular : singular + 's'}`;
  if (age.years) parts.push(unit(age.years, 'year'));
  if (age.months) parts.push(unit(age.months, 'month'));
  if (age.days) parts.push(unit(age.days, 'day'));
  if (parts.length === 0) return '0 days';
  return parts.join(', ');
}

/**
 * Compact age format for history rows: "32y 4m 17d".
 * @param {{years:number, months:number, days:number}} age
 * @returns {string}
 */
export function formatAgeCompact(age) {
  return `${age.years || 0}y ${age.months || 0}m ${age.days || 0}d`;
}

/**
 * Format a Date as "Wednesday, 15 April 2026" using the browser's locale.
 * Falls back to ISO if Intl is unavailable (it always is in modern browsers,
 * but we keep the fallback for defensive reasons).
 *
 * @param {Date} date
 * @returns {string}
 */
export function formatLongDate(date) {
  try {
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return formatDateInput(date);
  }
}

/**
 * Format a Date as "15 Apr 2026" — a compact mid-length format used in
 * history row text.
 */
export function formatShortDate(date) {
  try {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return formatDateInput(date);
  }
}
