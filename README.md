<div align="center">

<img src="web/public/icons/icon.svg" alt="Athletics Utilities logo" width="96" height="96" />

# Athletics Utilities

**Tools tuned for the sport of Athletics.**

Five focused calculators for track and field — pace, World Athletics points, combined events, age, and time. Free, fast, no signup, runs offline.

[![Live site](https://img.shields.io/badge/live-athleticsutils.com-ECD24A?style=flat-square&labelColor=0E1118)](https://athleticsutils.com/)
[![Deploy](https://github.com/NikolaosFlabouris/AthleticsUtils/actions/workflows/deploy.yml/badge.svg)](https://github.com/NikolaosFlabouris/AthleticsUtils/actions/workflows/deploy.yml)
[![PWA](https://img.shields.io/badge/PWA-installable-5a5dff?style=flat-square&labelColor=0E1118)](https://athleticsutils.com/)
[![Built with Vite](https://img.shields.io/badge/Vite-7-646cff?style=flat-square&logo=vite&logoColor=white&labelColor=0E1118)](https://vitejs.dev)
[![Vanilla JS](https://img.shields.io/badge/JS-vanilla%20ES6%2B-f7df1e?style=flat-square&labelColor=0E1118)](#tech-stack)
[![Data: World Athletics 2025](https://img.shields.io/badge/data-World%20Athletics%202025-d24a25?style=flat-square&labelColor=0E1118)](#data-source)
[![License: PolyForm NC 1.0.0](https://img.shields.io/badge/license-PolyForm%20NC%201.0.0-8c2a10?style=flat-square&labelColor=0E1118)](LICENSE)
[![Donate via PayPal](https://img.shields.io/badge/donate-PayPal-d24a25?style=flat-square&logo=paypal&logoColor=white&labelColor=0E1118)](https://www.paypal.com/donate/?hosted_button_id=7U6M8TUA354QL)

</div>

---

## Overview

Athletics Utilities is a Progressive Web App built with vanilla JavaScript and Vite — no framework, no tracking, no backend. Every calculation runs locally in the browser, and once loaded the site works completely offline. The interface ships in two themes ("Dark" and "Light", internally `lane` and `track`) inspired by lane markings and editorial print.

The site is deployed to GitHub Pages on every push to `main` and served from the custom domain [athleticsutils.com](https://athleticsutils.com/).

### Highlights

- 🏃 Five calculators covering the most common pace, scoring, and admin tasks in athletics
- 📊 Official **World Athletics Scoring Tables (2025)** built into the bundle
- 📦 Installable PWA — works offline after first load, with one-tap install on mobile and desktop
- ⚡ Zero-runtime-dependency frontend; ~3 MB of scoring data is split per gender and lazy-loaded on demand
- 🎨 Two distinct themes with full-page restyling, not just a colour swap
- 🔒 No analytics, no cookies, no accounts — see [`/privacy`](https://athleticsutils.com/privacy.html)

---

## The Calculators

### 01 · Pace & Speed — [`/calculators/pace.html`](https://athleticsutils.com/calculators/pace.html)

Convert between target time, pace, and speed for any distance. Built for sessions where you already know two of the three and need the third — and want to see the splits.

- Three modes: **time → pace**, **pace → time**, and a third tied to the distance/speed pair
- Accepts pace input in `min/km`, `min/mile`, `min/400m`, `min/200m`, `min/100m`; output shows all equivalents plus `km/h`, `mph`, `m/s`
- Auto-generates split tables at common race intervals (every km, every mile, every lap)
- Performance parsing tolerates `3:45`, `3:45.20`, bare seconds, and mixed units — implemented in [`web/src/js/utils/performance-parser.js`](web/src/js/utils/performance-parser.js)
- Core math is DOM-free and lives in [`web/src/js/calculators/pace-calculations.js`](web/src/js/calculators/pace-calculations.js)

### 02 · World Athletics Score — [`/calculators/score.html`](https://athleticsutils.com/calculators/score.html)

Convert any track or field performance into World Athletics points using the official 2025 scoring tables, and find equivalent performances across other events.

- Covers every event in the published tables: sprints, middle/long distance, hurdles, steeplechase, race walks, jumps, throws, combined events, and relays
- Tables are pre-extracted from the official PDF into `scoring-men.min.json` and `scoring-women.min.json` (~1.5 MB each) and fetched on demand
- Follows the World Athletics rule that performances between two table entries are awarded the **lower** of the two scores — no interpolation
- Applies hand-timing offsets where applicable, configurable per event in `events_config.json`
- Lookup logic in [`web/src/js/calculators/performance-lookup.js`](web/src/js/calculators/performance-lookup.js); scoring data is cached after first fetch via a Workbox `CacheFirst` strategy

### 03 · Combined Events — [`/calculators/combined-events.html`](https://athleticsutils.com/calculators/combined-events.html)

Score Decathlon, Heptathlon, and Pentathlon performances using the official combined-events formula — separate from the lookup tables used by the WA Score calculator.

- Implements the standard combined-events formulas directly, with per-event `a`, `b`, `c` parameters stored in `combined-event-config.min.json`:
  - **Track:** `P = a × (b − T)^c`
  - **Jumps:** `P = a × (M − b)^c`
  - **Throws:** `P = a × (D − b)^c`
- Points are floored to whole numbers per the World Athletics specification
- Running total updates live as each discipline is filled in
- Formula implementation in [`web/src/js/utils/combined-events-scorer.js`](web/src/js/utils/combined-events-scorer.js)

### 04 · Age — [`/calculators/age.html`](https://athleticsutils.com/calculators/age.html)

Compute exact age between two dates, plus the athletics age-group readouts used for end-of-year competition eligibility.

- Returns years, months, and days — not just decimal years — using calendar-aware arithmetic
- Dates are parsed in the browser's **local** timezone so calendar dates aren't shifted east/west of UTC (see comments in [`web/src/js/calculators/age-calculations.js`](web/src/js/calculators/age-calculations.js))
- Supports both directions: `date + date → age` and `date ± age → date`
- Surfaces the athletics-specific age cutoffs (e.g. age as of 31 December) used by most national federations

### 05 · Time — [`/calculators/time.html`](https://athleticsutils.com/calculators/time.html)

A calculator-paper-tape for athletics times. Chain rows of additions and subtractions, or break down a multiplication or division step-by-step.

- Accepts `SS`, `MM:SS(.ss)`, `HH:MM:SS(.ss)`, and signed values like `-1:52`
- All arithmetic is performed in floating-point seconds, then formatted back into the most appropriate unit — so sub-second precision survives through the chain
- Multiplication and division show a step-by-step breakdown rather than just a final result
- Parsing and arithmetic are DOM-free and live in [`web/src/js/calculators/time-calculations.js`](web/src/js/calculators/time-calculations.js)

---

## Architecture

**Vanilla JS + Vite multi-page**, with each calculator served as its own HTML entry point so users only download the JavaScript and CSS for the page they're on.

```
AthleticsUtils/
├── web/                          # Vite root (see vite.config.js: root = 'web')
│   ├── index.html                # Landing page
│   ├── privacy.html              # Privacy notice
│   ├── calculators/              # One HTML file per calculator
│   │   ├── pace.html
│   │   ├── score.html
│   │   ├── combined-events.html
│   │   ├── age.html
│   │   └── time.html
│   ├── public/                   # Served as-is (icons, OG images, scoring data)
│   │   ├── data/                 # Per-gender scoring tables + event configs
│   │   └── icons/                # PWA icons, favicons, OG images, UI SVGs
│   └── src/
│       ├── js/
│       │   ├── pages/            # Page entry points (one per HTML file)
│       │   ├── components/       # Shared UI: navigation, theme toggle, calculator base
│       │   ├── calculators/      # Pure calculation engines (DOM-free, unit-testable)
│       │   ├── data/             # Loaders with in-memory + Workbox caching
│       │   └── utils/            # Parsing, formatting, URL params, PWA updater
│       └── styles/
│           ├── main.css          # Global styles
│           └── theme.css         # Two-theme design system (lane / track)
├── tools/
│   └── scoring-table-extractor/  # Node script that turns the WA PDF into JSON
├── .github/workflows/deploy.yml  # GitHub Pages deploy on push to main
├── vite.config.js                # Multi-page input + vite-plugin-pwa config
└── package.json
```

### Tech Stack

- **[Vite 7](https://vitejs.dev/)** — multi-page bundler with code splitting per entry point
- **[vite-plugin-pwa](https://vite-pwa-org.netlify.app/)** + **Workbox** — service worker, offline cache, install prompt
- **Vanilla JavaScript (ES6+ modules)** — no framework runtime
- **CSS3 with custom properties** — two complete design systems sharing one variable namespace
- **GitHub Actions + GitHub Pages** — auto-deploy on push to `main`

---

## Running Locally

### Prerequisites

- Node.js **18+** (the GitHub Actions workflow pins Node 26)
- npm

### Setup

```bash
git clone https://github.com/NikolaosFlabouris/AthleticsUtils.git
cd AthleticsUtils
npm install
```

### Scripts

```bash
npm run dev      # Start dev server with HMR  → http://localhost:5173
npm run build    # Production build           → ./dist
npm run preview  # Preview the production build locally
npm run deploy   # Build + push ./dist to the gh-pages branch
```

Vite's `root` is set to `web/`, so paths in `vite.config.js` need the `web/` prefix; pages reference assets with site-absolute paths like `/icons/...` which work in both dev and production.

---

## Data Source

All scoring data comes from the **World Athletics Scoring Tables of Athletics (2025)** — the official PDF published by World Athletics. The repository includes a Node-based extractor that turns the PDF into the JSON files shipped to the browser.

### Updating Scoring Data

When World Athletics releases new tables, drop the new PDF into `tools/scoring-table-extractor/` and run:

```bash
cd tools/scoring-table-extractor
npm install     # first time only
npm run publish # extract PDF → publish to web/public/data/
npm run validate
```

See [`tools/scoring-table-extractor/README.md`](tools/scoring-table-extractor/README.md) for details on the extraction format and validation rules. The web app loads these JSON files at runtime; no rebuild is needed for the data alone (though one is needed to refresh the precache manifest).

---

## Acknowledgments

- **World Athletics** for publishing the official scoring tables and combined-events formulas
- The open-source community behind Vite, Workbox, and the wider PWA toolchain

---

## License

Athletics Utilities is released under the **[PolyForm Noncommercial License 1.0.0](LICENSE)** — a source-available, non-commercial license drafted specifically for software.

You may **freely use, modify, and redistribute** this code for any non-commercial purpose, as long as the license and copyright notice are preserved. **Commercial use requires explicit written permission** from the copyright holder.

> Required Notice: Copyright (c) 2026 Nikolaos Flabouris ([athleticsutils.com](https://athleticsutils.com))

**Note on the scoring data.** The JSON files in `web/public/data/` are derived from the **World Athletics Scoring Tables of Athletics (2025)**, published by World Athletics, and are republished here for reference and educational use with attribution. Marks, event configurations, and formulas remain the work of World Athletics. See the full notice in [LICENSE](LICENSE).

For commercial licensing enquiries, open an issue or contact the author via the repository.

---

## Support

Athletics Utilities is built and maintained in my spare time, and is — and always will be — free for everyone to use. If the site has helped you with a session, a comp, or just a curiosity, any kind of support means the world.

<div align="center">

[![Donate via PayPal](https://img.shields.io/badge/Donate-PayPal-d24a25?style=for-the-badge&logo=paypal&logoColor=white&labelColor=0E1118)](https://www.paypal.com/donate/?hosted_button_id=7U6M8TUA354QL)

</div>

Donations are completely optional and go straight to keeping the site online and improving it. Equally appreciated: a kind word, a feature suggestion, or a bug report. Spotted something off, or have an idea for another calculator? [**Open an issue on GitHub**](https://github.com/NikolaosFlabouris/AthleticsUtils/issues) — every report is read.

Thank you for being here. 🧡
