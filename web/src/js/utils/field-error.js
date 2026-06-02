/**
 * Per-field inline validation errors (WCAG 2.1 SC 3.3.1 — Error
 * Identification).
 *
 * A failed-validation input needs its error to be (1) identified in text,
 * (2) programmatically associated with the field, and (3) announced. These
 * helpers drive a sibling `<small class="form-error" role="alert">` next to
 * the input:
 *
 *   - text in the span identifies the error,
 *   - `aria-describedby` (managed via the aria-describedby helpers, so the
 *     existing `-help` link is preserved) associates it,
 *   - `role="alert"` announces it when its text flips from empty to set.
 *
 * The matching red `.input-error` border and `aria-invalid` flag are toggled
 * here too so every field-error path stays in one place.
 *
 * The span is expected to live in the HTML at rest as
 * `<small id="<input-id>-error" class="form-error" role="alert" hidden></small>`.
 * For inputs that are themselves built at runtime (combined-events rows, the
 * time add/subtract rows) the span doesn't exist yet, so it is created lazily
 * next to the input the first time an error is shown.
 *
 * Visibility is toggled through the `hidden` attribute rather than a CSS
 * `display` rule — `display` toggles interact unpredictably with `role="alert"`
 * announcements across screen-reader/browser combinations.
 */

import { linkDescribedBy, unlinkDescribedBy } from './aria-describedby.js';

/** Resolve the error-span id for an input (default `<id>-error`). */
function resolveErrorId(input, opts) {
  if (opts && opts.errorId) return opts.errorId;
  return input && input.id ? `${input.id}-error` : null;
}

/**
 * Find the error span for `errorId`, creating it next to `input` if it isn't
 * already in the DOM (runtime-built rows). Returns null if it can't be placed.
 */
function ensureErrorElement(input, errorId) {
  let el = document.getElementById(errorId);
  if (el) return el;
  if (!input) return null;

  el = document.createElement('small');
  el.id = errorId;
  el.className = 'form-error';
  el.setAttribute('role', 'alert');
  el.hidden = true;

  // Place the span after the field's help text when present, otherwise after
  // the wrapping control group (so it lands below the row rather than inline
  // beside a unit select), falling back to immediately after the input.
  const help = document.getElementById(`${input.id}-help`);
  const group = input.closest('.distance-input-group, .input-with-controls, .time-row');
  const anchor = help || group || input;
  anchor.insertAdjacentElement('afterend', el);
  return el;
}

/**
 * Show a validation error on `input`: render `message` in its error span,
 * flag the field invalid, add the `.input-error` border and associate the
 * span via aria-describedby.
 *
 * @param {HTMLElement} input
 * @param {string} message
 * @param {{errorId?: string}} [opts] - override the span id (lets several
 *   inputs share one error span, e.g. the age composite).
 */
export function showFieldError(input, message, opts) {
  if (!input) return;
  const errorId = resolveErrorId(input, opts);
  if (!errorId) return;

  const el = ensureErrorElement(input, errorId);
  if (!el) return;

  if (el.textContent !== message) el.textContent = message;
  el.hidden = false;

  input.setAttribute('aria-invalid', 'true');
  input.classList.add('input-error');
  linkDescribedBy(input, errorId);
}

/**
 * Clear a validation error from `input`: empty and re-hide its error span,
 * unlink it, drop the `.input-error` border and reset `aria-invalid`.
 *
 * @param {HTMLElement} input
 * @param {{errorId?: string}} [opts]
 */
export function clearFieldError(input, opts) {
  if (!input) return;
  const errorId = resolveErrorId(input, opts);
  if (errorId) {
    const el = document.getElementById(errorId);
    if (el) {
      el.textContent = '';
      el.hidden = true;
    }
    unlinkDescribedBy(input, errorId);
  }
  input.classList.remove('input-error');
  input.setAttribute('aria-invalid', 'false');
}
