/**
 * aria-describedby helpers.
 *
 * `aria-describedby` takes a space-separated list of ids. Inputs in this
 * codebase often start life describing their form-help text (set in HTML
 * at build time), then transiently also describe the central error
 * panel while a validation error is on screen.
 *
 * Naive `setAttribute('aria-describedby', errorId)` would clobber the
 * existing form-help link. These two helpers add and remove a single id
 * while leaving any other ids in place.
 *
 * Both are idempotent — calling link() twice with the same id is a
 * no-op, and unlink() on an id that isn't present does nothing.
 *
 * When the last id is removed, the attribute itself is removed so the
 * element returns to its original (attribute-absent) state — matters
 * for inputs that started without any describedby at all.
 */

/** Add `id` to `element`'s aria-describedby, preserving any other ids. */
export function linkDescribedBy(element, id) {
  if (!element || !id) return;
  const tokens = new Set(
    (element.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean)
  );
  if (tokens.has(id)) return;
  tokens.add(id);
  element.setAttribute('aria-describedby', [...tokens].join(' '));
}

/** Remove `id` from `element`'s aria-describedby. */
export function unlinkDescribedBy(element, id) {
  if (!element || !id) return;
  const tokens = (element.getAttribute('aria-describedby') || '')
    .split(/\s+/)
    .filter(Boolean)
    .filter(t => t !== id);
  if (tokens.length === 0) {
    element.removeAttribute('aria-describedby');
  } else {
    element.setAttribute('aria-describedby', tokens.join(' '));
  }
}
