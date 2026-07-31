// utilities.js

/* global links, settings, searchHistory, searchEngines, selectSuggestion, autoSaveSettings */

// --- INDEXEDDB STORAGE ---
// We use IndexedDB for heavy assets to avoid LocalStorage quota limits (typically ~5MB).
const DB_CONFIG = { name: "0FluffDB", version: 1, store: "assets" };

let cachedDBPromise = null;

function openDB() {
  if (cachedDBPromise) return cachedDBPromise;

  cachedDBPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(DB_CONFIG.store)) {
        db.createObjectStore(DB_CONFIG.store);
      }
    };
    req.onsuccess = (e) => {
      const db = e.target.result;
      db.onclose = () => {
        cachedDBPromise = null;
      };
      db.onerror = () => {
        cachedDBPromise = null;
      };
      resolve(db);
    };
    req.onerror = (e) => {
      cachedDBPromise = null;
      reject(e.target.error);
    };
  });

  return cachedDBPromise;
}

window.cachedBgData = null;

async function saveBgToDB(data) {
  window.cachedBgData = data;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_CONFIG.store, "readwrite");
    const store = tx.objectStore(DB_CONFIG.store);
    const req = store.put(data, "backgroundImage");
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function getBgFromDB() {
  if (window.cachedBgData) return window.cachedBgData;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_CONFIG.store, "readonly");
    const store = tx.objectStore(DB_CONFIG.store);
    const req = store.get("backgroundImage");
    req.onsuccess = () => {
      window.cachedBgData = req.result;
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
  });
}

async function clearBgFromDB() {
  window.cachedBgData = null;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_CONFIG.store, "readwrite");
    const store = tx.objectStore(DB_CONFIG.store);
    store.delete("backgroundImage");
    tx.oncomplete = () => resolve();
  });
}

// --- SEARCH ENGINE UTILITY ---

function getCurrentSearchEngine() {
  return (
    searchEngines.find((e) => e.name === settings.searchEngine) ||
    searchEngines[0]
  );
}

// --- SUGGESTIONS ---

let debounceTimer;
let activeFetchController = null;

async function fetchExternalSuggestions(query) {
  if (activeFetchController) {
    activeFetchController.abort();
  }
  activeFetchController = new AbortController();
  const signal = activeFetchController.signal;

  const targetUrl = `https://ac.duckduckgo.com/ac/?q=${encodeURIComponent(query)}&type=json`;

  // STRATEGY 0: Custom User Proxy
  if (settings.customProxyUrl) {
    try {
      const proxyUrl =
        settings.customProxyUrl.endsWith("=") ||
        settings.customProxyUrl.endsWith("?")
          ? `${settings.customProxyUrl}${encodeURIComponent(targetUrl)}`
          : `${settings.customProxyUrl}?url=${encodeURIComponent(targetUrl)}`;

      const res = await fetch(proxyUrl, { signal });
      if (res.ok) {
        const data = await res.json();
        // Handle direct array returns (like corsproxy)
        if (Array.isArray(data))
          return data.map((item) => item.phrase).filter((p) => p);
        // Handle wrapped contents (like allorigins)
        if (data.contents) {
          const innerData = JSON.parse(data.contents);
          if (Array.isArray(innerData))
            return innerData.map((item) => item.phrase).filter((p) => p);
        }
      }
    } catch (e) {
      if (e.name === "AbortError") return [];
      console.warn("Custom proxy failed, falling back to defaults...", e);
    }
  }

  // STRATEGY 1: Corsproxy.io
  try {
    const proxyUrl = `https://corsproxy.io?${encodeURIComponent(targetUrl)}`;
    const res = await fetch(proxyUrl, { signal });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data))
        return data.map((item) => item.phrase).filter((p) => p);
    }
  } catch (e) {
    if (e.name === "AbortError") return [];
    console.warn("Primary proxy failed, switching to fallback...", e);
  }

  // STRATEGY 2: AllOrigins
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(proxyUrl, { signal });
    if (res.ok) {
      const wrapper = await res.json();
      const innerData = JSON.parse(wrapper.contents);
      if (Array.isArray(innerData))
        return innerData.map((item) => item.phrase).filter((p) => p);
    }
  } catch (e) {
    if (e.name !== "AbortError") {
      console.error("All proxies failed for suggestions.", e);
    }
  }

  return [];
}

