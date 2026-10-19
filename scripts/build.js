const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ignoreList = [
  "dist",
  "node_modules",
  ".git",
  ".vscode",
  "build.js",
  "manifest.json",
  "manifest.firefox.json",
  "desktop-demo.gif",
  "mobile-demo.gif",
  "LICENSE",
  "PRIVACY.md",
  "pwa-manifest.json",
  "README.md",
  "sw.js",
  "TAGS.md",
  ".github",
  ".gitignore",
  "notes.js",
  "popup.js",
  "popup.html",
  "popup.css",
  "notes.css",
  "fix-dvh.js",
  "version.js",
  "bump.js",
  "og-banner-1200x630.png",
  "wide-icon.png",
  "migrate-icons.py",
];

const ROOT_DIR = path.join(__dirname, "..");

function buildPackage(target, manifestSrc, zipName) {
  const distDir = path.join(ROOT_DIR, "dist", target);
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });

  const filesToInclude = fs
    .readdirSync(ROOT_DIR)
    .filter((file) => !ignoreList.includes(file) && !file.endsWith(".zip"));

  filesToInclude.forEach((file) => {
    const srcPath = path.join(ROOT_DIR, file);
    if (fs.existsSync(srcPath)) {
      fs.cpSync(srcPath, path.join(distDir, file), { recursive: true });
    }
  });

  fs.copyFileSync(
    path.join(ROOT_DIR, manifestSrc),
    path.join(distDir, "manifest.json"),
  );

  const zipPath = path.join(ROOT_DIR, zipName);
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

  if (process.platform === "win32") {
    execSync(`tar -a -c -f "${zipPath}" -C "${distDir}" *`);
  } else {
    execSync(`cd "${distDir}" && zip -r "${zipPath}" ./*`);
  }

  console.log(`Created ${zipName}`);
}

const baseManifest = JSON.parse(
  fs.readFileSync(path.join(ROOT_DIR, "manifest.json"), "utf8"),
);
const version = baseManifest.version || "1.0.0";

buildPackage("chrome", "manifest.json", `0fluffstart-chrome-v${version}.zip`);
buildPackage(
  "firefox",
  "manifest.firefox.json",
  `0fluffstart-firefox-v${version}.zip`,
);

// Clean up build directory
fs.rmSync(path.join(ROOT_DIR, "dist"), { recursive: true, force: true });
