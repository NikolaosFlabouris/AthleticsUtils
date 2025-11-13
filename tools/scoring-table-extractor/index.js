import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pdfParse from 'pdf-parse';
import { eventsConfig, getCategoryForEvent as getCategory, isKnownEvent, getEventInfo } from './events-config.js';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Parser for World Athletics Scoring Tables
 * Handles complex table layouts with multiple columns per page
 */

class EnhancedScoringTableExtractor {
  constructor(pdfPath) {
    this.pdfPath = pdfPath;
    this.tables = {};
  }

  /**
   * Main extraction method
   */
  async extract() {
    console.log('📖 Reading PDF file...');
    const dataBuffer = fs.readFileSync(this.pdfPath);
    
    console.log('⚙️  Parsing PDF content...');
    const pdfData = await pdfParse(dataBuffer, {
      max: 0, // Parse all pages
    });
    
    console.log(`📄 Total pages: ${pdfData.numpages}`);
    console.log('🔍 Extracting scoring tables...\n');
    
    this.parseContentEnhanced(pdfData.text);
    
    return this.tables;
  }

  /**
   * Enhanced content parsing with better structure detection
   * Handles cross-referenced table format where each row has points and multiple event performances
   */
  parseContentEnhanced(text) {
    const lines = text.split('\n');
    let currentSection = {
      gender: null,
      category: null
    };
    let eventHeaders = [];
    let inTable = false;
    let pointsColumnPosition = null; // 'left' or 'right'

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) continue;

      // Detect section headers
      const sectionInfo = this.detectSection(line);
      if (sectionInfo) {
        currentSection = { ...currentSection, ...sectionInfo };
        inTable = false;
        continue;
      }

      // Detect table header row (contains event names)
      const headers = this.detectTableHeaders(line);
      if (headers && headers.events.length > 0) {
        eventHeaders = headers.events;
        pointsColumnPosition = headers.pointsPosition;
        inTable = true;
        continue;
      }

