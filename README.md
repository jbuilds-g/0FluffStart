<div align="center">
  <img src="wide-icon.png" width="120" alt="0FluffStart Icon" />
  <h1>0FluffStart</h1>
  <p><i>The high-performance, minimalist productivity engine.</i></p>

  <p><b>The Final Minimalist Dashboard for Desktop & Mobile.</b></p>

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0.html)
![Version](https://img.shields.io/github/v/release/jbuilds-g/0FluffStart?logo=github&label=Release&cacheSeconds=3600)
![Platform: Web | Extension](https://img.shields.io/badge/Platform-Web%20%7C%20Extension-brightgreen)
![downloads](https://img.shields.io/github/downloads/jbuilds-g/0FluffStart/total?logo=github&cacheSeconds=3600)
![Stars](https://img.shields.io/github/stars/jbuilds-g/0fluffstart)

[**🌐 Landing Page**](https://0fluffstart-site.pages.dev/) &nbsp;|&nbsp; [**🚀 Launch Web App**](https://0fluffstart.pages.dev/)

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

## 🛠️ Features

<details>
<summary><b>🔍 Search Engine & Navigation Router</b></summary>
<br>

| Feature                          | Description                                                                                                                                      |
| :------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Query & URL Auto-Resolution**  | Auto-detects plain text queries versus domain syntax/URLs for direct navigation or web searches.                                                 |
| **Instant Tag Routing**          | Prefix queries using shortcut tags (`?g`, `?d`, `?b`, `?bi`, `?st`, `?s`, `?e`, `?k`, `?w`, `?y`) to switch target engines on the fly.           |
| **Custom Engine Integration**    | Add, edit, or delete custom search engines with personalized query endpoints and shortcut tags.                                                  |
| **Engine Checklist**             | Multi-select menu within settings to filter which built-in and custom search engines appear in the search bar dropdown.                          |
| **Privacy Autocomplete Proxy**   | Route live autocomplete suggestion feeds securely through a custom lightweight CORS proxy with self-hosted endpoint support.                     |
| **In-Memory Suggestion Caching** | Private LRU cache storing recent autocomplete responses for zero-latency instant results on repeated queries.                                    |
| **Quick Suggestion Switcher**    | Dedicated inline toggle (`#quickSuggestToggleBtn`) inside the search bar to instantly pause/resume autocomplete network calls.                   |
| **Granular Visibility Control**  | Independent master/child toggles to hide or show the Engine Switcher, Suggestion Toggle, and Search/Submit Button.                               |
| **Dual Search Bar Layouts**      | Toggle between a **Unified Search Bar** container and a **Segmented Floating Bar** presentation style.                                           |
| **New Tab Guard**                | Dedicated setting (`openInNewTab`) to force search queries and quick link clicks into a new browser tab (`_blank`) or replace the active window. |
| **Offline Search History**       | Privacy-focused local query logging with history-based autocomplete suggestions and a 1-click purge tool.                                        |

</details>
<details>
<summary><b>🎨 Personalization, Themes & Media Engine</b></summary>
<br>

| Feature                       | Description                                                                                                                                                                                      |
| :---------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Material You Monet Engine** | Dynamic color extraction algorithm that analyzes uploaded custom background images or video loops to build adaptive UI accent palettes.                                                          |
| **IndexedDB Binary Storage**  | Complete offline binary storage (`Blob`/`File`) for custom high-resolution background photos and video loops using IndexedDB.                                                                    |
| **Base64 JSON Serialization** | Backup and restore pipeline converting binary background files stored in IndexedDB into portable Base64 strings inside exported `.json` files.                                                   |
| **Fluid Theme Presets**       | 15+ built-in aesthetic themes (OLED Dark, True Black AMOLED, Material You, Cyberpunk, Nord Frost, Dracula, Rose Pine, Sunset Drive, Paper & Ink, etc.) featuring GPU-accelerated hover dynamics. |
| **Shadow Intensity Control**  | Global CSS variable slider (`--shadow-intensity`) providing real-time depth control over shadows on cards, search bars, modals, and quick link icons.                                            |
| **Vector Custom Cursor**      | Theme-adaptive SVG cursor engine featuring custom hover expansion and drag-state feedback.                                                                                                       |

</details>
<details>
<summary><b>📁 Link Management & Organization</b></summary>
<br>

| Feature                      | Description                                                                                                                                       |
| :--------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| **3-Level Nested Folders**   | Create, edit, and recursively nest shortcut links inside custom folders up to 3 levels max (`Dashboard > Folder > Subfolder > Nested Subfolder`). |
| **Non-Destructive Guarding** | Strict drag-and-drop rejection prevents illegal Level 4+ nesting attempts with zero state corruption or file unlinking.                           |
| **In-Folder Item Creation**  | Direct `+ New Link`, `+ New Folder`, and `+ Existing` action rows embedded inside expanded folder views.                                          |
| **Spatial Drag-and-Drop**    | Native pointer-events reordering engine with edge boundary auto-scrolling (`requestAnimationFrame`) and sticky-header offset calculations.        |
| **Multi-Select Toolbar**     | Batch selection mode to move, reorganize, or delete multiple shortcut links simultaneously.                                                       |
| **Icon Title Visibility**    | Toggle shortcut titles to display strictly on hover or remain permanently visible on the dashboard grid.                                          |
| **Floating Exit Dock**       | Decoupled viewport navigation controls (`[ ← Dashboard ]` and `[ ← ]`) anchored with backdrop blur and dynamic shadow inheritance.                |

</details>
<details>
<summary><b>⌛ Clock, Date & Dynamic Greeting System</b></summary>
<br>

| Feature                     | Description                                                                                                          |
| :-------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| **Clock Typographies**      | Selectable display typographies including 3D, Ultra-Minimalist, Bold & Chunky, and Monospace styles.                 |
| **Contextual Greetings**    | Time-aware greeting strings ("Good morning", "Good afternoon", "Good evening") paired with custom user name display. |
| **Precision Time Controls** | Toggles for 12-Hour vs. 24-Hour formats and optional seconds counter display.                                        |

</details>
<details>
<summary><b>⚙️ Command Search & System Utilities</b></summary>
<br>

| Feature                  | Description                                                                                                                                                              |
| :----------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Command-Style Search** | Embedded search input in the settings header (`#settingsSearchInput`) with live card filtering, snippet highlighting, and target panel auto-expansion (`jumpToSetting`). |
| **Accordion Management** | Categorized setting sections with master **Expand All** and **Collapse All** controls.                                                                                   |
| **Data Sync Suite**      | Complete offline tools for **Backup (Save)**, **Restore (Load)**, **Clear History**, and **Factory Reset**.                                                              |
| **Deep-Linking Router**  | URL parameter parsing (`?q=`, `?engine=`, `#settings`, `?folder=`) allowing direct deep-link triggers with post-execution state cleaning via `history.replaceState()`.   |

</details>
<details>
<summary><b>📱 Mobile & Responsive PWA Adaptations</b></summary>
<br>

| Feature                    | Description                                                                                                                                       |
| :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Bottom Mobile Dock**     | Interactive search pill inside `#mobileDock` that smoothly expands vertically into a primary focused search bar.                                  |
| **Touch-Optimized Bounds** | Expanded touch targets and custom responsive spatial tokens (`--mobile-spacing-x`, `--mobile-header-top-offset`, `--mobile-link-grid-item-size`). |
| **Offline Service Worker** | PWA architecture enabling standalone offline execution, home screen installation, and background asset caching.                                   |
| **Scroll-to-Top Anchor**   | Repositioned fixed floating overlay anchor (`#scrollToTopBtn`) tuned for single-thumb navigation on mobile displays.                              |

</details>

---

## 🛠️ Deployment & Installation

### Desktop (Browser Extension)

#### **Firefox**

1. Install directly from the Firefox Add-ons Store

<a href="https://addons.mozilla.org/firefox/addon/0flufstart/"><img src="https://blog.mozilla.org/addons/files/2020/04/get-the-addon-fx-apr-2020.svg" alt="Download from Mozilla Add-ons" height="48" /></a>

2. Alternatively, download the latest`0FluffStart-(version).xpi` from [Releases](https://github.com/jbuilds-g/0FluffStart/releases/latest) and drag/drop it into Firefox (or open `about:addons` → Gear Icon → _Install Add-on From File..._).

#### **Chromium (Chrome, Edge, Brave)**

- **Chrome Web Store:**

 <a href="https://chromewebstore.google.com/detail/lgfflmhehhgomnkonfaljnfilangoebb?utm_source=item-share-cp"><img src="https://github.com/user-attachments/assets/7a829ba4-dcd0-452b-922a-5efacbfda498" alt="Download from Chrome Web Store" height="48" /></a>

- **Manual Unpacked Loading:**
  - Download `0fluffstart-chrome-(version)zip` from the [Releases](https://github.com/jbuilds-g/0FluffStart/releases/latest).
  - Extract the archive to a local directory.
  - Open `chrome://extensions` in your browser.
  - Enable **Developer Mode** in the top-right corner.
  - Click **Load Unpacked** and select the extracted folder.

### Mobile & Live Web (PWA)

The hosted version is a fully compliant **PWA**, meaning it can be installed as a standalone app that works even without an internet connection.

#### Android (Chrome)

1.  Navigate to the [Live URL](https://https://0fluffstart.pages.dev/).
2.  Tap the three dots (Menu) and select **Add to Home Screen**.
3.  The dashboard will appear in your app drawer as a native application.

_alternatively_

> It can be set as a custom homepage.

1. Open **settings**.
2. Navigate to **Homepage** and turn it **on**.
3. Type or paste the **live URL** `https://0fluffstart.pages.dev/`

#### Firefox

1. Open **Settings** in Firefox.
2. Select **Homepage** -> **Custom URL**.
3. Type or paste the **Live URL**: `https://https://0fluffstart.pages.dev/`
4. Tap **Set**. New tabs and homepage opens will now load the dashboard directly.

---

### Mobile & Web (PWA)

#### **Chrome (Android)**

- **Option A (PWA App):** Go to the [Live App](https://https://0fluffstart.pages.dev/), tap the menu (⋮), and select **Add to Home Screen**.
- **Option B (Homepage):** Go to **Settings** → **Homepage** → turn **On** → paste `https://https://0fluffstart.pages.dev/`.

#### **Firefox**

1. Go to **Settings** → **Homepage** → **Custom URL**.
2. Paste `https://https://0fluffstart.pages.dev/` and tap **Set**.

#### **Safari (iOS)**

1. Open the [Live App](https://https://0fluffstart.pages.dev/) in Safari.
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

<details>
<summary><b>View Complete Architecture Tree</b></summary>

<pre>
perties
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
</pre>

</details>

## License

Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0-only). See [LICENSE](LICENSE) for details.

---

> [!NOTE]
> The core logic and application code were generated by **Gemini AI** under my supervision and instruction.
