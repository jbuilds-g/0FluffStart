import { store } from "./store.js";
import { sanitizeUrl } from "./utils.js";
import { saveBgToDB, getBgFromDB, clearBgFromDB } from "./storage.js";
import { MaterialYouEngine } from "./material-you-engine.js";
import { cancelEdit, openEditor, renderLinkManager } from "./links.js";
import { APP_VERSION } from "./version.js";
// import { initNotes } from "./notes.js"; -- FEATURE DISABLED: Unhooked for future potential use

const materialYouEngine = new MaterialYouEngine();

const svgCache = new Map();

export async function loadInlineIcons(root = document) {
  const nodes = root.querySelectorAll("[data-icon]");
  for (const node of nodes) {
    const name = node.dataset.icon;
    if (!name) continue;
    if (!svgCache.has(name)) {
      try {
        const res = await fetch(`./assets/icons/${name}.svg`);
        if (res.ok) {
          const text = await res.text();
          svgCache.set(name, text);
        }
      } catch (e) {
        console.warn(`Failed to fetch icon: ${name}`, e);
      }
    }
    if (svgCache.has(name) && node.isConnected) {
      node.innerHTML = svgCache.get(name);
    }
  }
}

const GENERIC_SEARCH_ICON = `<span class="inline-icon" data-icon="search"></span>`;

export const searchEngines = [
  {
    name: "Google",
    url: "https://www.google.com/search?q=",
    icon: `<span class="inline-icon" data-icon="google"></span>`,
  },
  {
    name: "DuckDuckGo",
    url: "https://duckduckgo.com/?q=",
    icon: `<span class="inline-icon" data-icon="duckduckgo"></span>`,
  },
  {
    name: "Bing",
    url: "https://www.bing.com/search?q=",
    icon: `<span class="inline-icon" data-icon="bing"></span>`,
  },
  {
    name: "Brave",
    url: "https://search.brave.com/search?q=",
    icon: `<span class="inline-icon" data-icon="brave"></span>`,
  },
  {
    name: "Startpage",
    url: "https://www.startpage.com/sp/search?query=",
    icon: `<span class="inline-icon" data-icon="startpage"></span>`,
  },
  {
    name: "Ecosia",
    url: "https://www.ecosia.org/search?q=",
    icon: `<span class="inline-icon" data-icon="ecosia"></span>`,
  },
  {
    name: "Kagi",
    url: "https://kagi.com/search?q=",
    icon: `<span class="inline-icon" data-icon="kagi"></span>`,
  },
  {
    name: "SearXNG",
    url: "https://searx.be/search?q=",
    icon: `<span class="inline-icon" data-icon="searxng"></span>`,
  },
  {
    name: "Wikipedia",
    url: "https://en.wikipedia.org/wiki/Special:Search?search=",
    icon: `<span class="inline-icon" data-icon="wikipedia"></span>`,
  },
  {
    name: "YouTube",
    url: "https://www.youtube.com/results?search_query=",
    icon: `<span class="inline-icon" data-icon="youtube"></span>`,
  },
];

/**
 * Retrieves list of active search engines combining built-in and custom configurations.
 * @returns {Array<{name: string, url: string, icon: string, isCustom?: boolean, id?: string}>}
 */
export function getAvailableEngines() {
  const settings = store.getState().settings || {};
  const enabledNames =
    settings.enabledEngines || searchEngines.map((e) => e.name);
  const custom = settings.customEngines || [];

  const activeBuiltIn = searchEngines.filter((e) =>
    enabledNames.includes(e.name),
  );
  const activeCustom = custom.map((c) => ({
    name: c.name,
    url: c.url,
    icon: GENERIC_SEARCH_ICON,
    isCustom: true,
    id: c.id,
  }));

  const combined = [...activeBuiltIn, ...activeCustom];
  return combined.length > 0 ? combined : [searchEngines[0]];
}

let cachedHour = null;
let cachedUserName = null;
let clockEl = null;
let greetingEl = null;
let cachedTimeString = null;

