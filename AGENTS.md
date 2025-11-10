# Agent Documentation

This file provides guidance for AI coding agents (Claude, GitHub Copilot, etc.) working on the Athletics Utils project.

## Project Overview

**Athletics Utils** is a Progressive Web App (PWA) providing athletics (track & field) calculators. It's built with vanilla JavaScript, HTML, and CSS using Vite as the build tool.

### Key Technologies
- **Vite** - Build tool with multi-page support
- **Vanilla JavaScript (ES6+)** - No framework overhead
- **CSS3** with CSS Variables for theming
- **Workbox** - Service worker and PWA capabilities
- **World Athletics Scoring Tables (2025)** - Official scoring data

## Architecture

### Important: Project Root Structure

**The web application lives in the `web/` directory.** This is configured via `root: 'web'` in `vite.config.js`. When working with the project:
- All web files (HTML, JS, CSS) are in `web/`
- Vite serves from `web/` as the root
- Build output goes to `dist/` at the repository root
- Always include the `web/` prefix when referencing paths in configuration files

### Multi-Page Architecture

The project uses Vite's multi-page support with:
- **Home Page** (`web/index.html`) - Landing page
- **Calculator Pages** (`web/calculators/*.html`) - Individual tool pages
- **Shared Components** - Reusable across pages
- **Code Splitting** - Each page loads only what it needs

### Directory Structure

**Important**: The web application lives in the `web/` directory (configured via `root: 'web'` in `vite.config.js`). All paths below are relative to the repository root.

```
AthleticsUtils/
├── web/                          # Web application root (Vite root directory)
│   ├── index.html                # Home page (landing page)
│   ├── calculators/              # Individual calculator pages
│   │   └── score.html            # World Athletics Score Calculator
│   ├── public/                   # Static assets (not processed by Vite)
│   │   ├── data/                 # Data files
│   │   │   ├── athletics_scoring_tables.min.json  # ~3MB scoring data
│   │   │   └── events_config.json                 # Event metadata/configuration
│   │   └── icons/                # PWA icons
│   └── src/                      # Source files (processed by Vite)
│       ├── styles/
│       │   ├── variables.css     # CSS custom properties (colors, spacing, etc.)
│       │   ├── main.css          # Global styles
│       │   ├── components/       # Component-specific styles
│       │   │   └── navigation.css
│       │   └── pages/            # Page-specific styles
│       │       └── home.css
│       └── js/
│           ├── main.js           # Main application entry point
│           ├── pages/            # Page entry points
│           │   ├── home.js       # Home page logic
│           │   └── score-calculator.js  # Score calculator page logic
│           ├── components/       # Reusable components
│           │   ├── navigation.js # Shared navigation bar
│           │   └── calculator-base.js  # Base calculator class
│           ├── calculators/      # Calculator-specific logic
│           │   └── performance-lookup.js  # Performance lookup logic
│           ├── data/             # Data management
│           │   ├── scoring-data-loader.js    # Loads & caches scoring data
│           │   └── event-config-loader.js    # Loads & caches event config
│           └── utils/            # Utility functions
│               └── performance-parser.js  # Parse time/distance inputs
├── tools/                        # Build/development tools
│   └── scoring-table-extractor/  # PDF extraction tool for scoring tables
│       ├── index.js              # Main extraction script
│       ├── events-config.js      # Event configuration generator
│       ├── package.json          # Tool dependencies
│       └── *.pdf                 # Source PDF files
├── dist/                         # Build output (generated, not in git)
├── .github/                      # GitHub configuration
│   └── workflows/
│       └── deploy.yml            # GitHub Actions deployment workflow
├── vite.config.js                # Vite configuration (note: root = 'web')
└── package.json                  # Project dependencies and scripts
```

## Key Files and Their Purpose

### Configuration Files
- **`vite.config.js`** - Vite configuration with multi-page setup (sets `root: 'web'`)
- **`package.json`** - Dependencies and npm scripts
- **`.gitignore`** - Git ignore patterns
- **`.github/workflows/deploy.yml`** - GitHub Actions auto-deployment

### Entry Points
- **`web/index.html`** - Home page (main entry)
- **`web/calculators/score.html`** - Score calculator page entry
- **`web/src/js/main.js`** - Main application entry point
- **`web/src/js/pages/home.js`** - Home page JavaScript
- **`web/src/js/pages/score-calculator.js`** - Score calculator JavaScript

### Core Components
- **`web/src/js/components/navigation.js`** - Navigation bar (used on all pages)
- **`web/src/js/components/calculator-base.js`** - Base class for calculators
- **`web/src/js/data/scoring-data-loader.js`** - Loads scoring data with caching
- **`web/src/js/data/event-config-loader.js`** - Loads event configuration with caching
- **`web/src/js/utils/performance-parser.js`** - Parses user input (times/distances)

