# Athletics Utilities

A modern, lightweight Progressive Web App (PWA) providing athletics (track & field) calculators and utilities. Built with vanilla JavaScript, HTML, and CSS for maximum performance and minimal bundle size.

## Features

### World Athletics Score Calculator

Also known as: IAAF Points Calculator, World Athletics Points Calculator, IAAF Score Calculator

- **Performance Lookup**: Enter an athletic performance to find its point value using official World Athletics scoring tables
- **Equivalency Calculator**: Discover equivalent performances across all athletics events based on point values
- **Comprehensive Event Coverage**: Supports all major athletics events including:
  - Sprints (100m, 200m, 400m, etc.)
  - Middle distance (800m, 1500m, mile, etc.)
  - Long distance (3000m, 5000m, 10000m, etc.)
  - Hurdles (100mH, 110mH, 400mH)
  - Steeplechase
  - Race walks
  - Field events (Long jump, Triple jump, High jump, Pole vault, Shot put, Discus, Hammer, Javelin)
  - Combined events (Decathlon, Heptathlon, Pentathlon)
  - Relays (4x100m, 4x200m, 4x400m, including mixed)

### Progressive Web App

- **Offline Support**: Works completely offline once loaded
- **Installable**: Add to your home screen on mobile devices or desktop
- **Fast Loading**: Optimized for performance with minimal bundle size
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile

## Tech Stack

- **HTML5** - Semantic markup
- **CSS3** - Modern styling with CSS Variables for easy theming
- **Vanilla JavaScript (ES6+)** - No framework overhead
- **Vite** - Lightning-fast build tool
- **Workbox** - Service worker and PWA capabilities
- **World Athletics Scoring Tables** - Official scoring data (2025)

## Project Structure

```
AthleticsUtils/
├── index.html                                   # Home page (landing page)
├── calculators/
│   └── score.html                               # World Athletics Score Calculator page
├── public/
│   ├── data/
│   │   └── athletics_scoring_tables.min.json  # Scoring tables data (1.45MB)
│   └── icons/                                   # PWA icons
├── src/
│   ├── styles/
│   │   ├── variables.css                       # CSS custom properties
│   │   ├── main.css                            # Global styles
│   │   ├── components/
│   │   │   └── navigation.css                  # Navigation component styles
│   │   └── pages/
│   │       └── home.css                        # Home page styles
│   ├── js/
│   │   ├── pages/
│   │   │   ├── home.js                         # Home page logic
│   │   │   └── score-calculator.js             # Score calculator page logic
│   │   ├── components/
│   │   │   ├── navigation.js                   # Shared navigation component
│   │   │   └── calculator-base.js              # Base calculator component (shared logic)
│   │   ├── calculators/
│   │   │   └── performance-lookup.js           # Calculator logic (reusable)
│   │   ├── data/
│   │   │   └── scoring-data-loader.js          # Data loading & caching
│   │   └── utils/
│   │       └── performance-parser.js           # Performance parsing utilities
├── tools/
│   └── scoring-table-extractor/                # PDF extraction tool
├── vite.config.js                              # Vite configuration (multi-page support)
└── package.json

```

## Architecture

This project uses a **multi-page architecture** with Vite's multi-page support:

- **Home Page** (`/`): Landing page with navigation to all tools
- **Calculator Pages** (`/calculators/*.html`): Individual pages for each calculator tool
- **Shared Components**: Navigation, base calculator logic, and utilities are shared across pages
- **Code Splitting**: Each page loads only the JavaScript it needs
- **Progressive Enhancement**: Works without JavaScript for basic navigation

### Key Components

1. **Navigation Component** ([src/js/components/navigation.js](src/js/components/navigation.js))

   - Shared navigation bar across all pages
   - Highlights active page

2. **Base Calculator** ([src/js/components/calculator-base.js](src/js/components/calculator-base.js))

   - Shared calculator functionality (gender/event selection, data loading)
   - Extended by specific calculator pages

3. **Page Scripts** ([src/js/pages/](src/js/pages/))
   - Page-specific logic
   - Extends base components as needed

## Getting Started

### Prerequisites

- Node.js 14.0.0 or higher
- npm (comes with Node.js)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/NikolaosFlabouris/AthleticsUtils.git
cd AthleticsUtils
```

2. Install dependencies:

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

This will start Vite's dev server at `http://localhost:5173` with hot module replacement.

### Building for Production

Build the project:

```bash
npm run build
```

The optimized files will be in the `dist/` directory.

Preview the production build:

```bash
npm run preview
```

### Deployment

The site is designed to be deployed to GitHub Pages. The build command creates optimized static files that can be served from any static hosting service.

To deploy to GitHub Pages:

```bash
npm run deploy
```

## Usage

1. **Select Gender**: Choose Men, Women, or Mixed
2. **Select Event**: Pick from the comprehensive list of athletics events
3. **Enter Performance**: Input your performance (e.g., "10.5" for 10.5 seconds, or "7.50" for 7.50 meters)
4. **Calculate**: View your point score and equivalent performances across all events

### Input Formats

- **Time events**: Enter as seconds (e.g., "10.5") or minutes:seconds (e.g., "1:30.5")
- **Distance events**: Enter as meters (e.g., "7.50" for 7.50m)

## Data Source

The scoring tables are based on the **World Athletics Scoring Tables of Athletics (2025)**. The data is extracted from official PDF documents using the custom extraction tool located in [tools/scoring-table-extractor/](tools/scoring-table-extractor/).

### Updating Scoring Data

When new scoring tables are released by World Athletics:

1. **Download the PDF**

   - Place in `tools/scoring-table-extractor/` directory
   - Name it `World_Athletics_Scoring_Tables_of_Athletics_2025.pdf` (or update package.json)

2. **Extract and Publish**

   ```bash
   cd tools/scoring-table-extractor
   npm install  # First time only
   npm run publish
   ```

3. **Verify**

   ```bash
   npm run validate athletics_scoring_tables.json
   ```

4. **Test the Website**
   ```bash
   cd ../..  # Back to project root
   npm run dev
   ```
   Navigate to the Performance Calculator and verify data loads correctly.

The extraction tool automatically:

- Parses the PDF and extracts all scoring data
- Generates a minified JSON file (1.4MB)
- **Publishes it to `public/data/athletics_scoring_tables.min.json`** for the website to use

For more details, see the [Scoring Table Extractor README](tools/scoring-table-extractor/README.md).

## Adding New Tools

The multi-page architecture makes it easy to add new calculator tools. Follow these steps:

### 1. Create a new HTML page

Create `calculators/your-tool.html` based on the [score.html](calculators/score.html) template:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <!-- Update title and description -->
    <title>Your Tool - Athletics Utilities</title>
    <!-- Include main.css and any page-specific CSS -->
  </head>
  <body>
    <!-- Include navigation with correct active link -->
    <!-- Add your tool's UI -->
    <!-- Link to your page script -->
    <script type="module" src="/src/js/pages/your-tool.js"></script>
  </body>
</html>
```

### 2. Create page logic

Create `src/js/pages/your-tool.js`:

```javascript
import { Navigation } from "../components/navigation.js";
import { BaseCalculator } from "../components/calculator-base.js";

class YourTool extends BaseCalculator {
  async initialize() {
    await super.initialize();
    Navigation.initialize();
  }

  handleCalculate() {
    // Your calculator logic here
  }
}

const calculator = new YourTool({
  /* selectors */
});
calculator.initialize();
```

### 3. Update Vite config

Add your page to `vite.config.js`:

```javascript
rollupOptions: {
  input: {
    main: resolve(__dirname, 'index.html'),
    score: resolve(__dirname, 'calculators/score.html'),
    yourTool: resolve(__dirname, 'calculators/your-tool.html') // Add this
  }
}
```

### 4. Update navigation

Add a link to your tool in:

- [index.html](index.html) (home page tools grid)
- Navigation component in all pages

### 5. Build and test

```bash
npm run dev    # Test locally
npm run build  # Build for production
```

## Future Tools

Planned additions to the Athletics Utilities suite:

- Pace calculators
- Training zone calculators
- Meet scoring tools
- Performance projection calculators

## Browser Support

Targets modern browsers with ES6+ support:

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

## Performance

- **Bundle Size**: ~50-100KB (excluding data JSON)
- **Data Size**: 1.45MB (minified JSON, cached for offline use)
- **Load Time**: < 2 seconds on 3G networks
- **Lighthouse Score**: 95+ on all metrics

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

ISC

## Acknowledgments

- World Athletics for the official scoring tables
- The open-source community for the excellent tools and libraries

## Contact

For questions, issues, or suggestions, please open an issue on GitHub:
https://github.com/NikolaosFlabouris/AthleticsUtils/issues
