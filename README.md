<div align="center">
  <img src="wide-icon.png" width="120" alt="0FluffStart Icon" />
  <h1>0FluffStart</h1>
  <p><i>The high-performance, minimalist productivity engine.</i></p>

  <p><b>A minimalist, high-performance dashboard for desktop and mobile.</b></p>

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0.html)
![Version](https://img.shields.io/github/v/release/jbuilds-g/0FluffStart?logo=github&label=Release&cacheSeconds=3600)
![Platform: Web | Extension](https://img.shields.io/badge/Platform-Web%20%7C%20Extension-brightgreen)
![downloads](https://img.shields.io/github/downloads/jbuilds-g/0FluffStart/total?logo=github&label=Downloads&cacheSeconds=3600)
![Stars](https://img.shields.io/github/stars/jbuilds-g/0fluffstart)

[**🌐 Landing Page**](https://0fluffstart-site.pages.dev/) &nbsp;|&nbsp; [**🚀 Launch Web App**](https://0fluffstart.pages.dev/)

</div>

---

## 📖 Overview

0FluffStart is built around a **Zero-Fluff** philosophy: no tracking, no accounts, no application backend, and zero runtime dependencies. Core settings, links, history, and background media are stored locally. Optional live autocomplete can make requests to external search services through the built-in or user-configured proxy.

- **Desktop:** A fully integrated browser extension (Manifest V3) or standalone start page.
- **Mobile & Web:** A high-performance **Progressive Web App (PWA)** with offline support and native installation on mobile devices.

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
| **Query & URL Auto-Resolution**  | Automatically detects plain-text queries, domains, and URLs for direct navigation or web searches.                                               |
| **Instant Tag Routing**          | Prefix queries using shortcut tags (`?g`, `?d`, `?b`, `?bi`, `?st`, `?s`, `?e`, `?k`, `?w`, `?y`) to switch target engines on the fly.           |
| **Custom Engine Integration**    | Add, edit, or delete custom search engines with personalized query endpoints and shortcut tags.                                                  |
| **Engine Checklist**             | Multi-select menu within settings to filter which built-in and custom search engines appear in the search bar dropdown.                          |
| **Autocomplete Proxy Routing**  | Route optional live autocomplete requests through the built-in Cloudflare Worker proxy or a user-configured proxy endpoint.                       |
| **Suggestion Provider Selection** | Choose Automatic, DuckDuckGo, Google, Bing, or Brave as the live suggestion provider.                                                        |
| **In-Memory Suggestion Caching** | Optional local LRU cache storing recent autocomplete responses for faster repeated queries.                                                        |
| **Quick Suggestion Switcher**    | Dedicated inline toggle (`#quickSuggestToggleBtn`) inside the search bar to instantly pause/resume autocomplete network calls.                   |
| **Granular Visibility Control**  | Independent master/child toggles to hide or show the Engine Switcher, Suggestion Toggle, and Search/Submit Button.                               |
| **Dual Search Bar Layouts**      | Toggle between a **Unified Search Bar** container and a **Segmented Floating Bar** presentation style.                                           |
| **New Tab Guard**                | Dedicated setting (`openInNewTab`) to force search queries and quick link clicks into a new browser tab (`_blank`) or replace the active window. |
| **Force Desktop Mode**           | Optional setting that keeps the desktop dashboard layout active on smaller screens.                                                              |
| **Offline Search History**       | Local query history with history-based autocomplete suggestions, configurable retention, and a 1-click purge tool.                              |

</details>
<details>
<summary><b>🎨 Personalization, Themes & Media Engine</b></summary>
<br>

| Feature                       | Description                                                                                                                                                                                 |
| :---------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Material You Monet Engine** | Dynamic color extraction that analyzes custom background images and video loops to build adaptive UI accent palettes when source access permits.                                           |
| **IndexedDB Binary Storage**  | Offline binary storage (`Blob`/`File`) for local custom background photos and video loops using IndexedDB.                                                                              |
| **Remote Background Media**   | Use HTTP(S) image or video URLs as custom backgrounds in addition to locally selected media.                                                     |
| **Base64 JSON Serialization** | Backup and restore pipeline converting binary background files stored in IndexedDB into portable Base64 strings inside exported `.json` files.                                              |
| **Fluid Theme Presets**       | 15+ built-in aesthetic themes (OLED Dark, True Black AMOLED, Material You, Cyberpunk, Nord Frost, Dracula, Rose Pine, Sunset Drive, Paper & Ink, etc.) with GPU-accelerated hover dynamics. |
| **Shadow Intensity Control**  | Global CSS variable slider (`--shadow-intensity`) providing real-time depth control over shadows on cards, search bars, modals, and quick link icons.                                       |
| **Vector Custom Cursor**      | Theme-adaptive SVG cursor engine featuring custom hover expansion and drag-state feedback.                                                                                                  |

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
| **Command-Style Search** | Dedicated Settings search with live filtering, nested-setting discovery, automatic expansion, focus handling, scrolling, and result highlighting.                 |
| **Accordion Management** | Categorized setting sections with master **Expand All** and **Collapse All** controls, plus section navigation and setting search.                                       |
| **Data Sync Suite**      | Local tools for **Backup**, **Restore**, **Restore Previous**, **Clear History**, and **Factory Reset**, with validation during backup restoration.                     |
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

2. Alternatively, download the latest `0FluffStart-(version).xpi` from [Releases](https://github.com/jbuilds-g/0FluffStart/releases/latest) and drag and drop it into Firefox (or open `about:addons` → Gear Icon → _Install Add-on From File..._).

#### **Chromium (Chrome, Edge, Brave)**

- **Chrome Web Store:**

 <a href="https://chromewebstore.google.com/detail/lgfflmhehhgomnkonfaljnfilangoebb?utm_source=item-share-cp"><img src="https://github.com/user-attachments/assets/7a829ba4-dcd0-452b-922a-5efacbfda498" alt="Download from Chrome Web Store" height="48" /></a>

- **Manual Unpacked Loading:**
  - Download `0fluffstart-chrome-(version)zip` from the [Releases](https://github.com/jbuilds-g/0FluffStart/releases/latest).
  - Extract the archive to a local directory.
  - Open `chrome://extensions` in your browser.
  - Enable **Developer Mode** in the top-right corner.
  - Click **Load Unpacked** and select the extracted folder.

### Mobile & Web (PWA)

The hosted version is a fully compliant **PWA**, meaning it can be installed as a standalone app that works even without an internet connection.

#### **Chrome (Android)**

- **Option A (PWA App):** Go to the [Live App](https://0fluffstart.pages.dev/), tap the menu (⋮), and select **Add to Home Screen**.
- **Option B (Homepage):** Go to **Settings** → **Homepage** → turn **On** → paste `https://0fluffstart.pages.dev/`.

#### **Firefox**

1. Go to **Settings** → **Homepage** → **Custom URL**.
2. Paste `https://0fluffstart.pages.dev/` and tap **Set**.

#### **Safari (iOS)**

1. Open the [Live App](https://0fluffstart.pages.dev/) in Safari.
2. Tap **Share** → **Add to Home Screen**.

> [!IMPORTANT]
> **Update Policy:**
>
> - **PWA / Web:** Updates automatically via Service Worker when online.
> - **Browser Extension:** Requires manual updating by replacing the local folder with new release files.

---

## 💾 Data Sync & Management

Data is stored locally in `localStorage` and `IndexedDB`. Local background images and videos are serialized into portable Base64 JSON backups.

1. **Export:** Go to _Settings → Data_ → click **Backup**.
2. **Transfer:** Send the `.json` file to your target device.
3. **Import:** Open the app on the new device → _Settings → Data_ → click **Restore**.
4. **Previous restore:** After a restore, use **Restore Previous** when a local restore point is available.

---

## 🏛️ Project Structure

<details>
<summary><b>View Complete Architecture Tree</b></summary>

<pre>
0FluffStart/
├── css/                         # Modular CSS architecture
│   ├── base.css                # Base styles and global element defaults
│   ├── core.css                # Core application component styles
│   ├── cursor.css               # Custom cursor styling and states
│   ├── layout.css               # Dashboard and responsive layout styles
│   ├── links.css                # Quick link and folder styling
│   ├── mobile.css               # Mobile-specific responsive styles
│   ├── modal.css                # Modal and dialog styles
│   ├── search.css               # Search bar and suggestion styles
│   ├── settings-controls.css    # Settings control and picker styles
│   ├── settings-page.css        # Standalone Settings page styles
│   ├── themes.css               # Theme and visual customization styles
│   ├── utilities.css            # Reusable utility classes
│   └── variables.css             # Global CSS custom properties and tokens
├── js/                          # Modular ES application architecture
│   ├── main.js                 # App entry point & event initialization
│   ├── cursor.js               # Theme-adaptive custom vector cursor
│   ├── links.js                # Link management & drag-and-drop tree engine
│   ├── material-you-engine.js  # Dynamic Monet HSL color extractor
│   ├── restore-point.js        # Local previous-restore state handling
│   ├── storage.js              # IndexedDB & Base64 backup/restore handlers
│   ├── store.js                # Centralized reactive state engine
│   ├── settings-page.js        # Standalone Settings page behavior
│   ├── settings-search.js      # Settings search and navigation
│   ├── suggestions.js          # Live search & history log controllers
│   ├── ui.js                   # UI render state & settings management
│   ├── utils.js                # Shared sanitizers, debouncers & helpers
│   └── version.js              # Application version metadata
├── index.html                   # Core HTML5 application entry point
├── settings.html                # Standalone Settings page
├── manifest.json                # Manifest V3 extension configuration (Chromium)
├── manifest.firefox.json        # Gecko extension manifest configuration
├── pwa-manifest.json            # PWA web application manifest
├── PRIVACY.md                   # Privacy policy documentation
├── TAGS.md                      # Search engine shortcut tag reference
└── sw.js                        # Service Worker (Offline PWA engine)
</pre>

</details>

## 📄 License

Licensed under the GNU Affero General Public License v3.0 (AGPL-3.0-only). See [LICENSE](LICENSE) for details.

---

> [!NOTE]
> The core logic and application code were generated with **AI** under my supervision and direction.

---