### Styling
- **`web/src/styles/variables.css`** - CSS custom properties (modify for theming)
- **`web/src/styles/main.css`** - Global styles
- **`web/src/styles/components/`** - Component-specific styles
- **`web/src/styles/pages/`** - Page-specific styles

### Data
- **`web/public/data/athletics_scoring_tables.min.json`** - Minified scoring tables (~3MB)
- **`web/public/data/events_config.json`** - Event metadata and configuration
- **`tools/scoring-table-extractor/`** - Tool to extract data from official PDFs

## Development Workflow

### Starting Development
```bash
npm run dev    # Start dev server at http://localhost:5173
```

### Building for Production
```bash
npm run build   # Build to dist/
npm run preview # Preview production build
```

### Deployment
```bash
npm run deploy  # Build and deploy to GitHub Pages
```

## Coding Conventions

### JavaScript
- **ES6+ Module Syntax** - Use `import`/`export`
- **Classes for Components** - Use class syntax for reusable components
- **Async/Await** - Prefer over promises for readability
- **Descriptive Names** - Use clear, descriptive variable/function names
- **Comments** - Add JSDoc comments for public methods

### File Organization
- **One Component Per File** - Each component in its own file
- **Group by Feature** - Related files go in the same directory
- **Index Files** - Avoid `index.js` files, use descriptive names

### CSS
- **CSS Variables** - Define in `variables.css`, use throughout
- **Component Scoping** - Prefix classes with component name (e.g., `.nav-*`)
- **Mobile First** - Write mobile styles first, then desktop
- **BEM-like Naming** - Use `.block__element--modifier` pattern

### HTML
- **Semantic HTML** - Use appropriate semantic elements
- **Accessibility** - Include ARIA labels where needed
- **Progressive Enhancement** - Works without JavaScript for basic navigation

## Adding New Features

### Adding a New Calculator

1. **Create HTML page** in `web/calculators/`
   ```html
   <!-- web/calculators/new-calculator.html -->
   <!DOCTYPE html>
   <html lang="en">
   <head>
     <title>New Calculator - Athletics Utils</title>
     <link rel="stylesheet" href="/src/styles/main.css">
   </head>
   <body>
     <!-- Include navigation -->
     <!-- Add your UI -->
     <script type="module" src="/src/js/pages/new-calculator.js"></script>
   </body>
   </html>
   ```

2. **Create page script** in `web/src/js/pages/`
   ```javascript
   // web/src/js/pages/new-calculator.js
   import { Navigation } from '../components/navigation.js';
   import { BaseCalculator } from '../components/calculator-base.js';

   class NewCalculator extends BaseCalculator {
     async initialize() {
       await super.initialize();
       Navigation.initialize();
       this.setupEventListeners();
     }

     setupEventListeners() {
       // Add event listeners
     }

     handleCalculate() {
       // Your calculator logic
     }
   }

   const calculator = new NewCalculator({ /* selectors */ });
   calculator.initialize();
   ```

3. **Update `vite.config.js`** - Add to `rollupOptions.input`:
   ```javascript
   newCalculator: resolve(__dirname, 'web/calculators/new-calculator.html')
   ```

4. **Update navigation** - Add link in:
   - `web/index.html` (home page tools grid)
   - All HTML pages' navigation sections

5. **Test**
   ```bash
   npm run dev    # Test locally
   npm run build  # Verify build works
   ```

### Extending BaseCalculator

Most calculators should extend `BaseCalculator`:

```javascript
class YourCalculator extends BaseCalculator {
  constructor(config) {
    super(config);
    // Your constructor code
  }

  async initialize() {
    await super.initialize();  // Loads scoring data
    // Your initialization code
  }

  handleCalculate() {
    // Override to implement your calculator logic
  }
}
```

`BaseCalculator` provides:
- `this.scoringData` - Loaded scoring tables
- `this.currentGender` - Selected gender
- `this.currentEvent` - Selected event
- Gender/event selection handling
- Data loading with error handling

## Common Tasks

### Updating Scoring Data

When World Athletics releases new tables:

1. Place PDF in `tools/scoring-table-extractor/`
2. Run extraction:
   ```bash
   cd tools/scoring-table-extractor
   npm install  # First time only
   npm run publish
   ```
3. Verify: `npm run validate athletics_scoring_tables.json`
4. Test website: `npm run dev` (from project root)

### Adding New Styles

1. **Global styles** → `web/src/styles/main.css`
2. **Variables** → `web/src/styles/variables.css`
3. **Component styles** → `web/src/styles/components/component-name.css`
4. **Page styles** → `web/src/styles/pages/page-name.css`

Import in HTML:
```html
<link rel="stylesheet" href="/src/styles/main.css">
<link rel="stylesheet" href="/src/styles/pages/your-page.css">
```

