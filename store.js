/* store.js - Centralized State & Event Subscriptions */

import { generateId } from "./utils.js";

const DEFAULT_SETTINGS = {
  theme: "dark",
  clockStyle: "default",
  clockFormat: "24h",
  showSeconds: true,
  userName: "",
  searchEngine: "Google",
  externalSuggest: false,
  cacheSuggestions: true,
  suggestProvider: "auto",
  customProxyUrl: "",
  historyEnabled: true,
  showTitles: false,
  forceDesktop: false,
  backgroundImage: null,
};

function loadInitialState() {
  let links = [];
  let settings = { ...DEFAULT_SETTINGS };
  let searchHistory = [];

  try {
    const rawLinks = localStorage.getItem("0fluff_links");
    if (rawLinks) links = JSON.parse(rawLinks);
  } catch (err) {
    console.error("Failed to parse links from localStorage:", err);
  }

  try {
    const rawSettings = localStorage.getItem("0fluff_settings");
    if (rawSettings) {
      settings = { ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) };
    }
  } catch (err) {
    console.error("Failed to parse settings from localStorage:", err);
  }

  try {
    const rawHistory = localStorage.getItem("0fluff_history");
    if (rawHistory) searchHistory = JSON.parse(rawHistory);
  } catch (err) {
    console.error("Failed to parse search history from localStorage:", err);
  }

  let needsSave = false;
  links = links.map((item) => {
    if (!item.id) {
      needsSave = true;
      return {
        id: generateId(),
        type: "link",
        name: item.name,
        url: item.url,
        parentId: null,
      };
    }
    return item;
  });

  if (needsSave) {
    try {
      localStorage.setItem("0fluff_links", JSON.stringify(links));
    } catch (err) {
      console.error("Failed to persist migrated links:", err);
    }
  }

  return {
    links,
    settings,
    searchHistory,
    currentFolderId: null,
    isSelectionMode: false,
    selectedLinkIds: [],
    activeFolderId: null,
    editorTargetFolderId: null,
    isEditingId: null,
  };
}

let state = loadInitialState();
const listeners = new Set();

const saveToStorage = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed persisting ${key} to localStorage:`, e);
  }
};

export const store = {
  getState() {
    return state;
  },
  setState(update) {
    const nextState = typeof update === "function" ? update(state) : update;
    state = { ...state, ...nextState };

    if ("links" in nextState) saveToStorage("0fluff_links", state.links);
    if ("settings" in nextState)
      saveToStorage("0fluff_settings", state.settings);
    if ("searchHistory" in nextState)
      saveToStorage("0fluff_history", state.searchHistory);

    listeners.forEach((listener) => listener(state));
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  unsubscribe(listener) {
    listeners.delete(listener);
  },
};
