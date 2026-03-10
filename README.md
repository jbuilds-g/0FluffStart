# 👑 0FluffStart
**Minimalist, Privacy-First Dashboard for Desktop & Mobile**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Version: 1.0.0](https://img.shields.io/badge/Version-1.0.0-blue)
![Platform: Web | Extension](https://img.shields.io/badge/Platform-Web%20%7C%20Extension-brightgreen)

> 0FluffStart is a lightweight, local-first start page that replaces bloated default homepages. All data, links, settings, search history stays on your device.

[**🚀 Launch Web Version**](https://jbuilds-g.github.io/0FluffStart/)

---

## 🌐 Community & Updates

Stay connected with 0FluffStart:  

- **Official Update Channel:** [0FluffStart](https://t.me/NOFluffStart)  
- **Community Discussion Group:** [0FluffStart Chat](https://t.me/NOFluffStartChat)

Join the channel for the latest releases and news, and hop into the group to ask questions, share tips, and discuss features.

---

## 📖 Overview
0FluffStart is built on a **Zero-Fluff** philosophy: no trackers, no backend, zero dependencies. Works on:

- **Desktop:** Full-featured browser extension (Manifest V3)
- **Mobile:** Lightweight web homepage for browsers without extension support

---

## 🛠️ Installation

### Desktop (Browser Extension)
1. Download the latest source from [Releases](https://github.com/jbuilds-g/0FluffStart/releases)
2. Extract to a local folder
3. Open your browser's extension page (`chrome://extensions` or `edge://extensions`)
4. Enable **Developer Mode**
5. Click **Load Unpacked** → select the extracted folder

### Mobile (Web Homepage)

#### Android (Chrome)
1. Settings → Homepage → On
2. Enter custom URL: `https://jbuilds-g.github.io/0FluffStart/`

#### iOS (Safari)
1. Open the URL in Safari
2. Tap **Share → Add to Home Screen**
3. Launch in full-screen mode without browser UI

---

## 🔥 Key Features
- **Privacy-First:** No external analytics or trackers
- **Customizable Themes:** 7+ styles including OLED, Cyberpunk, Material 3
- **Data Portability:** Backup & restore your settings
- **Smart Search:** Instant engine switching, optional DuckDuckGo suggestions
- **Blazing Performance:** Pure Vanilla JS/CSS, sub-second load times
  
---

## 💾 Data Management
Settings are stored in browser `localStorage`. To transfer between devices:

1. **Export:** *Settings → Advanced → Backup*
2. **Transfer:** Send `.json` file to the other device
3. **Import:** Open 0FluffStart → *Settings → Advanced → Restore*

---

> ⚠️ Core logic and app code were generated with **Gemini AI** under supervision.

---

## 🏛️ Project Structure
```text
├── manifest.json       # Extension config (MV3)
├── index.html          # Entry point
├── state.js            # Data persistence & state
├── ui-logic.js         # DOM & event handling
├── utilities.js        # Search APIs & helper functions
└── *.css               # Modular stylesheets
    └── OflufThemes.css # Extended theme library