      // Parse data rows when in table
      if (inTable && eventHeaders.length > 0) {
        // Check for table end markers
        if (this.isTableEnd(line)) {
          inTable = false;
          eventHeaders = [];
          continue;
        }

        // Parse cross-referenced data row
        const dataRow = this.parseCrossReferencedRow(line, eventHeaders, pointsColumnPosition);
        if (dataRow && dataRow.points !== null) {
          this.storeCrossReferencedData(currentSection, dataRow);
        }
      }
    }
  }

  /**
   * Detect section (gender and category)
   */
  detectSection(line) {
    const lineLower = line.toLowerCase();
    const result = {};

    // Gender detection
    if (lineLower.includes('women') || lineLower.includes('femmes')) {
      result.gender = 'women';
    } else if ((lineLower.includes('men') || lineLower.includes('hommes')) &&
               !lineLower.includes('women')) {
      result.gender = 'men';
    } else if (lineLower.includes('mixed') || lineLower.includes('mixte')) {
      result.gender = 'mixed';
    }

    // Category detection using config
    for (const [category, keywords] of Object.entries(eventsConfig.categoryKeywords)) {
      for (const keyword of keywords) {
        if (lineLower.includes(keyword)) {
          result.category = category;
          break;
        }
      }
      if (result.category) break;
    }

    return Object.keys(result).length > 0 ? result : null;
  }

  /**
   * Detect table headers (event names) from a line
   * Returns event names and whether points column is on left or right
   */
  detectTableHeaders(line) {
    const lineLower = line.toLowerCase();

    // Check if this is a header row (contains "Points" or "points")
    if (!lineLower.includes('points') && !lineLower.includes('point')) {
      return null;
    }

    // Split by spaces (1 or more) to get all tokens
    const columns = line.split(/\s+/).filter(col => col.trim());

    if (columns.length < 2) return null;

    const events = [];
    let pointsPosition = null;
    let eventTokens = [];

    // Check if first column is Points
    if (/points?/i.test(columns[0])) {
      pointsPosition = 'left';
      eventTokens = columns.slice(1);
    }
    // Check if last column is Points
    else if (/points?/i.test(columns[columns.length - 1])) {
      pointsPosition = 'right';
      eventTokens = columns.slice(0, -1);
    }

    if (!pointsPosition) return null;

    // Parse event tokens, combining multi-token events like "200m sh", "3000m sc", "35 km w"
    for (let i = 0; i < eventTokens.length; i++) {
      let eventName = eventTokens[i];

      // Check if current token is a number and next token is a unit (m, km, mile/miles)
      // This handles cases like "35 km W" split as ["35", "km", "W"] or "2 miles" split as ["2", "miles"]
      if (i + 1 < eventTokens.length && /^\d+(?:\.\d+)?$/.test(eventName) && /^(m|km|miles?)$/i.test(eventTokens[i + 1])) {
        eventName = eventName + ' ' + eventTokens[i + 1];
        i++; // Skip the next token since we consumed it
      }

      // Check if next token is a modifier (h, sh, sc, w, mix)
      if (i + 1 < eventTokens.length && /^(h|sh|sc|w|mix)$/i.test(eventTokens[i + 1])) {
        eventName = eventName + ' ' + eventTokens[i + 1];
        i++; // Skip the next token since we consumed it

        // Check for double modifiers like "mix sh"
        if (i + 1 < eventTokens.length && /^(sh)$/i.test(eventTokens[i + 1])) {
          eventName = eventName + ' ' + eventTokens[i + 1];
          i++; // Skip this token too
        }
      }

      const normalized = this.normalizeEventName(eventName);
      if (normalized) {
        events.push(normalized);
      }
    }

    if (events.length > 0 && pointsPosition) {
      return { events, pointsPosition };
    }

    return null;
  }

  /**
   * Normalize event name to standard format
   * Handles variations in spacing: "100m", "100 m", "100m h", "100 m h"
   */
  normalizeEventName(eventStr) {
    if (!eventStr) return null;

    let normalized = eventStr
      .trim()
      .replace(/\s+/g, ' '); // Normalize multiple spaces to single space

    // Handle special comma-formatted walk events BEFORE lowercasing
    // "5,000mW" -> keep case, "10,000MW" -> "10,000mW"
    if (/^\d{1,2},\d{3}mw$/i.test(normalized)) {
      // Preserve the format but normalize the "W" to uppercase
      normalized = normalized.replace(/mw$/i, 'mW');
      return normalized; // Return early with exact format
    }

    // Now lowercase for normal processing
    normalized = normalized.toLowerCase();

    // Convert "miles" to "mile" for consistency
    // "2 miles" -> "2 mile", "3 Miles" -> "3 mile"
    normalized = normalized.replace(/\bmiles\b/g, 'mile');

    // Handle bare "mile" without a number (assume 1 mile)
    // "mile" -> "1mile", "Mile" -> "1mile", "mile sh" -> "1mile sh"
    if (normalized === 'mile') {
      normalized = '1mile';
    } else if (/^mile\s+(h|sh|sc|w)$/.test(normalized)) {
      // "mile sh" -> "1mile sh", "mile h" -> "1mile h", etc.
      normalized = '1' + normalized;
    }

    // Remove spaces between number and unit (m, km, mile)
    // "100 m" -> "100m", "10 km" -> "10km", "1 mile" -> "1mile", "2 miles" -> "2mile"
    normalized = normalized.replace(/(\d+(?:\.\d+)?)\s+(m|km|mile)\b/g, '$1$2');

    // Ensure modifiers are space-separated from the event
    // "100mh" -> "100m h", "200msh" -> "200m sh", "3000msc" -> "3000m sc", "10kmw" -> "10km w"
    normalized = normalized.replace(/(\d+(?:m|km|mile))(h|sh|sc|w)\b/g, '$1 $2');

    // Handle relay modifiers similarly
    // "4x400mix" -> "4x400m mix", "4x400mixsh" -> "4x400m mix sh", "4x400msh" -> "4x400m sh"
    // First handle "mixsh" case specifically
    normalized = normalized.replace(/(4x\d+)mixsh\b/g, '$1m mix sh');
    // Then handle other cases
    normalized = normalized.replace(/(4x\d+)(mix|m(?:h|sh|sc|w))\b/g, (_match, base, modifier) => {
      if (modifier === 'mix') {
        return `${base}m mix`;
      } else {
        // Remove the 'm' prefix from modifier (mh -> h, msh -> sh, etc.)
        return `${base}m ${modifier.substring(1)}`;
      }
    });

    // Relay events: 4x100m, 4x200m, 4x400m, with optional modifiers (sh, mix)
    if (/^4x\d+m(\s+(mix|h|sh|sc|w))?(\s+(sh))?$/.test(normalized)) {
      return normalized;
    }

    // Validate it looks like an event
    // Timed events: 100m, 200m sh, 60m h, 3000m sc, 10km w, 10km sh, 1mile, 2mile sh, walks, etc.
    if (/^\d+(?:\.\d+)?m?(\s+(h|sh|sc|w))?$|^\d+(?:\.\d+)?km(\s+(h|sh|sc|w))?$|^\d+(?:\.\d+)?mile(\s+(h|sh|sc|w))?$|marathon|walk/.test(normalized)) {
      return normalized;
    }

    // Special event abbreviations: HM, HMW, MarW
    if (/^(hm|hmw|marw)$/.test(normalized)) {
      return normalized;
    }

    // Field events: hj, pv, lj, tj, sp, dt, ht, jt (abbreviations)
    if (/^(hj|pv|lj|tj|sp|dt|ht|jt)$/.test(normalized)) {
      return normalized;
    }

    // Combined events: hept, pent, dec, with optional modifiers
    if (/^(hept\.?\s*sh|hept\.?|pent\.?\s*sh|pent\.?|dec\.?|decathlon|heptathlon|pentathlon)$/.test(normalized)) {
      return normalized.replace(/\./g, ''); // Remove periods
    }

    return null;
  }

  /**
   * Parse a cross-referenced data row
   * Format: Either "Points | Event1 | Event2 | Event3..." or "Event1 | Event2 | Event3... | Points"
   */
  parseCrossReferencedRow(line, eventHeaders, pointsPosition) {
    // Split by spaces (1 or more) to get all tokens
    let allTokens = line.split(/\s+/).filter(col => col.trim());

    // Handle complex concatenation cases where multiple values or dashes are stuck together
    allTokens = allTokens.flatMap(token => {
      // Skip if it's already a simple value (including HH:MM:SS format)
      if (token === '-' || token === '--' || /^\d+(?:[\.:]\d+){1,2}(?:\.\d+)?$/.test(token)) {
        // Handle double dash
        if (token === '--') return ['-', '-'];
        return [token];
      }

      // Handle concatenated values (e.g., "-5.79-9.50-19.42", "-5.856.25", "9.5219.03")
      // Strategy: Match valid performance patterns more precisely
      // Valid: 9.52, 19.03, 1:23.45, 5.79, 1:23:45, 2:03:45.50
      // Invalid: 9.5219 (this should be split into 9.52 and 19)

      // Match pattern: supports HH:MM:SS.ss, MM:SS.ss, or SS.ss formats
      // Pattern explanation: \d+ (hours/mins/secs) followed by optional :MM and :SS parts, with optional .SS decimals
      const performancePattern = /\d+(?::\d{2}){0,2}(?:\.\d{2})?/g;
      const matches = token.match(performancePattern);

      if (matches) {
        // Found performance values - now reconstruct with dashes in between
        const parts = [];
        let lastIndex = 0;

        // Iterate through matches and add dashes where they should be
        for (const match of matches) {
          const matchIndex = token.indexOf(match, lastIndex);

          // Add dashes that appeared before this match
          const beforeMatch = token.substring(lastIndex, matchIndex);
          for (const char of beforeMatch) {
            if (char === '-') parts.push('-');
          }

          // Add the performance value
          parts.push(match);
          lastIndex = matchIndex + match.length;
        }

        // Add any remaining dashes
        const afterMatches = token.substring(lastIndex);
        for (const char of afterMatches) {
          if (char === '-') parts.push('-');
        }

        return parts.length > 0 ? parts : [token];
      }

      // If no matches, treat as-is (might be standalone dash or invalid)
      return [token];
    });

    if (allTokens.length === 0) return null;

    let points = null;
    const performanceValues = [];

    if (pointsPosition === 'left') {
      // First token is points
      points = parseInt(allTokens[0]);
      if (isNaN(points) || points < 0 || points > 1500) return null;

      // Collect the rest as potential performances (including dashes)
      for (let i = 1; i < allTokens.length; i++) {
        performanceValues.push(allTokens[i]);
      }
    } else if (pointsPosition === 'right') {
      // Last token is points
      points = parseInt(allTokens[allTokens.length - 1]);
      if (isNaN(points) || points < 0 || points > 1500) return null;

      // All tokens except last are potential performances (including dashes)
      for (let i = 0; i < allTokens.length - 1; i++) {
        performanceValues.push(allTokens[i]);
      }
    }

    // We should have exactly as many performance values as event headers
    // Map each to its corresponding event
    const performances = [];
    for (let i = 0; i < eventHeaders.length; i++) {
      if (i < performanceValues.length) {
        performances.push(this.parsePerformanceValue(performanceValues[i]));
      } else {
        performances.push(null);
      }
    }

    return {
      points,
      performances,
      events: eventHeaders
    };
  }

  /**
   * Parse a performance value (time or distance)
   * Returns null if it's a dash or invalid
   */
  parsePerformanceValue(value) {
    if (!value || value === '-') return null;

    // Validate it looks like a performance (numeric with optional : and .)
    if (/^[\d:.]+$/.test(value)) {
      return value;
    }

    return null;
  }

  /**
   * Convert time format to seconds
   * - ss.SS remains as ss.SS
   * - mm:ss.SS converts to ss.SS
   * - mm:ss converts to ss (no decimals)
   * - hh:mm:ss converts to ss (no decimals)
   * @param {string} timeStr - Time string to convert
   * @returns {string} Time in seconds format
   */
  convertTimeToSeconds(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return timeStr;

    // Check for hh:mm:ss or hh:mm:ss.SS format
    const hhmmssMatch = timeStr.match(/^(\d+):(\d+):(\d+(?:\.\d+)?)$/);
    if (hhmmssMatch) {
      const hours = parseInt(hhmmssMatch[1]);
      const minutes = parseInt(hhmmssMatch[2]);
      const secondsStr = hhmmssMatch[3];
      const seconds = parseFloat(secondsStr);
      const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;

      // If original had decimals, keep 2 decimal places; otherwise return integer
      const hasDecimals = secondsStr.includes('.');
      return hasDecimals ? totalSeconds.toFixed(2) : totalSeconds.toString();
    }

    // Check for mm:ss or mm:ss.SS format
    const mmssMatch = timeStr.match(/^(\d+):(\d+(?:\.\d+)?)$/);
    if (mmssMatch) {
      const minutes = parseInt(mmssMatch[1]);
      const secondsStr = mmssMatch[2];
      const seconds = parseFloat(secondsStr);
      const totalSeconds = (minutes * 60) + seconds;

      // If original had decimals, keep 2 decimal places; otherwise return integer
      const hasDecimals = secondsStr.includes('.');
      return hasDecimals ? totalSeconds.toFixed(2) : totalSeconds.toString();
    }

    // Already in ss.SS format or distance format - return as is
    return timeStr;
  }

  /**
   * Check if an event is time-based (track or race walk)
   * @param {string} eventName - Normalized event name
   * @returns {boolean} True if event uses time (not distance/points)
   */
  isTimeBasedEvent(eventName) {
    const eventInfo = getEventInfo(eventName);
    if (!eventInfo) return false;

    // Track and race walk events use time
    // Field events (jumps, throws) and combined events use distance/points
    return eventInfo.type === 'track' || eventInfo.type === 'race_walk' || eventInfo.type === 'relay';
  }

  /**
   * Check if line indicates end of table
   */
  isTableEnd(line) {
    return /^(©|world\s*athletics|page\s*\d+)$/i.test(line) ||
           (line.length === 1 && /^\d+$/.test(line)); // Page numbers at end
  }

  /**
   * Determine the correct category for a specific event
   */
  getCategoryForEvent(eventName) {
    // Use the imported function from events config
    return getCategory(eventName);
  }

  /**
   * Store cross-referenced data (maps each performance to its point value across multiple events)
   */
  storeCrossReferencedData(section, dataRow) {
    const { points, performances, events } = dataRow;

    if (!section.gender || !points) {
      return;
    }

    // Map each performance to its event
    for (let i = 0; i < Math.min(performances.length, events.length); i++) {
      const performance = performances[i];
      const eventName = events[i];

      if (!performance || !eventName) continue;

      // Validate event is known
      if (!isKnownEvent(eventName)) {
        console.warn(`⚠️  Unknown event detected: "${eventName}" (${section.gender}, category: ${section.category})`);
        // Continue processing to capture all events, even unknown ones
      }

      // Determine gender: mixed relay events go to 'mixed' gender
      let eventGender = section.gender;
      if (/mix/.test(eventName)) {
        eventGender = 'mixed';
      }

      // Initialize nested structure
      if (!this.tables[eventGender]) {
        this.tables[eventGender] = {};
      }

      // Determine the correct category for this event
      const eventCategory = this.getCategoryForEvent(eventName) || section.category;

      if (!eventCategory) {
        console.warn(`⚠️  No category found for event: "${eventName}" (${section.gender})`);
        continue;
      }

      // Initialize category if needed
      if (!this.tables[eventGender][eventCategory]) {
        this.tables[eventGender][eventCategory] = {};
      }

      // Initialize event array if needed
      if (!this.tables[eventGender][eventCategory][eventName]) {
        this.tables[eventGender][eventCategory][eventName] = [];
      }

      // Add the performance-points mapping
      this.tables[eventGender][eventCategory][eventName].push({
        performance: performance,
        points: points
      });
    }
  }

  /**
   * Load existing data from JSON file and merge with current tables
   */
  loadAndMerge(filePath) {
    if (!fs.existsSync(filePath)) {
      return; // No existing file to merge
    }

    try {
      const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // Merge existing data into current tables
      for (const [gender, categories] of Object.entries(existingData)) {
        if (!this.tables[gender]) {
          this.tables[gender] = {};
        }

        for (const [category, events] of Object.entries(categories)) {
          if (!this.tables[gender][category]) {
            this.tables[gender][category] = {};
          }

          for (const [eventName, entries] of Object.entries(events)) {
            if (!this.tables[gender][category][eventName]) {
              this.tables[gender][category][eventName] = [];
            }

            // Merge entries (duplicates will be removed in cleanAndSortData)
            this.tables[gender][category][eventName].push(...entries);
          }
        }
      }

      console.log(`\n📂 Merged with existing data from: ${filePath}`);
    } catch (error) {
      console.warn(`\n⚠️  Warning: Could not load existing file: ${error.message}`);
    }
  }

  /**
   * Export to JSON
   */
  exportToJSON(outputPath, mergeWithExisting = false) {
    // Optionally merge with existing file
    if (mergeWithExisting) {
      this.loadAndMerge(outputPath);
    }

    // Clean and sort data before exporting
    this.cleanAndSortData();

    // Detect and report duplicate tables
    const duplicates = this.detectDuplicateTables();
    this.reportDuplicateResults(duplicates);

    // Convert data to array format: [points, performance]
    const compactData = {};
    for (const [gender, categories] of Object.entries(this.tables)) {
      compactData[gender] = {};
      for (const [category, events] of Object.entries(categories)) {
        compactData[gender][category] = {};
        for (const [eventName, entries] of Object.entries(events)) {
          // Convert from {performance: "9.46", points: 1400} to [1400, "9.46"]
          compactData[gender][category][eventName] = entries.map(entry => [entry.points, entry.performance]);
        }
      }
    }

    // Generate pretty-printed version (with formatting) - keep original time formats
    let prettyJson = JSON.stringify(compactData, null, 2);

    // Replace multi-line [points, performance] arrays with single-line format
    // Matches patterns like:
    //   [
    //     1400,
    //     "35.84"
    //   ]
    // And replaces with: [1400, "35.84"]
    prettyJson = prettyJson.replace(/\[\s+(\d+),\s+"([^"]+)"\s+\]/g, '[$1, "$2"]');

    // Create minified version with time conversion
    const minifiedData = {};
    for (const [gender, categories] of Object.entries(this.tables)) {
      minifiedData[gender] = {};
      for (const [category, events] of Object.entries(categories)) {
        minifiedData[gender][category] = {};
        for (const [eventName, entries] of Object.entries(events)) {
          // Convert times to seconds for time-based events in minified version only
          const isTimeBased = this.isTimeBasedEvent(eventName);
          minifiedData[gender][category][eventName] = entries.map(entry => {
            const performance = isTimeBased ? this.convertTimeToSeconds(entry.performance) : entry.performance;
            return [entry.points, performance];
          });
        }
      }
    }

    // Generate minified version (no whitespace) with converted times
    const minifiedJson = JSON.stringify(minifiedData);

    // Write both versions to tool directory
    fs.writeFileSync(outputPath, prettyJson);

    // Create minified filename by adding .min before extension
    const minifiedPath = outputPath.replace(/\.json$/, '.min.json');
    fs.writeFileSync(minifiedPath, minifiedJson);

    console.log(`\n💾 Data exported to: ${outputPath}`);
    console.log(`💾 Minified version: ${minifiedPath}`);

    // Copy minified version to website's public/data directory
    const websiteDataDir = path.join(path.dirname(path.dirname(__dirname)), 'public', 'data');
    const websiteDataPath = path.join(websiteDataDir, path.basename(minifiedPath));

    try {
      // Ensure the directory exists
      if (!fs.existsSync(websiteDataDir)) {
        fs.mkdirSync(websiteDataDir, { recursive: true });
      }

      // Copy minified file to website data directory
      fs.copyFileSync(minifiedPath, websiteDataPath);
      console.log(`📦 Published to website: ${websiteDataPath}`);
    } catch (error) {
      console.warn(`⚠️  Warning: Could not publish to website directory: ${error.message}`);
    }

    this.printSummary();

    return outputPath;
  }

  /**
   * Clean and sort the extracted data
   * - Remove duplicates (keep highest points for same performance)
   * - Sort by points descending
   */
  cleanAndSortData() {
    for (const [gender, categories] of Object.entries(this.tables)) {
      for (const [category, events] of Object.entries(categories)) {
        for (const [eventName, entries] of Object.entries(events)) {
          // Remove duplicates - keep highest points for each performance
          const uniqueMap = new Map();
          for (const entry of entries) {
            const key = entry.performance;
            if (!uniqueMap.has(key) || uniqueMap.get(key).points < entry.points) {
              uniqueMap.set(key, entry);
            }
          }

          // Sort by points descending
          const sortedData = Array.from(uniqueMap.values())
            .sort((a, b) => b.points - a.points);

          this.tables[gender][category][eventName] = sortedData;

          console.log(`  ✓ ${gender} - ${category} - ${eventName}: ${sortedData.length} entries`);
        }
      }
    }
  }

  /**
   * Compare two tables to check if they are identical
   * Tables are identical if they have the same length and all [points, performance] pairs match
   * @param {Array} table1 - First table array of {performance, points} objects
   * @param {Array} table2 - Second table array of {performance, points} objects
   * @returns {boolean} True if tables are identical
   */
  areTablesIdentical(table1, table2) {
    // Quick check: if lengths differ, they're not identical
    if (table1.length !== table2.length) {
      return false;
    }

    // Compare each entry
    for (let i = 0; i < table1.length; i++) {
      const entry1 = table1[i];
      const entry2 = table2[i];

      // Compare both points and performance values
      if (entry1.points !== entry2.points || entry1.performance !== entry2.performance) {
        return false;
      }
    }

    return true;
  }

  /**
   * Detect duplicate tables within each gender category
   * Compares all tables to find which ones have identical data
   * @returns {Object} Duplicate groups organized by gender
   */
  detectDuplicateTables() {
    const duplicates = {};

    // Process each gender separately
    for (const [gender, categories] of Object.entries(this.tables)) {
      const eventTables = [];

      // Collect all event tables for this gender
      for (const [category, events] of Object.entries(categories)) {
        for (const [eventName, table] of Object.entries(events)) {
          eventTables.push({
            gender,
            category,
            eventName,
            table
          });
        }
      }

      // Compare each table with every other table in the same gender
      const duplicateGroups = [];
      const processed = new Set();

      for (let i = 0; i < eventTables.length; i++) {
        if (processed.has(i)) continue;

        const group = [eventTables[i]];

        // Find all tables identical to this one
        for (let j = i + 1; j < eventTables.length; j++) {
          if (processed.has(j)) continue;

          if (this.areTablesIdentical(eventTables[i].table, eventTables[j].table)) {
            group.push(eventTables[j]);
            processed.add(j);
          }
        }

        // Only keep groups with 2+ identical tables
        if (group.length > 1) {
          duplicateGroups.push(group);
          processed.add(i);
        }
      }

      // Store duplicate groups for this gender
      if (duplicateGroups.length > 0) {
        duplicates[gender] = duplicateGroups;
      }
    }

    return duplicates;
  }

  /**
   * Report duplicate table detection results to console
   * @param {Object} duplicates - Duplicate groups from detectDuplicateTables()
   */
  reportDuplicateResults(duplicates) {
    console.log('\n' + '='.repeat(50));
    console.log('🔍 DUPLICATE TABLE DETECTION RESULTS');
    console.log('='.repeat(50));

    if (Object.keys(duplicates).length === 0) {
      console.log('\n✅ No duplicate tables found. All event tables are unique.\n');
      console.log('='.repeat(50) + '\n');
      return;
    }

    let totalDuplicateEvents = 0;
    let totalGroups = 0;

    for (const [gender, groups] of Object.entries(duplicates)) {
      console.log(`\n${gender.toUpperCase()}'S EVENTS:`);

      groups.forEach((group, index) => {
        console.log(`\n  Group ${index + 1} (${group.length} identical tables):`);
        group.forEach(event => {
          console.log(`    - ${event.eventName} (${event.category})`);
        });
        totalDuplicateEvents += group.length;
        totalGroups++;
      });
    }

    console.log('\n' + '='.repeat(50));
    console.log(`📊 SUMMARY: ${totalDuplicateEvents} tables with duplicates across ${totalGroups} groups`);
    console.log('='.repeat(50) + '\n');
  }

  /**
   * Print extraction summary
   */
  printSummary() {
    const stats = this.getStatistics();

    console.log('\n' + '='.repeat(50));
    console.log('📊 EXTRACTION SUMMARY');
    console.log('='.repeat(50));

    for (const [gender, categories] of Object.entries(this.tables)) {
      console.log(`\n${gender.toUpperCase()}:`);

      for (const [category, events] of Object.entries(categories)) {
        const eventCount = Object.keys(events).length;
        const entryCount = Object.values(events).reduce((sum, data) => sum + data.length, 0);

        console.log(`  ${category.padEnd(20)} ${eventCount} events, ${entryCount.toLocaleString()} entries`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`🏆 TOTAL: ${stats.totalEvents} events with ${stats.totalEntries.toLocaleString()} scoring entries`);
    console.log('='.repeat(50) + '\n');
  }

  /**
   * Get statistics about extracted data
   */
  getStatistics() {
    const stats = {
      genders: Object.keys(this.tables).length,
      totalEvents: 0,
      totalEntries: 0,
      byGender: {}
    };

    for (const [gender, categories] of Object.entries(this.tables)) {
      stats.byGender[gender] = {
        categories: Object.keys(categories).length,
        events: 0,
        entries: 0
      };

      for (const events of Object.values(categories)) {
        const eventCount = Object.keys(events).length;
        const entryCount = Object.values(events).reduce((sum, data) => sum + data.length, 0);
        
        stats.byGender[gender].events += eventCount;
        stats.byGender[gender].entries += entryCount;
        stats.totalEvents += eventCount;
        stats.totalEntries += entryCount;
      }
    }

    return stats;
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const inputPDF = args[0] || 'World_Athletics_Scoring_Tables_of_Athletics_2025.pdf';
  const outputJSON = args[1] || 'athletics_scoring_tables.json';
  const mergeFlag = args[2] === '--merge' || args[2] === '-m';

  console.log('=====================================');
  console.log('World Athletics Scoring Table Extractor');
  console.log('=====================================\n');

  // Check if input file exists
  if (!fs.existsSync(inputPDF)) {
    console.error(`❌ Error: PDF file not found: ${inputPDF}`);
    console.log('\nUsage: node index.js <input-pdf> [output-json] [--merge]');
    console.log('Example: node index.js scoring_tables.pdf output.json');
    console.log('Example (merge): node index.js field_events.pdf output.json --merge');
    process.exit(1);
  }

  try {
    const extractor = new EnhancedScoringTableExtractor(inputPDF);
    await extractor.extract();
    extractor.exportToJSON(outputJSON, mergeFlag);

    console.log('\n✅ Extraction completed successfully!');
  } catch (error) {
    console.error('\n❌ Error during extraction:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
