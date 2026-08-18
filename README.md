<div align="center">
  <img src="https://github.com/user-attachments/assets/46af697b-7331-4959-9cdc-a5f53d476ce3" width="120" alt="0FluffStart Icon" />
  <h1>0FluffStart</h1>
  <p><i>The high-performance, minimalist productivity engine.</i></p>

  <p><b>The Final Minimalist Dashboard for Desktop & Mobile.</b></p>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Version: 5.5.0](https://img.shields.io/badge/Version-5.5.0-blue)
![Platform: Web | Extension](https://img.shields.io/badge/Platform-Web%20%7C%20Extension-brightgreen)
![downloads](https://img.shields.io/github/downloads/jbuilds-g/0FluffStart/total?)


<br><br>

[**🚀 Launch Web Version**](https://jbuilds-g.github.io/0FluffStart/)

</div>

---

## 📖 Overview

0FluffStart is built on a **Zero-Fluff** philosophy: no trackers, no backend latency, and zero dependencies.

- **Desktop:** A fully integrated browser extension (Manifest V3) or standalone start page.
- **Mobile & Web:** A high-performance **Progressive Web App (PWA)** that works offline and installs natively on mobile devices.

---

## 📸 Demo

|                     💻 Desktop Experience                      |                    📱 Mobile Experience                     |
| :------------------------------------------------------------: | :---------------------------------------------------------: |
| <img src="desktop-demo.gif" width="100%" alt="Desktop Demo" /> | <img src="mobile-demo.gif" width="220" alt="Mobile Demo" /> |

---

## 🔥 Key Features

- **GPU-Accelerated Performance:** Global hardware acceleration and optimized CSS layers ensure smooth 60fps interactions.
- **Privacy-First Architecture:** No external analytics, trackers, or cloud sync. Your data stays on your hardware. _(Optional search suggestions use DuckDuckGo API)._
- **Offline-Ready PWA:** Instant load times and offline functionality via Service Worker caching.
- **Smart Link Management:** Organize your dashboard with nested folders and quick links.
- **Theming Engine:** Material You dynamic colors and 10+ built-in themes (OLED, Cyberpunk, Clean Light, etc.).
- **Custom Backgrounds:** High-resolution image and video upload support with persistent local storage.
- **Integrated Search Hub:** Instant engine switching with private search suggestions and local history.
- **Ultra-Minimalist Codebase:** Built with 100% Vanilla JS/CSS—zero frameworks, zero dependencies.

---

## 🛠️ Deployment & Installation

### Desktop (Browser Extension)

#### **Firefox**

1. Install directly from the Firefox Add-ons Store

<a href="https://addons.mozilla.org/firefox/addon/0flufstart/"><img src="https://blog.mozilla.org/addons/files/2020/04/get-the-addon-fx-apr-2020.svg" alt="Download from Mozilla Add-ons" height="48" /></a>

2. Alternatively, download the latest`0FluffStart-(version).xpi` from [Releases](https://github.com/jbuilds-g/0FluffStart/releases/latest) and drag/drop it into Firefox (or open `about:addons` → Gear Icon → _Install Add-on From File..._).

#### **Chromium (Chrome, Edge, Brave)**

* *Chrome Web Store listing pending review (Coming Soon).*

1. Download the latest `0fluffstart-chrome(version).zip`from [Releases](https://github.com/jbuilds-g/0FluffStart/releases/latest) and extract it.
3. Go to `chrome://extensions` and enable **Developer Mode** (top right).
4. Click **Load Unpacked** and select the extracted folder.

---

### Mobile & Web (PWA)

#### **Android (Chrome)**

- **Option A (PWA App):** Go to the [Live App](https://jbuilds-g.github.io/0FluffStart/), tap the menu (⋮), and select **Add to Home Screen**.
- **Option B (Homepage):** Go to **Settings** → **Homepage** → turn **On** → paste `https://jbuilds-g.github.io/0FluffStart/`.

#### **Android (Firefox)**

1. Go to **Settings** → **Homepage** → **Custom URL**.
2. Paste `https://jbuilds-g.github.io/0FluffStart/` and tap **Set**.

#### **iOS (Safari)**

1. Open the [Live App](https://jbuilds-g.github.io/0FluffStart/) in Safari.
2. Tap **Share** → **Add to Home Screen**.

> [!IMPORTANT]
> **Update Policy:**
>
> - **PWA / Web:** Updates automatically via Service Worker when online.
> - **Browser Extension:** Requires manual updating by replacing the local folder with new release files.

---

## 💾 Data Sync & Management

Data is stored locally in `localStorage` and `IndexedDB`. To sync between devices:

1. **Export:** Go to _Settings > Data Management_ → Click **Backup (Save)**.
2. **Transfer:** Send the `.json` file to your target device.
3. **Import:** Open the app on the new device → _Settings > Data Management_ → Click **Restore (Load)**.

---

## 🏛️ Project Structure

```text
├── css/                  # Modular stylesheets
├── js/                   # Core application scripts
│   ├── main.js           # Entry point & static event binding
│   ├── store.js          # Centralized reactive state store
│   ├── ui.js             # UI state managers & background handlers
│   ├── links.js          # Link manager & folder tree engine
│   ├── suggestions.js    # Live search & history management
│   ├── storage.js        # IndexedDB & backup/restore utilities
│   ├── material-you-engine.js # Monet HSL dynamic color extractor
│   └── utils.js          # Helpers, sanitizers & debouncers
├── index.html            # Application entry point
├── manifest.json         # Extension & PWA configuration
├── manifest.firefox.json # Gecko extension configuration
└── sw.js                 # Service Worker (Offline PWA logic)
```

---

> [!NOTE]
> The core logic and application code were generated by **Gemini AI** under my supervision and instruction.
