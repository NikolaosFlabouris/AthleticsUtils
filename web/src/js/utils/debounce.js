/**
 * Tiny trailing-edge debounce.
 *
 * Returns a wrapped function that delays invoking `fn` until `wait` ms
 * have elapsed since the last call. Re-uses a single timer so rapid
 * input events (typing into a field that auto-recalculates) coalesce
 * into one execution.
 *
 * Used by the auto-recalculating calculators (age, time) to avoid
 * thrashing the aria-live results region as the user types — a screen
 * reader gets one announcement when the user pauses, not one per
 * keystroke.
 *
 * The wrapper exposes `.cancel()` for cleanup paths (mode switches,
 * etc.) that need to drop a pending invocation.
 *
 * @param {Function} fn   Function to debounce
 * @param {number}   wait Delay in milliseconds (default 300)
 * @returns {Function & { cancel: () => void }}
 */
export function debounce(fn, wait = 300) {
  let timer = null;
  const debounced = function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn.apply(this, args);
    }, wait);
  };
  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  return debounced;
}
