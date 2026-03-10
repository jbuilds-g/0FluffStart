# 👑 0FluffStart
**The Final Minimalist Dashboard for Desktop & Mobile.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Version: 1.1.0](https://img.shields.io/badge/Version-1.1.0-blue)
![Platform: Web | Extension](https://img.shields.io/badge/Platform-Web%20%7C%20Extension-brightgreen)

> 0FluffStart is a high-performance, privacy-focused start page designed to replace bloated default homepages. It operates as a local-first application, ensuring that your data links, settings, and search history never leaves your device.

[**🚀 Launch Web Version**](https://jbuilds-g.github.io/0FluffStart/)

---

## ⚡ What's New in v1.1.0
- **UI Refresh:** Settings icon decoupled from the header, now featuring a bottom-left floating placement with sleek hover interactions.
- **Bug Fixes:** Resolved an edge-case data overwrite bug where personalized settings failed to restore correctly during the Import/Backup routine.
- **Performance:** Rebuilt DOM interactions utilizing native `DocumentFragment` rendering. Eliminates repaints and micro-stutters during intensive theme switching or fast list editing.
- **Theme Clean-up:** Consolidated all custom configurations into a single `OflufThemes.css` asset pipeline.

## 🛠️ Deployment & Installation

### Desktop (Browser Extension)
Install 0FluffStart locally to override your "New Tab" page.
1.  **Download** the latest source code from the [Releases](https://github.com/Raw-JSON/0FluffStart/releases) page.
2.  **Extract** the archive to a local directory.
3.  Navigate to your browser's extension page (`chrome://extensions`, `brave://extensions`, etc.)
4. Enable **Developer Mode** -> **Load Unpacked** -> Select directory.
5. 
