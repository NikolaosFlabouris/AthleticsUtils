# Accessibility

Athletics Utilities is built to meet **WCAG 2.1 Level AA** across all five
calculators. This document records the accessibility contract the codebase
maintains so that future contributors can preserve it.

If you find a barrier I haven't covered, please open an issue.

---

## Conformance target

- **WCAG 2.1 AA** for colour contrast, keyboard operability, names and roles,
  status messages, focus visibility, and reflow at 200 % zoom.
- Best-effort conformance with several WCAG 2.2 success criteria (target size,
  consistent help, redundant entry) and platform-specific user preferences
  (`prefers-reduced-motion`, `prefers-color-scheme`, forced-colors mode).
- Tested against the following stack:
  - **NVDA + Firefox** (Windows)
  - **VoiceOver + Safari** (macOS, iOS)
  - **TalkBack + Chrome** (Android)
  - Keyboard-only navigation in Firefox, Chrome, Safari.

---

## Semantics & structure

- One `<h1>` per page, in the `.pagehead`. Calculator-section headings are
  `<h2>` (visually hidden so layout is unchanged but `aria-labelledby` and
  the document outline both resolve correctly).
- `<header>`, `<nav>`, `<main>`, `<footer>` landmarks present on every page;
  the `<nav>` carries `aria-label="Calculators"`.
- The active tab carries `aria-current="page"` both statically and after
  the JS-driven [navigation component](web/src/js/components/navigation.js) hydrates.
- Tables use `<caption class="visually-hidden">` and `<th scope="col">`.

## Keyboard

- **Skip link** (`Skip to main content`) is the first focusable element on
  every page; target is `<main tabindex="-1">`.
- **Focus visibility** — every interactive control has a `:focus-visible`
  outline whose colour adapts per theme so it stays visible on accent /
  ink backgrounds.
- **Segmented mode and gender toggles** — Tab to enter, Arrow/Home/End to
  move between options inside the group, Enter/Space to activate. Wired in
  [`aria-toggle-sync.js`](web/src/js/utils/aria-toggle-sync.js) and applied
  by delegation, so dynamically-rendered toggles (e.g. the time
  calculator's per-row operator) inherit it automatically.
- **History tables**
  - `Tab` reaches the row.
  - `Enter`/`Space` replays the entry.
  - `Alt`+`ArrowUp`/`ArrowDown` reorders the row.
  - `Delete`/`Backspace` removes the row; focus moves to the row that
    takes the vacated slot.
  - Each row also exposes explicit move/delete buttons for users who
    don't know the shortcuts.
- **Collapsible result cards** — `role="button"`, `tabindex="0"`, Enter/Space
  to toggle, `aria-controls` linking the trigger to the panel.

## Screen-reader announcements

- **Results containers** — `aria-live="polite" aria-atomic="false"` on every
  calculator. Auto-recalculating calculators (age, time) wrap their input
  handlers in a 300 ms debounce so the live region announces one final
  result per pause rather than one per keystroke.
- **Errors** — general/system error blocks carry `role="alert"
  aria-live="polite"`. Field-level validation failures render an inline
  `<small class="form-error" role="alert">` next to the offending input
  (see Forms below); the failing input gains `aria-invalid="true"` and the
  red `.input-error` border.
- **Loading indicators** — `role="status" aria-live="polite"`, with the
  spinner glyph itself marked `aria-hidden="true"`.
- **Share / Add-to-History toasts** — created with `role="status"
  aria-live="polite"` so the "Link copied!" confirmation is announced.
- **Theme toggle** — `aria-pressed` reflects the current theme; the
  `aria-label` spells out both the current theme and the destination
  ("Theme: Dark. Switch to Light theme.").

## Forms

- Every input has an associated `<label>` or `aria-label`.
- Format hints and equivalent-distance readouts use `<small class="form-help">`
  with explicit `id` and `aria-describedby` on the input.
- Per-field validation errors use a sibling `<small id="<input-id>-error"
  class="form-error" role="alert" hidden>`. On failure the shared
  `utils/field-error.js` helper fills its text, removes `hidden`, and extends
  the input's `aria-describedby` to include the `-error` id alongside the
  `-help` id; it reverts on the next valid input or a successful submit
  (WCAG 2.1 SC 3.3.1 — identified, associated, announced).
- Numeric inputs declare `inputmode="decimal"` or `"numeric"`; time-format
  text inputs declare `inputmode="numeric" spellcheck="false"` so mobile
  keyboards open the right pad and avoid red-underlining `1:23:45`.
- `enterkeyhint="go"` on Calculate-bound inputs, `"done"` on
  auto-recalc inputs.
- `min`/`max` constraints on the age composite (years 0–200, months 0–11,
  days 0–31).
- Custom checkboxes are 24 × 24 px (WCAG 2.2 target size).

## Visual

- **Colour contrast** — body text and `--ink-2` exceed WCAG AA. `--muted`
  is tuned to clear 4.5:1 on its theme's background; placeholder text uses
  the same `--muted` token with `opacity: 1` so the UA's default opacity
  knockdown doesn't bring it below AA.
- **Focus rings** swap colour against accent and ink backgrounds so the
  ring is always distinguishable from its surroundings.
- **Text floor** of 12 px across every UI label, helper, tab and footer.
  Body base is 16 px so user font-scaling has a sensible anchor.
- **Touch targets** — checkboxes 24 × 24, history move/delete and time-row
  remove buttons 32 × 32, segmented and mini buttons have `min-height: 32px`.

## User preferences honoured

- `prefers-color-scheme` — first visit honours the operating-system
  setting (dark OS → dark theme, light OS → light theme). Once the user
  clicks the theme toggle their choice is persisted and the OS
  preference no longer overrides it. If the OS preference changes
  mid-session for users who haven't pinned a choice, the theme follows
  in real time. The static fallback (no OS preference, no stored
  choice) is **light** — see the bootstrap at
  [`web/src/js/theme-bootstrap.inline.js`](web/src/js/theme-bootstrap.inline.js).
- `prefers-reduced-motion: reduce` — strips non-essential transitions,
  stops the spinner animation, kills hover-arrow translates.
- `prefers-reduced-transparency: reduce` — opaques translucent toasts and
  error-state input backgrounds.
- `forced-colors: active` (Windows High Contrast Mode) — focus rings
  re-anchored to system Highlight; segmented "pressed" state gains a
  Highlight border so it survives palette overrides; checkbox tick uses
  HighlightText.
- `@media print` — strips dark theme, hides site chrome, exposes link URLs.

## Things we deliberately do NOT do

- We do not disable browser zoom; the viewport meta uses
  `width=device-width, initial-scale=1.0` only.
- We do not auto-play media or auto-update the URL on every recalculation
  (auto-recalc still updates the live region and the result panel; the
  URL only changes when the user invokes Share).
- We do not impose time limits or session timeouts.

---

## Reporting an accessibility issue

Open an issue at
<https://github.com/NikolaosFlabouris/AthleticsUtils/issues> with the
heading "a11y: …", the assistive tech and browser you were using, and
what you expected to happen. We treat barrier reports the same as
correctness bugs.
