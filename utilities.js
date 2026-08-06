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
window.getGreeting = getGreeting;
window.updateClock = updateClock;
window.handleImageUpload = handleImageUpload;
window.clearBackground = clearBackground;
window.getCurrentSearchEngine = getCurrentSearchEngine;
window.saveBgToDB = saveBgToDB;
window.getBgFromDB = getBgFromDB;
