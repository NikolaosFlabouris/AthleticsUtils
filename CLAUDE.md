# Claude Code Context

This file provides context for Claude Code (Anthropic's official CLI) when working on the Athletics Utilities project.

## Project Overview

**Athletics Utilities** is a Progressive Web App (PWA) providing athletics (track & field) calculators. It's built with vanilla JavaScript, HTML, and CSS using Vite as the build tool.

**Live Site**: https://athleticsutils.com/
**Repository**: https://github.com/NikolaosFlabouris/AthleticsUtils

## Quick Reference

### Project Structure

```
AthleticsUtils/
├── web/                          # Web application root (Vite root)
│   ├── index.html                # Landing page
│   ├── calculators/              # Calculator pages
│   │   └── score.html            # World Athletics Score Calculator
│   ├── src/                      # Source files
│   │   ├── js/
│   │   │   ├── main.js           # Main app entry point
│   │   │   ├── pages/            # Page-specific logic
│   │   │   ├── components/       # Reusable components
│   │   │   ├── calculators/      # Calculator logic
│   │   │   ├── data/             # Data loaders
│   │   │   └── utils/            # Utility functions
│   │   └── styles/               # CSS files
│   └── public/                   # Static assets
│       ├── data/                 # Data files (~3MB JSON)
│       └── icons/                # PWA icons
├── tools/                        # Build/development tools
│   └── scoring-table-extractor/  # PDF extraction tool
├── dist/                         # Build output (generated)
├── vite.config.js                # Vite configuration
└── package.json                  # Dependencies & scripts
```

### Key Technologies

- **Vite 7** - Build tool with multi-page support
- **Vanilla JavaScript (ES6+)** - No framework
- **CSS3** with CSS Variables
- **Workbox** - PWA capabilities
- **World Athletics Scoring Tables (2025)** - Official data

### Common Commands

```bash
npm run dev      # Start dev server (http://localhost:5173)
npm run build    # Build for production (outputs to dist/)
npm run preview  # Preview production build
npm run deploy   # Build and deploy to GitHub Pages
```

## Important Notes

### Vite Configuration

The project uses **`root: 'web'`** in [vite.config.js](vite.config.js), meaning:

- All web files are in the [`web/`](web/) directory
- When referencing paths, remember they're relative to `web/`
- Build output goes to [`dist/`](dist/) at repository root

### Multi-Page Architecture

- Home page: [`web/index.html`](web/index.html)
- Calculators: [`web/calculators/*.html`](web/calculators/)
- Each page has its own entry point in [`web/src/js/pages/`](web/src/js/pages/)
- Add new pages to `vite.config.js` `rollupOptions.input`

### Data Files

1. **Scoring Tables** (`web/public/data/athletics_scoring_tables.min.json`)

   - Size: ~3MB (3,079,906 bytes)
   - Source: World Athletics official PDFs
   - Cached by service worker for offline use

2. **Events Config** (`web/public/data/events_config.json`)
   - Event metadata (display names, categories, formats)
   - Used for UI rendering and validation

### Code Organization

**Components** ([`web/src/js/components/`](web/src/js/components/)):

- `navigation.js` - Shared navigation bar
- `calculator-base.js` - Base calculator class (extend this)

**Data Loaders** ([`web/src/js/data/`](web/src/js/data/)):

- `scoring-data-loader.js` - Loads scoring tables with caching
- `event-config-loader.js` - Loads event configuration

**Utilities** ([`web/src/js/utils/`](web/src/js/utils/)):

- `performance-parser.js` - Parse/format times and distances

## Development Workflow

### Adding a New Calculator

1. **Create HTML page**: `web/calculators/your-tool.html`
2. **Create page script**: `web/src/js/pages/your-tool.js`
3. **Update Vite config**: Add to `rollupOptions.input` in [vite.config.js](vite.config.js)
4. **Update navigation**: Add links in all HTML pages
5. **Test**: `npm run dev` and verify

Example page script:

```javascript
import { Navigation } from "../components/navigation.js";
import { BaseCalculator } from "../components/calculator-base.js";

class YourCalculator extends BaseCalculator {
  async initialize() {
    await super.initialize();
    Navigation.initialize();
    this.setupEventListeners();
  }

  handleCalculate() {
    // Your logic here
  }
}

const calculator = new YourCalculator({
  /* config */
});
calculator.initialize();
```

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
4. Test: `npm run dev` from project root

The tool automatically publishes to `web/public/data/athletics_scoring_tables.min.json`.

## Code Conventions

### JavaScript

- ES6+ modules (`import`/`export`)
- Classes for components
- Async/await for asynchronous code
- JSDoc comments for public methods

### CSS

- CSS Variables in [`web/src/styles/variables.css`](web/src/styles/variables.css)
- Component scoping (e.g., `.nav-*` for navigation)
- Mobile-first responsive design
- BEM-like naming (`.block__element--modifier`)

### File Organization

- One component per file
- Descriptive file names (no `index.js`)
- Group related files together

## Deployment

### GitHub Pages

- Site deploys to: https://athleticsutils.com/
- Base path: `/` (root domain, configured in [vite.config.js](vite.config.js))
- Deployment: `npm run deploy` (builds and pushes to `gh-pages` branch)
- Auto-deploy via GitHub Actions on push to `main`

### Build Output

- Location: [`dist/`](dist/)
- Multi-page structure preserved
- Assets in `dist/assets/`
- Service worker generated for PWA

## Browser Support

Modern browsers with ES6+ support:

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

## Important Constraints

### DO NOT:

- Modify `web/public/data/athletics_scoring_tables.min.json` manually
  - Regenerate using the extraction tool
- Add frameworks or libraries
  - Project intentionally uses vanilla JavaScript
- Skip updating `vite.config.js` when adding pages
  - Pages won't build without being listed

### DO:

- Extend `BaseCalculator` for new calculators
- Use CSS variables for theming
- Test with `npm run dev` before committing
- Update navigation when adding new pages
- Follow existing code patterns

## Troubleshooting

### Common Issues

1. **Data not loading**: Check browser console for fetch errors to `data/*.json`
2. **Styles not applying**: Verify CSS imports in HTML files
3. **Page not found in dev**: Check `vite.config.js` includes the page
4. **Build errors**: Ensure all pages are in `rollupOptions.input`

### Debugging Commands

```bash
# Clear build cache
rm -rf dist/
npm run build

# Check for errors
npm run build  # Vite shows errors during build

# Test production build
npm run preview
```

## Project Goals

- **Performance**: Fast loading, minimal bundle size
- **Offline-first**: Full PWA support with service workers
- **Accessibility**: Semantic HTML, ARIA labels
- **Maintainability**: Clean, well-documented code
- **No framework overhead**: Vanilla JavaScript for speed

## Additional Resources

- [README.md](README.md) - User-facing documentation
- [AGENTS.md](AGENTS.md) - Detailed agent documentation
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment instructions
- [tools/scoring-table-extractor/README.md](tools/scoring-table-extractor/README.md) - Data extraction docs
- [Vite Documentation](https://vitejs.dev/)
- [World Athletics](https://www.worldathletics.org/)

## Need Help?

1. Check existing code for similar patterns
2. Review README.md and DEPLOYMENT.md
3. Examine the score calculator as a reference implementation
4. Test thoroughly with `npm run dev` and `npm run build`
