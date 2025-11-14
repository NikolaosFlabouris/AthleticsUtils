import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Minify and publish combined event configuration
 * Reads combined-event-config.json, creates a minified version,
 * and publishes it to the web application's public/data directory
 */

async function main() {
  const inputFile = 'combined-event-config.json';
  const inputPath = path.join(__dirname, inputFile);

  console.log('=====================================');
  console.log('Combined Events Config Minifier');
  console.log('=====================================\n');

  // Check if input file exists
  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Error: Config file not found: ${inputPath}`);
    process.exit(1);
  }

  try {
    // Read the source JSON file
    console.log(`📖 Reading ${inputFile}...`);
    const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

    // Create minified version (no whitespace)
    const minifiedJson = JSON.stringify(data);

    // Create minified filename
    const minifiedFilename = inputFile.replace(/\.json$/, '.min.json');
    const minifiedPath = path.join(__dirname, minifiedFilename);

    // Write minified version to tool directory
    fs.writeFileSync(minifiedPath, minifiedJson);
    console.log(`💾 Minified version created: ${minifiedPath}`);

    // Publish to website's public/data directory
    const websiteDataDir = path.join(path.dirname(path.dirname(__dirname)), 'web', 'public', 'data');
    const websiteDataPath = path.join(websiteDataDir, minifiedFilename);

    // Ensure the directory exists
    if (!fs.existsSync(websiteDataDir)) {
      fs.mkdirSync(websiteDataDir, { recursive: true });
      console.log(`📁 Created directory: ${websiteDataDir}`);
    }

    // Copy minified file to website data directory
    fs.copyFileSync(minifiedPath, websiteDataPath);
    console.log(`📦 Published to website: ${websiteDataPath}`);

    // Display file sizes
    const originalSize = fs.statSync(inputPath).size;
    const minifiedSize = fs.statSync(minifiedPath).size;
    const savings = ((1 - minifiedSize / originalSize) * 100).toFixed(1);

    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));
    console.log(`Original size:  ${originalSize.toLocaleString()} bytes`);
    console.log(`Minified size:  ${minifiedSize.toLocaleString()} bytes`);
    console.log(`Space saved:    ${savings}%`);
    console.log('='.repeat(50) + '\n');

    console.log('✅ Minification and publishing completed successfully!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
