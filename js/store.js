/* store.js - Centralized State & Event Subscriptions */

import { generateId } from "./utils.js";

const isExtensionContext =
  typeof chrome !== "undefined" && chrome?.storage?.local;

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
  customCursorEnabled: true,
  backgroundImage: null,
  shadowIntensity: 100,
};

/**
 * Safely loads data asynchronously from extension storage or fallback localStorage.
 * @param {string} key
 * @returns {Promise<any|null>}
 */
async function loadFromStorage(key) {
  if (isExtensionContext) {
    try {
      const res = await chrome.storage.local.get([key]);
      let raw = res[key];
      if (raw !== undefined && raw !== null) {
        return typeof raw === "string" ? JSON.parse(raw) : raw;
      }
    } catch (err) {
      console.warn(`chrome.storage.local read failed for ${key}:`, err);
    }
  }

  try {
    const rawLocal = localStorage.getItem(key);
    if (rawLocal !== null) {
      return JSON.parse(rawLocal);
    }
  } catch (err) {
    console.error(`Failed parsing ${key} from localStorage:`, err);
  }

  return null;
}

/**
 * Persists data asynchronously to both localStorage and chrome.storage.local.
 * @param {string} key
 * @param {any} data
 */
async function saveToStorage(key, data) {
  const serialized = JSON.stringify(data);

  try {
    localStorage.setItem(key, serialized);
  } catch (e) {
    console.error(`Failed persisting ${key} to localStorage:`, e);
  }

  if (isExtensionContext) {
    try {
      await chrome.storage.local.set({ [key]: serialized });
    } catch (e) {
      console.error(`Failed persisting ${key} to chrome.storage.local:`, e);
    }
  }
}

export const DEFAULT_LINKS = [
  {
    id: "lnk_yt",
    name: "YouTube",
    url: "https://youtube.com",
    isFolder: false,
    parentId: null,
  },
  {
    id: "lnk_gh",
    name: "GitHub",
    url: "https://github.com",
    isFolder: false,
    parentId: null,
  },
  {
    id: "lnk_rd",
    name: "Reddit",
    url: "https://reddit.com",
    isFolder: false,
    parentId: null,
  },
  {
    id: "lnk_wk",
    name: "Wikipedia",
    url: "https://wikipedia.org",
    isFolder: false,
    parentId: null,
  },
  { id: "fld_tools", name: "Essential Tools", isFolder: true, parentId: null },
  {
    id: "lnk_ia",
    name: "Internet Archive",
    url: "https://archive.org",
    isFolder: false,
    parentId: "fld_tools",
  },
  {
    id: "lnk_ol",
    name: "Open Library",
    url: "https://openlibrary.org",
    isFolder: false,
    parentId: "fld_tools",
  },
];

async function loadInitialState() {
  let loadedLinks = await loadFromStorage("0fluff_links");
  let links = loadedLinks !== null ? loadedLinks : DEFAULT_LINKS;
  let settingsRaw = await loadFromStorage("0fluff_settings");
  let settings = settingsRaw
    ? { ...DEFAULT_SETTINGS, ...settingsRaw }
    : { ...DEFAULT_SETTINGS };
  let searchHistory = (await loadFromStorage("0fluff_history")) || [];
  let expandedFolderIds =
    (await loadFromStorage("0fluff_expanded_folders")) || [];

  let needsSave = loadedLinks === null;
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
    await saveToStorage("0fluff_links", links);
  }

  return {
    links,
    settings,
    searchHistory,
    currentFolderId: null,
    folderStack: [],
    isSelectionMode: false,
    selectedLinkIds: [],
    activeFolderId: null,
    editorTargetFolderId: null,
    isEditingId: null,
    expandedFolderIds,
    isCreatingFolder: false,
  };
}

/**
 * @typedef {Object} Link
 * @property {string} id
 * @property {string} name
 * @property {string} [url]
 * @property {boolean} [isFolder]
 * @property {string|null} [parentId]
 */

/**
 * @typedef {Object} StoreState
 * @property {Link[]} links
 * @property {Object} settings
 * @property {string[]} searchHistory
 * @property {string|null} currentFolderId
 * @property {boolean} isSelectionMode
 * @property {string[]} selectedLinkIds
 * @property {string|null} activeFolderId
 * @property {string|null} editorTargetFolderId
 * @property {string|null} isEditingId
 * @property {string[]} expandedFolderIds
 * @property {boolean} isCreatingFolder
 */

let state = {
  links: [],
  settings: { ...DEFAULT_SETTINGS },
  searchHistory: [],
  currentFolderId: null,
  folderStack: [],
  isSelectionMode: false,
  selectedLinkIds: [],
  activeFolderId: null,
  editorTargetFolderId: null,
  isEditingId: null,
  expandedFolderIds: [],
  isCreatingFolder: false,
};

let isInitialized = false;
const listeners = new Set();

export const store = {
  /**
   * Initializes store state from storage sources asynchronously.
   */
  async init() {
    if (isInitialized) return state;
    state = await loadInitialState();
    isInitialized = true;
    return state;
  },

  /**
   * @returns {StoreState}
   */
  getState() {
    return state;
  },

  /**
   * Updates store state asynchronously and notifies listeners with previous and next states.
   * @param {Partial<StoreState>|((prevState: StoreState) => Partial<StoreState>)} update
   */
  async setState(update) {
    const prevState = state;
    const nextState = typeof update === "function" ? update(prevState) : update;
    state = { ...prevState, ...nextState };

    const savePromises = [];
    if ("links" in nextState)
      savePromises.push(saveToStorage("0fluff_links", state.links));
    if ("settings" in nextState)
      savePromises.push(saveToStorage("0fluff_settings", state.settings));
    if ("searchHistory" in nextState)
      savePromises.push(saveToStorage("0fluff_history", state.searchHistory));
    if ("expandedFolderIds" in nextState)
      savePromises.push(
        saveToStorage("0fluff_expanded_folders", state.expandedFolderIds),
      );

    await Promise.all(savePromises);

    listeners.forEach((listener) => listener(prevState, state));
  },

  /**
   * @param {(prevState: StoreState, currentState: StoreState) => void} listener
   * @returns {() => void} Unsubscribe callback
   */
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * @param {(prevState: StoreState, currentState: StoreState) => void} listener
   */
  unsubscribe(listener) {
    listeners.delete(listener);
  },
};
