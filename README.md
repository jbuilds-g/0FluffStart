# 👑 0FluffStart
**A high-performance, minimalist dashboard for desktop and mobile environments.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Version: 1.0.0](https://img.shields.io/badge/Version-1.0.0-blue)
![Platform: Web | Extension](https://img.shields.io/badge/Platform-Web%20%7C%20Extension-brightgreen)

> 0FluffStart is a local-first application designed to replace standard browser homepages with a privacy-centric, efficient alternative. Your data, settings, and search history remain entirely on your device.

[**🚀 Launch Web Version**](https://jbuilds-g.github.io/0FluffStart/)

---

## 📖 Overview
The project follows a "Zero-Fluff" philosophy, prioritizing zero dependencies, no trackers, and minimal latency. It is optimized for two primary use cases:
1.  **Desktop:** An integrated browser extension utilizing Manifest V3.
2.  **Mobile:** A lightweight web interface for browsers without native extension support.

---

## 🛠️ Deployment & Installation

### Desktop (Browser Extension)
1.  **Download** the source code from the [Releases](https://github.com/jbuilds-g/0FluffStart/releases) page.
2.  **Extract** the archive to a local directory.
3.  Navigate to your browser’s extension page (e.g., `chrome://extensions`).
4.  Enable **Developer Mode**.
5.  Select **Load Unpacked** and target the extracted folder.

### Mobile (Web Homepage)
* **Android:** Set the homepage in Chrome settings to the deployment URL.
* **iOS:** Open the link in Safari, tap **Share**, and select **Add to Home Screen** to launch in standalone mode.

---

## ✨ Key Features
| Feature | Description |
| :--- | :--- |
| **Privacy-First** | No external analytics or third-party trackers are utilized. |
| **Customization** | Includes over 7 themes, including OLED and Cyberpunk variants. |
| **Performance** | Built with Vanilla JS and CSS for sub-second load times. |
| **Portability** | Full backup and restoration capabilities via JSON files. |

---

## 🏛️ Project Structure
```text
├── manifest.json      # Extension configuration (MV3)
├── index.html         # Main application entry point
├── state.js           # Persistence and state management
├── ui-logic.js        # DOM interactions and event handling
├── utilities.js       # Search APIs and helper functions
└── *.css              # Modular stylesheets
    └── OflufThemes.css # Extended theme library
