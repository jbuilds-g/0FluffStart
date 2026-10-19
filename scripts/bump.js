import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "..");

const newVersion = process.argv[2];

if (!newVersion) {
  console.error(
    "Error: Please provide a version number. Usage: node scripts/bump.js <version>",
  );
  process.exit(1);
}

const semverRegex = /^\d+\.\d+\.\d+$/;
if (!semverRegex.test(newVersion)) {
  console.error(
    `Error: Invalid semver version "${newVersion}". Expected format: X.Y.Z`,
  );
  process.exit(1);
}

// 1. Update js/version.js
const versionJsPath = path.join(rootDir, "js", "version.js");
if (fs.existsSync(versionJsPath)) {
  const content = `/**\n * Single source of truth for the application version.\n * Updated automatically via scripts/bump.js\n */\nexport const APP_VERSION = "${newVersion}";\n`;
  fs.writeFileSync(versionJsPath, content, "utf8");
  console.log(`Updated js/version.js -> ${newVersion}`);
}

// 2. Update manifest.json and manifest.firefox.json
const manifestFiles = ["manifest.json", "manifest.firefox.json"];

manifestFiles.forEach((file) => {
  const manifestPath = path.join(rootDir, file);

  if (fs.existsSync(manifestPath)) {
    const manifestRaw = fs.readFileSync(manifestPath, "utf8");
    const manifest = JSON.parse(manifestRaw);

    manifest.version = newVersion;

    fs.writeFileSync(
      manifestPath,
      JSON.stringify(manifest, null, 2) + "\n",
      "utf8",
    );

    console.log(`Updated ${file} -> ${newVersion}`);
  }
});

// 3. Update HTML data-version fallback elements
const htmlFiles = ["index.html", "settings.html"];

htmlFiles.forEach((file) => {
  const htmlPath = path.join(rootDir, file);

  if (fs.existsSync(htmlPath)) {
    let htmlContent = fs.readFileSync(htmlPath, "utf8");

    // Replace content inside tags containing the data-version attribute
    htmlContent = htmlContent.replace(
      /(<[^>]*\bdata-version\b[^>]*>)[^<]*(<\/[^>]+>)/gi,
      `$1v${newVersion}$2`,
    );

    fs.writeFileSync(htmlPath, htmlContent, "utf8");
    console.log(`Updated ${file} -> v${newVersion}`);
  }
});

console.log(`\nVersion successfully bumped to ${newVersion}!`);