export function initCustomSelects() {
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest(".select-trigger");
    const selectContainer = e.target.closest(".custom-select");

    document.querySelectorAll(".custom-select").forEach((cs) => {
      if (cs !== selectContainer) {
        cs.classList.remove("open");
        cs.querySelector(".select-dropdown")?.classList.add("hidden");
      }
    });

    if (trigger && selectContainer) {
      const dropdown = selectContainer.querySelector(".select-dropdown");
      const isOpening = dropdown?.classList.contains("hidden");
      selectContainer.classList.toggle("open", isOpening);
      dropdown?.classList.toggle("hidden");
      return;
    }

    const option = e.target.closest(".select-option");
    if (option && selectContainer) {
      const value = option.dataset.value;
      const label = option.textContent.trim();
      const labelEl = selectContainer.querySelector(".selected-text");
      const dropdown = selectContainer.querySelector(".select-dropdown");

      if (labelEl) labelEl.textContent = label;
      selectContainer.dataset.value = value;

      selectContainer.querySelectorAll(".select-option").forEach((opt) => {
        opt.classList.toggle("selected", opt === option);
      });

      selectContainer.classList.remove("open");
      dropdown?.classList.add("hidden");
      selectContainer.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
}

export function setCustomSelectValue(selectId, value) {
  const selectEl = document.getElementById(selectId);
  if (!selectEl) return;
  const option = selectEl.querySelector(
    `.select-option[data-value="${value}"]`,
  );
  if (option) {
    selectEl
      .querySelectorAll(".select-option")
      .forEach((opt) => opt.classList.remove("selected"));
    option.classList.add("selected");
    const labelEl = selectEl.querySelector(".selected-text");
    if (labelEl) labelEl.textContent = option.textContent.trim();
    selectEl.dataset.value = value;
  }
}

export function getCustomSelectValue(selectId) {
  const selectEl = document.getElementById(selectId);
  return selectEl ? selectEl.dataset.value || "" : "";
}

export function getGreeting(userName, hour) {
  let greeting = "Hello";
  if (hour < 5) greeting = "Good Night";
  else if (hour < 12) greeting = "Good Morning";
  else if (hour < 17) greeting = "Good Afternoon";
  else if (hour < 22) greeting = "Good Evening";
  else greeting = "Good Night";
  const name = userName ? `, ${userName}` : "";
  return `${greeting}${name}.`;
}

export function updateClock() {
  const settings = store.getState().settings || {};

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

export function applyClockStyle() {
  const settings = store.getState().settings || {};
  const clock = document.getElementById("clockDisplay");
  if (clock) {
    clock.className = "clock";
    clock.classList.add(`clock-style-${settings.clockStyle || "default"}`);
  }
}

export function renderEngineDropdown() {
  const settings = store.getState().settings || {};
  const dropdown = document.getElementById("engineDropdown");
  if (!dropdown) return;
  dropdown.innerHTML = "";

  const available = getAvailableEngines();
  let current = available.find((s) => s.name === settings.searchEngine);

  if (!current) {
    current = available[0];
    if (settings.searchEngine !== current.name) {
      autoSaveSettings({ searchEngine: current.name });
    }
  }

  const iconEl = document.getElementById("currentEngineIcon");
  if (iconEl) iconEl.innerHTML = current.icon;

  available.forEach((e) => {
    const div = document.createElement("div");
    div.className = `engine-option ${e.name === settings.searchEngine ? "selected" : ""}`;
    div.innerHTML = `<span class="engine-icon">${e.icon}</span> <span>${e.name}</span>`;

    div.addEventListener("click", () => {
      autoSaveSettings({ searchEngine: e.name });
      renderEngineDropdown();
      toggleEngineDropdown();
    });
    dropdown.appendChild(div);
  });

  const switcher = document.querySelector(".engine-switcher");
  if (switcher) loadInlineIcons(switcher);
  loadInlineIcons(dropdown);
}

export function toggleEngineDropdown() {
  document.getElementById("engineDropdown")?.classList.toggle("hidden");
}

export function handleSearch(e) {
  if (e.key === "Enter" || e.type === "click") {
    let val = document.getElementById("searchInput")?.value.trim();
    if (!val) return;

    const state = store.getState();
    const available = getAvailableEngines();

    const customEngines = state.settings?.customEngines || [];
    const customTags = customEngines.map((c) => ({
      tag: c.tag || `?${c.name.charAt(0).toLowerCase()}`,
      name: c.name,
    }));

    const tagMap = [
      ...customTags,
      { tag: "?bi", name: "Bing" },
      { tag: "?b", name: "Brave" },
      { tag: "?st", name: "Startpage" },
      { tag: "?s", name: "SearXNG" },
      { tag: "?g", name: "Google" },
      { tag: "?d", name: "DuckDuckGo" },
      { tag: "?e", name: "Ecosia" },
      { tag: "?k", name: "Kagi" },
      { tag: "?w", name: "Wikipedia" },
      { tag: "?y", name: "YouTube" },
    ];

    let targetEngine = null;
    for (const item of tagMap) {
      if (
        val.toLowerCase().startsWith(item.tag + " ") ||
        val.toLowerCase() === item.tag
      ) {
        targetEngine = available.find(
          (eng) => eng.name.toLowerCase() === item.name.toLowerCase(),
        );
        val = val.slice(item.tag.length).trim();
        break;
      }
    }

    if (!val) return;

    if (!targetEngine) {
      targetEngine =
        available.find((s) => s.name === state.settings?.searchEngine) ||
        available[0];
    }

    const history = state.searchHistory || [];
    if (state.settings?.historyEnabled !== false) {
      const updatedHistory = [
        val,
        ...history.filter((item) => item !== val),
      ].slice(0, 50);
      store.setState({ searchHistory: updatedHistory });
    }

    if (val.includes(".") && !val.includes(" ")) {
      const safeUrl = sanitizeUrl(val);
      if (safeUrl !== "#") window.location.href = safeUrl;
    } else {
      window.location.href = `${targetEngine.url}${encodeURIComponent(val)}`;
    }
  }
}

export function selectSuggestion(suggestion) {
  const inputEl = document.getElementById("searchInput");
  if (inputEl) {
    const currentVal = inputEl.value.trim().toLowerCase();
    const tags = ["?bi", "?b", "?st", "?s", "?g", "?d", "?e", "?k", "?w", "?y"];
    const matchedTag = tags.find(
      (t) => currentVal.startsWith(t + " ") || currentVal === t,
    );
    inputEl.value = matchedTag
      ? `${matchedTag} ${suggestion.name}`
      : suggestion.name;
  }

  document.getElementById("suggestionsContainer")?.classList.add("hidden");

  if (suggestion.type === "Link") {
    const safeUrl = sanitizeUrl(suggestion.url);
    if (safeUrl !== "#") window.location.href = safeUrl;
  } else {
    let val = suggestion.name.trim();
    if (!val) return;

    const state = store.getState();
    const available = getAvailableEngines();
    const customEngines = state.settings?.customEngines || [];
    const customTags = customEngines.map((c) => ({
      tag: c.tag || `?${c.name.charAt(0).toLowerCase()}`,
      name: c.name,
    }));

    const tagMap = [
      ...customTags,
      { tag: "?bi", name: "Bing" },
      { tag: "?b", name: "Brave" },
      { tag: "?st", name: "Startpage" },
      { tag: "?s", name: "SearXNG" },
      { tag: "?g", name: "Google" },
      { tag: "?d", name: "DuckDuckGo" },
      { tag: "?e", name: "Ecosia" },
      { tag: "?k", name: "Kagi" },
      { tag: "?w", name: "Wikipedia" },
      { tag: "?y", name: "YouTube" },
    ];

    let targetEngine = null;
    for (const item of tagMap) {
      if (
        val.toLowerCase().startsWith(item.tag + " ") ||
        val.toLowerCase() === item.tag
      ) {
        targetEngine = available.find(
          (eng) => eng.name.toLowerCase() === item.name.toLowerCase(),
        );
        val = val.slice(item.tag.length).trim();
        break;
      }
    }

    if (!val) return;

    if (!targetEngine) {
      targetEngine =
        available.find((s) => s.name === state.settings?.searchEngine) ||
        available[0];
    }

    const history = state.searchHistory || [];
    if (state.settings?.historyEnabled !== false) {
      const updatedHistory = [
        val,
        ...history.filter((item) => item !== val),
      ].slice(0, 50);
      store.setState({ searchHistory: updatedHistory });
    }

    if (val.includes(".") && !val.includes(" ")) {
      const safeUrl = sanitizeUrl(val);
      if (safeUrl !== "#") window.location.href = safeUrl;
    } else {
      window.location.href = `${targetEngine.url}${encodeURIComponent(val)}`;
    }
  }
}

/**
 * Declarative specification mapping setting keys to DOM element attributes and control types.
 */
const SETTINGS_MAP = [
  {
    key: "theme",
    id: "themeSelect",
    type: "custom-select",
    defaultVal: "dark",
  },
  {
    key: "clockStyle",
    id: "clockStyleSelect",
    type: "custom-select",
    defaultVal: "default",
  },
  { key: "userName", id: "userNameInput", type: "input-text", defaultVal: "" },
  {
    key: "showSeconds",
    id: "showSecondsToggle",
    type: "checkbox",
    defaultVal: true,
  },
  {
    key: "clockFormat",
    name: "clockFormat",
    type: "radio-group",
    defaultVal: "24h",
  },
  {
    key: "externalSuggest",
    id: "externalSuggestToggle",
    type: "checkbox",
    defaultVal: false,
  },
  {
    key: "cacheSuggestions",
    id: "cacheSuggestToggle",
    type: "checkbox",
    defaultVal: true,
  },
  {
    key: "suggestProvider",
    id: "suggestProviderSelect",
    type: "custom-select",
    defaultVal: "auto",
  },
  {
    key: "enabledEngines",
    type: "custom-array",
    defaultVal: searchEngines.map((e) => e.name),
  },
  {
    key: "customEngines",
    type: "custom-array",
    defaultVal: [],
  },
  {
    key: "customProxyUrl",
    id: "customProxyInput",
    type: "input-text",
    defaultVal: "",
  },
  {
    key: "historyEnabled",
    id: "historyEnabledToggle",
    type: "checkbox",
    defaultVal: true,
  },
  {
    key: "showTitles",
    id: "showTitlesToggle",
    type: "checkbox",
    defaultVal: false,
  },
  {
    key: "forceDesktop",
    id: "forceDesktopToggle",
    type: "checkbox",
    defaultVal: false,
  },
  {
    key: "customCursorEnabled",
    id: "customCursorToggle",
    type: "checkbox",
    defaultVal: true,
  },
  {
    key: "shadowIntensity",
    id: "shadowSlider",
    type: "range",
    defaultVal: 100,
  },
];

export async function updateBackgroundMedia(sourceType, data) {
  const fileNameEl = document.getElementById("bgFileName");
  const resetBtn = document.getElementById("resetBgBtn");
  const bgUrlInput = document.getElementById("bgUrlInput");
  const bgImageInput = document.getElementById("bgImageInput");
  const overlay = document.getElementById("bgOverlay");
  const bgImage = document.getElementById("bgImage");
  const bgVideo = document.getElementById("bgVideo");

  if (sourceType === "file" && data) {
    try {
      await saveBgToDB(data);
      autoSaveSettings({ backgroundImage: "indexeddb" });

      const objectUrl = materialYouEngine.createMediaObjectUrl(data);
      const isVideo = data.type && data.type.startsWith("video/");

      if (isVideo) {
        if (bgImage) {
          bgImage.style.backgroundImage = "";
          bgImage.classList.add("hidden");
          bgImage.classList.remove("active");
        }
        if (bgVideo) {
          bgVideo.src = objectUrl;
          bgVideo.classList.remove("hidden");
          bgVideo.classList.add("active");
          bgVideo
            .play()
            .catch((err) => console.warn("Playback prevented:", err));
        }
      } else {
        if (bgVideo) {
          bgVideo.src = "";
          bgVideo.classList.add("hidden");
          bgVideo.classList.remove("active");
        }
        if (bgImage) {
          bgImage.style.backgroundImage = `url('${objectUrl}')`;
          bgImage.classList.remove("hidden");
          bgImage.classList.add("active");
        }
      }

      if (fileNameEl) fileNameEl.innerText = data.name || "Custom Media Active";
      if (resetBtn) resetBtn.classList.remove("hidden");
      if (overlay) overlay.classList.add("bg-overlay-active");
      if (bgUrlInput) bgUrlInput.value = "";
    } catch (e) {
      console.error("Failed to save media to DB", e);
      showToast("Failed to save background media. Database error.", "error");
    }
  } else if (
    sourceType === "url" &&
    data &&
    typeof data === "string" &&
    data.trim()
  ) {
    const trimmedUrl = data.trim();
    materialYouEngine.revokeActiveObjectUrl();
    await clearBgFromDB();
    autoSaveSettings({ backgroundImage: trimmedUrl });

    const isVideo = trimmedUrl.match(/\.(mp4|webm|ogg)($|\?)/i);

    if (isVideo) {
      if (bgImage) {
        bgImage.style.backgroundImage = "";
        bgImage.classList.add("hidden");
        bgImage.classList.remove("active");
      }
      if (bgVideo) {
        bgVideo.src = trimmedUrl;
        bgVideo.classList.remove("hidden");
        bgVideo.classList.add("active");
        bgVideo.play().catch((err) => console.warn("Playback prevented:", err));
      }
    } else {
      if (bgVideo) {
        bgVideo.src = "";
        bgVideo.classList.add("hidden");
        bgVideo.classList.remove("active");
      }
      if (bgImage) {
        bgImage.style.backgroundImage = `url('${trimmedUrl}')`;
        bgImage.classList.remove("hidden");
        bgImage.classList.add("active");
      }
    }

    if (fileNameEl) fileNameEl.innerText = "URL Media Active";
    if (resetBtn) resetBtn.classList.remove("hidden");
    if (overlay) overlay.classList.add("bg-overlay-active");
    if (bgImageInput) bgImageInput.value = "";
  } else {
    autoSaveSettings({ backgroundImage: null, materialYouPalette: null });
    await clearBgFromDB();
    materialYouEngine.revokeActiveObjectUrl();

    if (bgImage) {
      bgImage.style.backgroundImage = "";
      bgImage.classList.add("hidden");
      bgImage.classList.remove("active");
    }
    if (bgVideo) {
      bgVideo.src = "";
      bgVideo.classList.add("hidden");
      bgVideo.classList.remove("active");
    }

    if (bgImageInput) bgImageInput.value = "";
    if (bgUrlInput) bgUrlInput.value = "";
    if (fileNameEl) fileNameEl.innerText = "No media selected.";
    if (resetBtn) resetBtn.classList.add("hidden");
    if (overlay) overlay.classList.remove("bg-overlay-active");
  }

  const settings = store.getState().settings || {};
  materialYouEngine.triggerMaterialYou(settings, getBgFromDB);
}

export async function handleImageUpload(input) {
  const file = input.files[0];
  if (
    file &&
    (file.type.startsWith("image/") || file.type.startsWith("video/"))
  ) {
    await updateBackgroundMedia("file", file);
  } else {
    await updateBackgroundMedia("clear", null);
  }
}

export async function clearBackground() {
  await updateBackgroundMedia("clear", null);
}

/**
 * Automatically persists settings updates to the store and triggers theme re-renders.
 * @param {Object|null} [updates=null]
 */
export async function autoSaveSettings(updates = null) {
  const currentSettings = store.getState().settings || {};
  const newSettings = { ...currentSettings };

  if (updates && typeof updates === "object") {
    Object.assign(newSettings, updates);
  } else {
    SETTINGS_MAP.forEach((item) => {
      if (item.type === "custom-select") {
        const val = getCustomSelectValue(item.id);
        if (val) newSettings[item.key] = val;
      } else if (item.type === "input-text") {
        const el = document.getElementById(item.id);
        if (el) newSettings[item.key] = el.value.trim();
      } else if (item.type === "checkbox") {
        const el = document.getElementById(item.id);
        if (el) newSettings[item.key] = !!el.checked;
      } else if (item.type === "range") {
        const el = document.getElementById(item.id);
        if (el) newSettings[item.key] = parseInt(el.value, 10);
      } else if (item.type === "radio-group") {
        const radios = document.getElementsByName(item.name);
        for (let r of radios) {
          if (r.checked) newSettings[item.key] = r.value;
        }
      }
    });
  }

  await store.setState({ settings: newSettings });

  document.body.className = newSettings.theme || "dark";
  document.body.classList.toggle(
    "force-desktop-mode",
    !!newSettings.forceDesktop,
  );
  document
    .getElementById("linkGrid")
    ?.classList.toggle("show-titles", !!newSettings.showTitles);

  const rawVal = newSettings.shadowIntensity ?? 100;
  const shadowVal = rawVal / 100;
  document.documentElement.style.setProperty("--shadow-factor", shadowVal);
  document.documentElement.classList.toggle("no-shadows", rawVal === 0);

  const sliderEl = document.getElementById("shadowSlider");
  const numInputEl = document.getElementById("shadowInputNumber");
  if (sliderEl && parseInt(sliderEl.value, 10) !== rawVal)
    sliderEl.value = rawVal;
  if (numInputEl && parseInt(numInputEl.value, 10) !== rawVal)
    numInputEl.value = rawVal;

  applyClockStyle();
  updateClock();
  await materialYouEngine.triggerMaterialYou(newSettings, getBgFromDB);
  updateSuggestSettingsVisibility();

  if (window.customCursorInstance) {
    window.customCursorInstance.toggleEnabled(
      newSettings.customCursorEnabled !== false,
    );
  }
}

export function updateSuggestSettingsVisibility() {
  const isEnabled = !!document.getElementById("externalSuggestToggle")?.checked;
  const proxyGroup = document.getElementById("customProxyContainer");
  const cacheToggle = document
    .getElementById("cacheSuggestToggle")
    ?.closest(".radio-option");
  const providerSelect = document.getElementById("suggestProviderSelect");

  if (proxyGroup) proxyGroup.classList.toggle("hidden", !isEnabled);
  if (cacheToggle) cacheToggle.classList.toggle("hidden", !isEnabled);
  if (providerSelect) providerSelect.classList.toggle("hidden", !isEnabled);
}

export function applyVersionToUI() {
  document.querySelectorAll("[data-version]").forEach((el) => {
    el.textContent = `v${APP_VERSION}`;
  });
}

export async function loadSettings() {
  const settings = store.getState().settings || {};
  applyVersionToUI();
  // initNotes(); -- FEATURE DISABLED: Unhooked for future potential use

  SETTINGS_MAP.forEach((item) => {
    const val =
      settings[item.key] !== undefined ? settings[item.key] : item.defaultVal;

    if (item.type === "custom-select") {
      setCustomSelectValue(item.id, val);
    } else if (item.type === "input-text") {
      const el = document.getElementById(item.id);
      if (el) el.value = val;
    } else if (item.type === "checkbox") {
      const el = document.getElementById(item.id);
      if (el) el.checked = !!val;
    } else if (item.type === "range") {
      const el = document.getElementById(item.id);
      if (el) el.value = val;
    } else if (item.type === "radio-group") {
      const radios = document.getElementsByName(item.name);
      for (let r of radios) {
        r.checked = r.value === val;
      }
    }
  });

  document.body.className = settings.theme || "dark";
  document.body.classList.toggle("force-desktop-mode", !!settings.forceDesktop);

  const rawVal = settings.shadowIntensity ?? 100;
  document.documentElement.style.setProperty("--shadow-factor", rawVal / 100);
  document.documentElement.classList.toggle("no-shadows", rawVal === 0);
  const numInputEl = document.getElementById("shadowInputNumber");
  if (numInputEl) numInputEl.value = rawVal;

  applyClockStyle();

  const overlay = document.getElementById("bgOverlay");
  const bgVideo = document.getElementById("bgVideo");

  if (settings.backgroundImage === "indexeddb") {
    try {
      const bgData = await getBgFromDB();
      if (bgData) {
        const url = materialYouEngine.createMediaObjectUrl(bgData);
        const bgImage = document.getElementById("bgImage");
        const isVideo =
          (bgData.type && bgData.type.startsWith("video/")) ||
          (typeof bgData === "string" &&
            bgData.match(/\.(mp4|webm|ogg)($|\?)/i));

        if (isVideo) {
          if (bgImage) {
            bgImage.style.backgroundImage = "";
            bgImage.classList.add("hidden");
            bgImage.classList.remove("active");
          }
          if (bgVideo) {
            bgVideo.src = url;
            bgVideo.classList.remove("hidden");
            bgVideo.classList.add("active");
            bgVideo
              .play()
              .catch((err) => console.warn("Playback prevented:", err));
          }
        } else {
          if (bgVideo) {
            bgVideo.src = "";
            bgVideo.classList.add("hidden");
            bgVideo.classList.remove("active");
          }
          if (bgImage) {
            bgImage.style.backgroundImage = `url('${url}')`;
            bgImage.classList.remove("hidden");
            bgImage.classList.add("active");
          }
        }

        if (overlay) overlay.classList.add("bg-overlay-active");
      }
    } catch (e) {
      console.error("Background load fail:", e);
    }
  } else if (
    typeof settings.backgroundImage === "string" &&
    settings.backgroundImage.trim() !== ""
  ) {
    materialYouEngine.revokeActiveObjectUrl();
    const bgUrlInput = document.getElementById("bgUrlInput");
    if (bgUrlInput) bgUrlInput.value = settings.backgroundImage;
    const bgImage = document.getElementById("bgImage");
    if (bgImage) {
      bgImage.style.backgroundImage = `url('${settings.backgroundImage}')`;
      bgImage.classList.remove("hidden");
      bgImage.classList.add("active");
    }
    if (overlay) overlay.classList.add("bg-overlay-active");
  } else {
    materialYouEngine.revokeActiveObjectUrl();
    const bgUrlInput = document.getElementById("bgUrlInput");
    if (bgUrlInput) bgUrlInput.value = "";
    const bgImage = document.getElementById("bgImage");
    if (bgImage) {
      bgImage.style.backgroundImage = "";
      bgImage.classList.add("hidden");
      bgImage.classList.remove("active");
    }
    if (bgVideo) {
      bgVideo.src = "";
      bgVideo.classList.add("hidden");
      bgVideo.classList.remove("active");
    }
    if (overlay) overlay.classList.remove("bg-overlay-active");
  }

  updateClock();
  renderEngineDropdown();
  renderEngineSelectionList();
  materialYouEngine.triggerMaterialYou(settings, getBgFromDB);
  updateSuggestSettingsVisibility();
  loadInlineIcons();

  if (window.customCursorInstance) {
    window.customCursorInstance.toggleEnabled(
      settings.customCursorEnabled !== false,
    );
  }
}

export function toggleSettings(options = {}) {
  cancelEdit();

  const modalContent = document.querySelector("#settingsModal .modal-content");
  if (modalContent && !modalContent.dataset.scrollTrap) {
    modalContent.dataset.scrollTrap = "true";
    let startY = 0;

    modalContent.addEventListener(
      "touchstart",
      (e) => {
        startY = e.touches[0].pageY;
      },
      { passive: true },
    );

    modalContent.addEventListener(
      "touchmove",
      (e) => {
        const currentY = e.touches[0].pageY;
        const isScrollingUp = currentY > startY;
        const isScrollingDown = currentY < startY;
        const scrollTop = modalContent.scrollTop;
        const maxScroll = modalContent.scrollHeight - modalContent.clientHeight;

        if (
          (scrollTop <= 0 && isScrollingUp) ||
          (scrollTop >= maxScroll && isScrollingDown)
        ) {
          if (e.cancelable) e.preventDefault();
        }
      },
      { passive: false },
    );
  }

  if (options.openDashboardLinks) {
    const panels = document.querySelectorAll(
      "#settingsModal details.category-panel",
    );
    panels.forEach((panel) => {
      if (
        panel.querySelector("summary")?.textContent.includes("Dashboard Links")
      ) {
        panel.open = true;
      }
    });
  }

  if (options.targetItemId && options.isFolder) {
    const currentExpanded = store.getState().expandedFolderIds || [];
    if (!currentExpanded.includes(options.targetItemId)) {
      store.setState({
        expandedFolderIds: [...currentExpanded, options.targetItemId],
      });
    }
  }

  renderLinkManager();

  const modal = document.getElementById("settingsModal");
  if (modal) {
    const scrollY = window.scrollY;
    document.documentElement.style.setProperty(
      "--scroll-lock-top",
      `-${scrollY}px`,
    );
    document.body.classList.add("scroll-lock-body");
    modal.classList.add("active");
    document.body.classList.add("modal-open");

    const bgLabel = document.getElementById("bgFileName");
    const resetBtn = document.getElementById("resetBgBtn");
    const settings = store.getState().settings || {};

    if (bgLabel) {
      if (settings.backgroundImage === "indexeddb") {
        bgLabel.innerText = "Custom Media Active";
        bgLabel.style.color = "var(--dim accent)";
        bgLabel.style.marginTop = "10px";
        if (resetBtn) resetBtn.classList.remove("hidden");
      } else {
        bgLabel.innerText = "No media selected.";
        bgLabel.style.color = "var(--dim)";
        if (resetBtn) resetBtn.classList.add("hidden");
      }
    }

    if (options.targetItemId) {
      if (options.isFolder) {
        const managerItem = document.querySelector(
          `.link-manager-item[data-id="${options.targetItemId}"]`,
        );
        managerItem?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        openEditor(options.targetItemId, null);
        const editor = document.getElementById("linkEditorContainer");
        editor?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove("active");
    if (!document.querySelector(".modal.active")) {
      document.body.classList.remove("modal-open");
      const scrollLockTop = getComputedStyle(
        document.documentElement,
      ).getPropertyValue("--scroll-lock-top");
      const storedScrollY = Math.abs(parseInt(scrollLockTop, 10)) || 0;
      document.body.classList.remove("scroll-lock-body");
      window.scrollTo(0, storedScrollY);
      document.documentElement.style.removeProperty("--scroll-lock-top");
    }
    if (id === "settingsModal") {
      document
        .querySelectorAll("#settingsModal details.category-panel")
        .forEach((panel) => (panel.open = false));
      store.setState({ expandedFolderIds: [] });
    }
  }
}

export function customConfirm(message, title = "Are you sure?") {
  return new Promise((resolve) => {
    const modal = document.getElementById("customDialogModal");
    const titleEl = document.getElementById("customDialogTitle");
    const messageEl = document.getElementById("customDialogMessage");
    const cancelBtn = document.getElementById("customDialogCancelBtn");
    const confirmBtn = document.getElementById("customDialogConfirmBtn");

    if (!modal || !titleEl || !messageEl || !cancelBtn || !confirmBtn) {
      return resolve(false);
    }

    titleEl.innerText = title;
    messageEl.innerText = message;
    modal.classList.add("active");
    document.body.classList.add("modal-open");

    const cleanup = () => {
      modal.classList.remove("active");
      if (!document.querySelector(".modal.active")) {
        document.body.classList.remove("modal-open");
      }
      cancelBtn.removeEventListener("click", onCancel);
      confirmBtn.removeEventListener("click", onConfirm);
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    const onConfirm = () => {
      cleanup();
      resolve(true);
    };

    cancelBtn.addEventListener("click", onCancel);
    confirmBtn.addEventListener("click", onConfirm);
  });
}

export function showToast(message, type = "info", duration = 3000) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function renderEngineSelectionList() {
  const container = document.getElementById("engineSelectionList");
  if (!container) return;
  container.innerHTML = "";

  const settings = store.getState().settings || {};
  const enabledNames =
    settings.enabledEngines || searchEngines.map((e) => e.name);
  const custom = settings.customEngines || [];

  searchEngines.forEach((engine) => {
    const item = document.createElement("div");
    item.className = "engine-list-item";

    const left = document.createElement("div");
    left.className = "engine-item-left";

    const iconSpan = document.createElement("span");
    iconSpan.className = "engine-icon";
    iconSpan.innerHTML = engine.icon;

    const nameSpan = document.createElement("span");
    nameSpan.className = "engine-item-name";
    nameSpan.textContent = engine.name;

    left.appendChild(iconSpan);
    left.appendChild(nameSpan);

    const actions = document.createElement("div");
    actions.className = "engine-item-actions";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = enabledNames.includes(engine.name);

    checkbox.addEventListener("change", () => {
      const currentEnabled =
        store.getState().settings?.enabledEngines ||
        searchEngines.map((e) => e.name);
      let updated;
      if (checkbox.checked) {
        updated = [...new Set([...currentEnabled, engine.name])];
      } else {
        if (
          currentEnabled.length <= 1 &&
          (store.getState().settings?.customEngines || []).length === 0
        ) {
          checkbox.checked = true;
          return showToast(
            "At least one search engine must remain active.",
            "error",
          );
        }
        updated = currentEnabled.filter((n) => n !== engine.name);
      }
      autoSaveSettings({ enabledEngines: updated });
      renderEngineDropdown();
    });

    actions.appendChild(checkbox);
    item.appendChild(left);
    item.appendChild(actions);
    container.appendChild(item);
  });

  custom.forEach((eng) => {
    const item = document.createElement("div");
    item.className = "engine-list-item";

    const left = document.createElement("div");
    left.className = "engine-item-left";

    const iconSpan = document.createElement("span");
    iconSpan.className = "engine-icon";
    iconSpan.innerHTML = GENERIC_SEARCH_ICON;

    const nameSpan = document.createElement("span");
    nameSpan.className = "engine-item-name";
    nameSpan.textContent = eng.name;

    left.appendChild(iconSpan);
    left.appendChild(nameSpan);

    const actions = document.createElement("div");
    actions.className = "engine-item-actions";

    const delBtn = document.createElement("button");
    delBtn.className = "engine-delete-btn";
    delBtn.title = "Delete custom engine";
    delBtn.innerHTML = `<span class="icon-mask icon-delete" style="width:16px; height:16px;"></span>`;

    delBtn.addEventListener("click", () => {
      const updated = (store.getState().settings?.customEngines || []).filter(
        (c) => c.id !== eng.id,
      );
      autoSaveSettings({ customEngines: updated });
      renderEngineSelectionList();
      renderEngineDropdown();
      showToast("Custom engine deleted", "info");
    });

    actions.appendChild(delBtn);
    item.appendChild(left);
    item.appendChild(actions);
    container.appendChild(item);
  });
}