### Adding Utility Functions

Create in `web/src/js/utils/`:
```javascript
// web/src/js/utils/your-utility.js
export function yourFunction() {
  // Implementation
}
```

Import where needed:
```javascript
import { yourFunction } from '../utils/your-utility.js';
```

## Data Management

### Scoring Data Format

The scoring data is structured as:
```json
{
  "men": {
    "100m": {
      "eventName": "100 Metres",
      "performances": [
        { "mark": "10.00", "points": 1300 },
        ...
      ]
    },
    ...
  },
  "women": { ... }
}
```

### Loading Data

Use `ScoringDataLoader`:
```javascript
import { ScoringDataLoader } from '../data/scoring-data-loader.js';

const dataLoader = new ScoringDataLoader();
const scoringData = await dataLoader.loadScoringData();
```

Data is cached in memory after first load.

### Event Configuration Data

The event configuration provides metadata about athletics events:
```json
{
  "primaryEvents": ["100m", "200m", ...],
  "events": {
    "100m": {
      "displayName": "100m",
      "measurementFormat": "time",
      "category": "sprints",
      "distance": 100,
      "unit": "metres"
    },
    ...
  }
}
```

Use `EventConfigLoader`:
```javascript
import { EventConfigLoader } from '../data/event-config-loader.js';

const configLoader = new EventConfigLoader();
const eventConfig = await configLoader.load();
```

Data is cached in memory after first load.

### Performance Parsing

Use `PerformanceParser` for user input:
```javascript
import { PerformanceParser } from '../utils/performance-parser.js';

// Parse time input (e.g., "10.5" or "1:30.5")
const seconds = PerformanceParser.parseTimeToSeconds("1:30.5");

// Parse distance input (e.g., "7.50")
const meters = PerformanceParser.parseDistance("7.50");
```

## Testing Checklist

When making changes, verify:

- [ ] `npm run dev` - Development server starts without errors
- [ ] All pages load correctly
- [ ] Navigation works between pages
- [ ] Calculator functionality works as expected
- [ ] Responsive design works on mobile/tablet/desktop
- [ ] No console errors or warnings
- [ ] `npm run build` - Build succeeds without errors
- [ ] `npm run preview` - Production build works correctly

## Performance Considerations

- **Lazy Load Large Data** - Scoring data (1.45MB) is loaded on demand
- **Cache Data** - Once loaded, data is cached in memory
- **Code Splitting** - Each page loads only its required JavaScript
- **Minimal Dependencies** - Vanilla JS keeps bundle size small
- **PWA Caching** - Service worker caches assets for offline use

## Browser Support

Target modern browsers with ES6+ support:
- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

No polyfills are included by default.

## Debugging Tips

### Common Issues

1. **Data not loading** - Check browser console for fetch errors
2. **Styles not applying** - Verify CSS imports in HTML
3. **Calculator not working** - Check event listeners are attached
4. **Build errors** - Check `vite.config.js` includes all pages

### Useful Commands

```bash
# Clear build cache
rm -rf dist/
npm run build

# Check for JavaScript errors
npm run build  # Vite shows errors during build

# Test production build locally
npm run preview
```

## Important Notes for AI Agents

### When Modifying Code

1. **Read existing code first** - Understand patterns before changing
2. **Follow existing conventions** - Match the project's style
3. **Test changes** - Run `npm run dev` after modifications
4. **Update documentation** - Keep README.md in sync with changes
5. **Consider multi-page architecture** - Changes may affect multiple pages

### File Modification Guidelines

- **DON'T modify** `web/public/data/athletics_scoring_tables.min.json` manually
  - Regenerate using the extraction tool in `tools/scoring-table-extractor/`
- **DON'T modify** `web/public/data/events_config.json` manually
  - Regenerate using the extraction tool's `events-config.js` script
- **DON'T add frameworks** - Project uses vanilla JavaScript by design
- **DO extend BaseCalculator** - For new calculators
- **DO use CSS variables** - For theming and consistency
- **DO update vite.config.js** - When adding new pages (remember `web/` prefix in paths)

### Code Quality

- Write clear, self-documenting code
- Add comments for complex logic
- Keep functions small and focused
- Use descriptive variable names
- Follow existing patterns in the codebase

## Resources

- **README.md** - User-facing documentation
- **DEPLOYMENT.md** - Deployment instructions
- **tools/scoring-table-extractor/README.md** - Data extraction tool docs
- **Vite Documentation** - https://vitejs.dev/
- **World Athletics** - https://www.worldathletics.org/

## Questions or Issues?

If you encounter issues or need clarification:
1. Check existing code for similar patterns
2. Review README.md and DEPLOYMENT.md
3. Examine the working score calculator as a reference
4. Test thoroughly with `npm run dev` and `npm run build`
