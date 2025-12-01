# Athletics Utilities

A lightweight Progressive Web App (PWA) providing free athletics (track & field) calculators. Built with vanilla JavaScript for maximum performance.

**Live Site**: https://athleticsutils.com/

## Features

### Pace Calculator
- Calculate pace from time and distance or time from pace and distance
- Split times for various distances
- Pace and speed equivalents (min/km, min/mile, km/h, mph, m/s)
- Support for meters, kilometers, miles, and feet

### World Athletics Score Calculator
- Look up point values for athletic performances using official World Athletics scoring tables (2025)
- Find equivalent performances across all athletics events
- Supports all track and field events: sprints, middle/long distance, hurdles, steeplechase, race walks, jumps, throws, combined events, and relays

### Combined Events Calculator
- Calculate total scores for Decathlon, Heptathlon, and Pentathlon
- Enter performances for each discipline
- Uses official World Athletics scoring tables

### Progressive Web App
- Works offline once loaded
- Installable on mobile and desktop
- Fast loading and responsive design

## Tech Stack

- Vanilla JavaScript (ES6+) - No frameworks
- Vite 7 - Build tool with multi-page support
- Workbox - PWA and offline support
- CSS3 with CSS Variables
- World Athletics Scoring Tables (2025)

## Project Structure

```
AthleticsUtils/
├── web/                          # Web application root (Vite root)
│   ├── index.html                # Landing page
│   ├── calculators/              # Calculator pages
│   │   ├── pace.html
│   │   ├── score.html
│   │   └── combined-events.html
│   ├── src/
│   │   ├── js/                   # JavaScript modules
│   │   │   ├── pages/            # Page-specific logic
│   │   │   ├── components/       # Reusable components
│   │   │   ├── calculators/      # Calculator logic
│   │   │   ├── data/             # Data loaders
│   │   │   └── utils/            # Utility functions
│   │   └── styles/               # CSS files
│   └── public/
│       ├── data/                 # Scoring tables (~3MB JSON)
│       └── icons/                # PWA icons
├── tools/
│   └── scoring-table-extractor/  # PDF to JSON extraction tool
├── dist/                         # Build output (generated)
├── vite.config.js
└── package.json
```

## Getting Started

### Prerequisites
- Node.js 14.0.0 or higher

### Installation
```bash
git clone https://github.com/NikolaosFlabouris/AthleticsUtils.git
cd AthleticsUtils
npm install
```

### Development
```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Build for production
npm run preview  # Preview production build
npm run deploy   # Deploy to GitHub Pages
```

## Data Source

Scoring tables are based on **World Athletics Scoring Tables of Athletics (2025)**, extracted from official PDFs using a custom tool in `tools/scoring-table-extractor/`.

### Updating Scoring Data

When World Athletics releases new tables:
```bash
cd tools/scoring-table-extractor
npm install              # First time only
npm run publish          # Extract PDF and publish to web/public/data/
npm run validate         # Verify data integrity
```

See [tools/scoring-table-extractor/README.md](tools/scoring-table-extractor/README.md) for details.

## Contributing

Contributions welcome! See [CLAUDE.md](CLAUDE.md) for development guidelines and project architecture.

## License

ISC

## Acknowledgments

- World Athletics for the official scoring tables
- The open-source community

---

**Questions or issues?** Open an issue on [GitHub](https://github.com/NikolaosFlabouris/AthleticsUtils/issues)
