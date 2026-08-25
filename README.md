<div align="center">
  <img src="https://github.com/user-attachments/assets/46af697b-7331-4959-9cdc-a5f53d476ce3" width="120" alt="0FluffStart Icon" />
  <h1>0FluffStart</h1>
  <p><i>The high-performance, minimalist productivity engine.</i></p>

  <p><b>The Final Minimalist Dashboard for Desktop & Mobile.</b></p>

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0.html)
![Version](https://img.shields.io/github/v/release/jbuilds-g/0FluffStart?logo=github&label=Release&cacheSeconds=3600)
![Platform: Web | Extension](https://img.shields.io/badge/Platform-Web%20%7C%20Extension-brightgreen)
![downloads](https://img.shields.io/github/downloads/jbuilds-g/0FluffStart/total?logo=github&cacheSeconds=3600)
![Stars](https://img.shields.io/github/stars/jbuilds-g/0fluffstart)

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
- **Privacy-First Architecture:** No external analytics, trackers, or cloud sync. Your data stays strictly on your hardware.
- **Modular Search Bar Engine:** Switch between a unified search bar or a segmented floating card layout with granular control toggles for individual buttons.
- **Inline Quick Suggestion Toggle:** Instant control over live search autocomplete feeds directly inside the search switcher.
- **Offline-Ready PWA:** Instant load times and offline functionality via Service Worker caching.
- **Smart Link Management:** Organize your dashboard with nested folders, quick links, and pointer-driven drag-and-drop spatial reordering.
- **Theming Engine:** Material You dynamic color extraction and built-in dark/light theme presets.
- **Local Media Storage & Serialization:** Custom high-resolution image and video upload support stored in IndexedDB with full base64 JSON export/import support.
- **Ultra-Minimalist Codebase:** Built with 100% Vanilla JS/CSS—zero frameworks, zero dependencies.

---

## 🛠️ Deployment & Installation

### Desktop (Browser Extension)

#### **Firefox**

1. Install directly from the Firefox Add-ons Store

<a href="https://addons.mozilla.org/firefox/addon/0flufstart/"><img src="https://blog.mozilla.org/addons/files/2020/04/get-the-addon-fx-apr-2020.svg" alt="Download from Mozilla Add-ons" height="48" /></a>

2. Alternatively, download the latest`0FluffStart-(version).xpi` from [Releases](https://github.com/jbuilds-g/0FluffStart/releases/latest) and drag/drop it into Firefox (or open `about:addons` → Gear Icon → _Install Add-on From File..._).

#### **Chromium (Chrome, Edge, Brave)**

- **Chrome Web Store Submission:** _(Submitted & Pending Review)_
- **Manual Unpacked Loading:**
  - Download `0fluffstart-chrome-(version)zip` from the [Releases](https://github.com/jbuilds-g/0FluffStart/releases/latest).
  - Extract the archive to a local directory.
  - Open `chrome://extensions` in your browser.
  - Enable **Developer Mode** in the top-right corner.
  - Click **Load Unpacked** and select the extracted folder.

### Mobile & Live Web (PWA)

The hosted version is a fully compliant **PWA**, meaning it can be installed as a standalone app that works even without an internet connection.

#### Android (Chrome)

1.  Navigate to the [Live URL](https://jbuilds-g.github.io/0FluffStart/).
2.  Tap the three dots (Menu) and select **Add to Home Screen**.
3.  The dashboard will appear in your app drawer as a native application.

_alternatively_

> It can be set as a custom homepage.

1. Open **settings**.
2. Navigate to **Homepage** and turn it **on**.
3. Type or paste the **live URL** `jbuilds-g.github.io/0FluffStart/`

#### Firefox

1. Open **Settings** in Firefox.
2. Select **Homepage** -> **Custom URL**.
3. Type or paste the **Live URL**: `https://jbuilds-g.github.io/0FluffStart/`
4. Tap **Set**. New tabs and homepage opens will now load the dashboard directly.

---

### Mobile & Web (PWA)

#### **Chrome (Android)**

- **Option A (PWA App):** Go to the [Live App](https://jbuilds-g.github.io/0FluffStart/), tap the menu (⋮), and select **Add to Home Screen**.
- **Option B (Homepage):** Go to **Settings** → **Homepage** → turn **On** → paste `https://jbuilds-g.github.io/0FluffStart/`.

#### **Firefox**

1. Go to **Settings** → **Homepage** → **Custom URL**.
2. Paste `https://jbuilds-g.github.io/0FluffStart/` and tap **Set**.

#### **Safari (iOS)**

1. Open the [Live App](https://jbuilds-g.github.io/0FluffStart/) in Safari.
2. Tap **Share** → **Add to Home Screen**.

> [!IMPORTANT]
> **Update Policy:**
>
> - **PWA / Web:** Updates automatically via Service Worker when online.
> - **Browser Extension:** Requires manual updating by replacing the local folder with new release files.

---

## 💾 Data Sync & Management

Data is stored locally in `localStorage` and `IndexedDB`. Background media images and videos are serialized directly into base64 JSON backups.

1. **Export:** Go to _Settings > Data Management_ → Click **Backup (Save)**.
2. **Transfer:** Send the `.json` file to your target device.
3. **Import:** Open the app on the new device → _Settings > Data Management_ → Click **Restore (Load)**.

---

## 🏛️ Project Structure

```text
├── assets/
│   └── icons/            # SVG vector icons for UI and search engines
├── css/                  # Modular design system stylesheets
│   ├── base.css          # Core resets & typography
│   ├── core.css          # Main stylesheet entry point (@imports)
│   ├── cursor.css        # Vector cursor engine styles
│   ├── layout.css        # Main container, header & responsive grid
│   ├── links.css         # Quick links & folder management UI
│   ├── modal.css         # Settings modal & dialog components
│   ├── search.css        # Search bar & autocomplete dropdown
│   ├── themes.css        # Built-in theme preset definitions
│   ├── utilities.css     # Helper classes & responsive overrides
│   └── variables.css     # Design tokens & CSS custom properties
├── js/                   # Modular ES application architecture
│   ├── main.js           # App entry point & event initialization
│   ├── cursor.js         # Theme-adaptive custom vector cursor
│   ├── links.js          # Link management & drag-and-drop tree engine
│   ├── material-you-engine.js # Dynamic Monet HSL color extractor
│   ├── storage.js        # IndexedDB & base64 backup/restore handlers
│   ├── store.js          # Centralized reactive state engine
│   ├── suggestions.js    # Live search & history log controllers
│   ├── ui.js             # UI render state & settings management
│   ├── utils.js          # Shared sanitizers, debouncers & helpers
│   └── version.js        # Application version metadata
├── index.html            # Core HTML5 application entry point
├── manifest.json         # Manifest V3 extension configuration (Chromium)
├── manifest.firefox.json # Gecko extension manifest configuration
├── pwa-manifest.json     # PWA web application manifest
├── PRIVACY.md            # Privacy policy documentation
├── TAGS.md               # Search engine shortcut tag reference
└── sw.js                 # Service Worker (Offline PWA engine)
```

## License

Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0-only). See [LICENSE](LICENSE) for details.

---

> [!NOTE]
> The core logic and application code were generated by **Gemini AI** under my supervision and instruction.