function handleSuggestions() {
  const inputEl = document.getElementById("searchInput");
  const input = inputEl.value.toLowerCase().trim();
  const container = document.getElementById("suggestionsContainer");

  clearTimeout(debounceTimer);

  if (input.length < 2) {
    container.innerHTML = "";
    container.classList.add("hidden");
    return;
  }

  // 1. Local Matches (Instant)
  let suggestions = [];

  if (settings.historyEnabled) {
    const linkMatches = links
      .filter((l) => l.name.toLowerCase().includes(input))
      .map((l) => ({ name: l.name, url: l.url, type: "Link" }));

    const historyMatches = searchHistory
      .filter((h) => h.toLowerCase().includes(input))
      .map((h) => ({ name: h, type: "History" }));

    suggestions = [...linkMatches, ...historyMatches];
  }

  // Render Local immediately
  renderSuggestions(suggestions, container);

  // 2. External Matches (Debounced)
  if (settings.externalSuggest) {
    debounceTimer = setTimeout(() => {
      fetchExternalSuggestions(input).then((external) => {
        const uniqueExternal = external
          .map((name) => ({ name: name, type: "Search" }))
          .filter(
            (ext) =>
              !suggestions.some(
                (s) => s.name.toLowerCase() === ext.name.toLowerCase(),
              ),
          );

        const finalSuggestions = [...suggestions, ...uniqueExternal];
        renderSuggestions(finalSuggestions, container);
      });
    }, 300);
  }
}

function renderSuggestions(suggestions, container) {
  container.innerHTML = "";

  if (suggestions.length === 0) {
    container.classList.add("hidden");
    return;
  }

  suggestions.slice(0, 10).forEach((s) => {
    const item = document.createElement("div");
    item.className = "suggestion-item";

    item.addEventListener("click", () => {
      selectSuggestion({ name: s.name, url: s.url || "", type: s.type });
    });

    const nameEl = document.createElement("span");
    nameEl.innerText = s.name;

    const typeEl = document.createElement("span");
    typeEl.className = "suggestion-type";
    typeEl.innerText = s.type === "Search" ? "Web" : s.type;

    item.appendChild(nameEl);
    item.appendChild(typeEl);
    container.appendChild(item);
  });

  container.classList.remove("hidden");
}

function logSearch(query) {
  const currentHistory = store.getState().searchHistory || [];
  const currentSettings = store.getState().settings || {};
  const trimmedQuery = query.trim();

  if (
    currentSettings.historyEnabled &&
    trimmedQuery &&
    !currentHistory.includes(trimmedQuery)
  ) {
    const updatedHistory = [trimmedQuery, ...currentHistory].slice(0, 20);
    store.setState({ searchHistory: updatedHistory });
  }
}

async function clearHistory() {
  const confirmed = await customConfirm(
    "Are you sure you want to clear your local search history?",
    "Clear Search History?",
  );
  if (confirmed) {
    store.setState({ searchHistory: [] });
    document.getElementById("searchInput")?.focus();
    if (typeof handleSuggestions === "function") handleSuggestions();
    showToast("Search history cleared", "info");
  }
}

let cachedHour = null;
let cachedUserName = null;

function getGreeting(userName, hour) {
  let greeting = "Hello";
  if (hour < 5) greeting = "Good Night";
  else if (hour < 12) greeting = "Good Morning";
  else if (hour < 17) greeting = "Good Afternoon";
  else if (hour < 22) greeting = "Good Evening";
  else greeting = "Good Night";
  const name = userName ? `, ${userName}` : "";
  return `${greeting}${name}.`;
}

let clockEl = null;
let greetingEl = null;
let cachedTimeString = null;

function updateClock() {
  if (!clockEl || !document.body.contains(clockEl)) {
    clockEl = document.getElementById("clockDisplay");
  }
  if (!greetingEl || !document.body.contains(greetingEl)) {
    greetingEl = document.getElementById("greetingDisplay");
  }
  if (!clockEl || !greetingEl) return;

  const now = new Date();
  const currentHour = now.getHours();
  let h = currentHour;
  let m = String(now.getMinutes()).padStart(2, "0");
  let s = String(now.getSeconds()).padStart(2, "0");
  let suffix = "";

  if (settings.clockFormat === "12h") {
    suffix = h >= 12 ? " PM" : " AM";
    h = h % 12 || 12;
    if (h < 10) h = String(h).replace(/^0+/, "");
  } else {
    h = String(h).padStart(2, "0");
  }

  const showSeconds = settings.showSeconds !== false;
  const timeString = `${showSeconds ? `${h}:${m}:${s}` : `${h}:${m}`}${suffix}`;

  if (cachedTimeString !== timeString) {
    clockEl.textContent = timeString;
    cachedTimeString = timeString;
  }

  if (cachedHour !== currentHour || cachedUserName !== settings.userName) {
    greetingEl.textContent = getGreeting(settings.userName, currentHour);
    cachedHour = currentHour;
    cachedUserName = settings.userName;
  }
}

