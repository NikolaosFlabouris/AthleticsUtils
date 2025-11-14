# Combined Events Configuration Minifier

This tool minifies the combined events configuration file and publishes it to the web application's data directory.

## Overview

The `combined-event-config.json` file contains the configuration for IAAF combined events (decathlon, heptathlon, pentathlon), including:
- Event compositions for each combined event
- Age group categories
- Scoring parameters (a, b, c coefficients) for each individual event

This tool creates a minified version (removing all whitespace) and publishes it to the web application for use.

## Files

- `combined-event-config.json` - Source configuration (prettified with indentation)
- `minify-and-publish.js` - Minification and publishing script
- `combined-event-config.min.json` - Generated minified version
- `IAAF Scoring Tables for Combined Events.pdf` - Reference document

## Usage

### Minify and Publish

```bash
npm run publish
# or
npm start
```

This will:
1. Read `combined-event-config.json`
2. Create a minified version `combined-event-config.min.json` in this directory
3. Copy the minified version to `web/public/data/` for use by the web application
4. Display file size statistics

### Output

```
=====================================
Combined Events Config Minifier
=====================================

📖 Reading combined-event-config.json...
💾 Minified version created: combined-event-config.min.json
📦 Published to website: web/public/data/combined-event-config.min.json

==================================================
📊 SUMMARY
==================================================
Original size:  3,614 bytes
Minified size:  1,752 bytes
Space saved:    51.5%
==================================================

✅ Minification and publishing completed successfully!
```

## File Structure

### Source File (combined-event-config.json)

The source file is prettified with indentation for easy editing. It contains:

```json
{
  "men": {
    "combined": {
      "pentathlon": { ... },
      "decathlon": { ... }
    },
    "parameters": {
      "100m": { "a": 25.4347, "b": 18.0, "c": 1.81 },
      ...
    }
  },
  "women": { ... }
}
```

### Minified File (combined-event-config.min.json)

The minified file removes all whitespace, reducing file size by ~50%:

```json
{"men":{"combined":{"pentathlon":{...},"decathlon":{...}},"parameters":{"100m":{"a":25.4347,"b":18,"c":1.81},...}},"women":{...}}
```

## Updating the Configuration

1. Edit `combined-event-config.json` directly
2. Run `npm run publish` to minify and publish
3. The web application will use the updated minified version

## Requirements

- Node.js >= 14.0.0
- No external dependencies (uses built-in Node.js modules)

## Notes

- Only edit the source `combined-event-config.json` file (prettified version)
- The minified versions are generated automatically - don't edit them directly
- The web application loads `web/public/data/combined-event-config.min.json`
- File size reduction is typically ~50% due to whitespace removal