// --- UPGRADED MEDIA HANDLER ---
async function handleImageUpload(input) {
  const file = input.files[0];
  const fileNameEl = document.getElementById("bgFileName");
  const resetBtn = document.getElementById("resetBgBtn");

  // Accept both image and video MIME types
  if (
    file &&
    (file.type.startsWith("image/") || file.type.startsWith("video/"))
  ) {
    try {
      // Store raw file in IndexedDB
      await saveBgToDB(file);

      // Update settings to flag IDB usage
      settings.backgroundImage = "indexeddb";
      autoSaveSettings("background");

      // Revoke prior Object URLs to prevent memory leaks
      if (window.activeBgObjectUrls) {
        window.activeBgObjectUrls.forEach((url) => URL.revokeObjectURL(url));
        window.activeBgObjectUrls.clear();
      } else {
        window.activeBgObjectUrls = new Set();
      }

      // Generate zero-latency preview token and track in Set
      const objectUrl = URL.createObjectURL(file);
      window.activeBgObjectUrls.add(objectUrl);

      const bgVideo = document.getElementById("bgVideo");
      const bgOverlay = document.getElementById("bgOverlay");

      if (file.type.startsWith("video/")) {
        // Route to Video Player
        document.body.style.backgroundImage = ""; // Clear fallback image
        if (bgVideo) {
          bgVideo.src = objectUrl;
          bgVideo.classList.remove("hidden");
        }
      } else {
        // Route to CSS Background
        if (bgVideo) {
          bgVideo.src = "";
          bgVideo.classList.add("hidden");
        }
        document.body.style.backgroundImage = `url('${objectUrl}')`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundAttachment = "fixed";
      }

      if (fileNameEl) fileNameEl.innerText = file.name;
      if (resetBtn) resetBtn.style.display = "inline-block";
      if (bgOverlay) bgOverlay.style.opacity = "1";

      // --- Force the theme engine to extract the new colors instantly! ---
      if (typeof triggerMaterialYou === "function") triggerMaterialYou();
    } catch (e) {
      console.error("Failed to save media to DB", e);
      alert("Failed to save background media. Database error.");
    }
  } else {
    clearBackground();
  }
}

async function clearBackground() {
  settings.backgroundImage = null;
  autoSaveSettings("background");
  await clearBgFromDB(); // Purge from IDB

  // Revoke all object URLs from memory instantly
  if (window.activeBgObjectUrls) {
    window.activeBgObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    window.activeBgObjectUrls.clear();
  }

  document.body.style.backgroundImage = "";

  // Kill the video player explicitly
  const bgVideo = document.getElementById("bgVideo");
  if (bgVideo) {
    bgVideo.src = "";
    bgVideo.classList.add("hidden");
  }

  const inputEl = document.getElementById("bgImageInput");
  const nameEl = document.getElementById("bgFileName");
  const resetBtn = document.getElementById("resetBgBtn");
  const overlay = document.getElementById("bgOverlay");

  if (inputEl) inputEl.value = "";
  if (nameEl) nameEl.innerText = "No media selected.";
  if (resetBtn) resetBtn.style.display = "none";
  if (overlay) overlay.style.opacity = "0";

  // --- Revert the theme back to the default color instantly! ---
  if (typeof triggerMaterialYou === "function") triggerMaterialYou();
}

// Exports
window.fetchExternalSuggestions = fetchExternalSuggestions;
window.handleSuggestions = handleSuggestions;
window.logSearch = logSearch;
window.clearHistory = clearHistory;
window.getGreeting = getGreeting;
window.updateClock = updateClock;
window.handleImageUpload = handleImageUpload;
window.clearBackground = clearBackground;
window.getCurrentSearchEngine = getCurrentSearchEngine;
window.saveBgToDB = saveBgToDB;
window.getBgFromDB = getBgFromDB;
