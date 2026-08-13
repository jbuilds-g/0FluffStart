/**
 * @file suggestions.js
 * @description Search Auto-Suggestions & Search History Engine.
 * Handles search provider autocomplete, fallback execution, in-memory caching,
 * keyboard navigation, and local search history operations.
 */

/**
 * @typedef {Object} SuggestionItem
 * @property {string} name - Display phrase / query text.
 * @property {string} [url] - Target URL if item type is 'Link'.
 * @property {'Link' | 'History' | 'Search'} type - Origin type of the suggestion.
 */

/**
 * @typedef {Object} AppSettings
 * @property {boolean} [historyEnabled] - Whether local search history is enabled.
 * @property {boolean} [externalSuggest] - Whether external API suggestions are enabled.
 * @property {boolean} [cacheSuggestions] - Whether in-memory caching is enabled.
 * @property {string} [suggestProvider] - Selected provider mode ('auto' | 'DuckDuckGo' | 'Google' | 'Bing' | 'Brave').
 * @property {string} [searchEngine] - Active search engine name.
 * @property {string} [customProxyUrl] - Optional custom proxy endpoint URL.
 */

// --- CONSTANTS ---
const MIN_QUERY_LENGTH = 2;
const MAX_SUGGESTIONS_DISPLAY = 10;
const DEBOUNCE_DELAY_MS = 150;
const MAX_CACHE_SIZE = 100;
const MAX_HISTORY_ITEMS = 20;
const DEFAULT_PROVIDER = "DuckDuckGo";
const ALL_PROVIDERS = Object.freeze(["DuckDuckGo", "Google", "Bing", "Brave"]);

const DEFAULT_WORKER_PROXY_URL =
  "https://0fluffstart-suggest-proxy.jbuilds.workers.dev";

/**
 * Service encapsulating autocomplete logic, API provider fallback execution, and LRU suggestion caching.
 */
export class SuggestionService {
  /**
   * @param {AppSettings} [settings={}] - Initial application settings.
   * @param {string} [defaultWorkerProxyUrl=DEFAULT_WORKER_PROXY_URL] - Fallback Cloudflare Worker proxy URL.
   */
  constructor(settings = {}, defaultWorkerProxyUrl = DEFAULT_WORKER_PROXY_URL) {
    /** @type {AppSettings} */
    this.settings = settings;
    /** @type {string} */
    this.defaultWorkerProxyUrl = defaultWorkerProxyUrl;
    /** @type {Map<string, string[]>} */
    this.suggestionCache = new Map();
    /** @type {ReturnType<typeof setTimeout> | null} */
    this.debounceTimer = null;
    /** @type {AbortController | null} */
    this.activeFetchController = null;
    /** @type {string} */
    this.originalSearchText = "";
  }

  /**
   * Clears the internal in-memory suggestion cache.
   */
  clearSuggestionCache() {
    this.suggestionCache.clear();
  }

  /**
   * Stores suggestion results in the in-memory cache with LRU eviction.
   * @param {string} key - Cache key formatted as `provider:normalizedQuery`.
   * @param {string[]} results - Array of suggestion phrases.
   * @param {AppSettings} [settings=this.settings] - Application settings object.
   */
  setCachedSuggestions(key, results, settings = this.settings) {
    if (
      settings?.cacheSuggestions !== false &&
      Array.isArray(results) &&
      results.length > 0
    ) {
      if (this.suggestionCache.size >= MAX_CACHE_SIZE) {
        const firstKey = this.suggestionCache.keys().next().value;
        if (firstKey) this.suggestionCache.delete(firstKey);
      }
      this.suggestionCache.set(key, results);
    }
  }

  /**
   * Validates whether a response text is valid JSON.
   * @param {string} text - Raw fetch response text.
   * @returns {boolean} True if response appears to be valid JSON.
   */
  isValidJsonResponse(text) {
    if (!text) return false;
    const trimmed = text.trim().toLowerCase();
    return !(
      trimmed.startsWith("<") ||
      trimmed.includes("<html") ||
      trimmed.includes("<!doctype")
    );
  }

  /**
   * Constructs the target suggest API URL for a given provider and query.
   * @param {string} engineName - Search engine provider name.
   * @param {string} query - Unencoded search query.
   * @returns {string} Target API URL.
   */
  getEngineSuggestUrl(engineName, query) {
    const encoded = encodeURIComponent(query);
    switch (engineName) {
      case "Google":
        return `https://www.google.com/complete/search?client=chrome&q=${encoded}`;
      case "Bing":
        return `https://api.bing.com/osjson.aspx?query=${encoded}`;
      case "Brave":
        return `https://search.brave.com/api/suggest?q=${encoded}`;
      case "DuckDuckGo":
      default:
        return `https://ac.duckduckgo.com/ac/?q=${encoded}&type=json`;
    }
  }

  /**
   * Normalizes and parses raw API responses across search engines into string arrays.
   * @param {any} data - Raw parsed JSON object or envelope.
   * @returns {string[]} Array of suggestion phrase strings.
   */
  parseEngineSuggestions(data) {
    if (!data) return [];
    if (data.contents) {
      try {
        data =
          typeof data.contents === "string"
            ? JSON.parse(data.contents)
            : data.contents;
      } catch {
        return [];
      }
    }
    if (!Array.isArray(data)) return [];
    if (Array.isArray(data[1])) {
      return data[1]
        .map((s) =>
          typeof s === "string" ? s : s?.q || s?.name || s?.phrase || "",
        )
        .filter(Boolean);
    }
    return data
      .map((item) =>
        typeof item === "string" ? item : item?.phrase || item?.q || "",
      )
      .filter(Boolean);
  }

  /**
   * Generates sequential provider execution queue based on settings.
   * @param {AppSettings} [settings=this.settings] - Application settings object.
   * @returns {string[]} Ordered array of provider names.
   */
  getProviderQueue(settings = this.settings) {
    const providerMode = settings?.suggestProvider || "auto";
    if (providerMode !== "auto") {
      return [providerMode];
    }
    const activeEngine = settings?.searchEngine || DEFAULT_PROVIDER;
    const primary = ALL_PROVIDERS.includes(activeEngine)
      ? activeEngine
      : DEFAULT_PROVIDER;
    return [primary, ...ALL_PROVIDERS.filter((p) => p !== primary)];
  }

  /**
   * Fetches external search suggestions across available proxy and provider fallbacks.
   * Fixes query casing mismatches by passing normalized query to cache keys and API calls.
   * @param {string} query - Search input text.
   * @param {AppSettings} [settings=this.settings] - Application settings.
   * @returns {Promise<string[]>} Resolves to array of suggestion phrases.
   */
  async fetchExternalSuggestions(query, settings = this.settings) {
    const normalizedQuery = query.toLowerCase().trim();
    if (!normalizedQuery) return [];

    const queue = this.getProviderQueue(settings);

    if (settings?.cacheSuggestions !== false) {
      for (const provider of queue) {
        const cacheKey = `${provider}:${normalizedQuery}`;
        if (this.suggestionCache.has(cacheKey)) {
          console.log(`[Suggestions] Resolved from local cache (${cacheKey})`);
          return this.suggestionCache.get(cacheKey) || [];
        }
      }
    }

    if (this.activeFetchController) {
      this.activeFetchController.abort();
    }
    this.activeFetchController = new AbortController();
    const signal = this.activeFetchController.signal;

    const cacheBuster = `&_cb=${Date.now()}`;

    for (const provider of queue) {
      const targetUrl =
        this.getEngineSuggestUrl(provider, normalizedQuery) + cacheBuster;
      const cacheKey = `${provider}:${normalizedQuery}`;

      // STRATEGY 0: Custom User Proxy
      if (settings?.customProxyUrl) {
        try {
          const isWorker = settings.customProxyUrl.includes("workers.dev");
          const proxyUrl = isWorker
            ? `${settings.customProxyUrl.split("?")[0]}?engine=${encodeURIComponent(provider.toLowerCase())}&q=${encodeURIComponent(normalizedQuery)}`
            : settings.customProxyUrl.endsWith("=") ||
                settings.customProxyUrl.endsWith("?")
              ? `${settings.customProxyUrl}${encodeURIComponent(targetUrl)}`
              : `${settings.customProxyUrl}?url=${encodeURIComponent(targetUrl)}`;

          const res = await fetch(proxyUrl, { signal });
          if (res.ok) {
            const text = await res.text();
            if (this.isValidJsonResponse(text)) {
              const data = JSON.parse(text);
              const suggestions = this.parseEngineSuggestions(data);
              if (suggestions.length > 0) {
                console.log(
                  `[Suggestions] Successfully fetched via Worker Proxy (${provider}):`,
                  suggestions,
                );
                this.setCachedSuggestions(cacheKey, suggestions, settings);
                return suggestions;
              }
            }
          } else {
            console.warn(
              `[Suggestions] Custom proxy status ${res.status} for ${provider}`,
            );
          }
        } catch (e) {
          if (/** @type {Error} */ (e).name === "AbortError") return [];
          console.error(`[Suggestions] Custom proxy error for ${provider}:`, e);
        }
        continue;
      }

      // STRATEGY 1: Cloudflare Edge Worker Proxy (Default)
      try {
        const baseWorkerUrl = this.defaultWorkerProxyUrl;
        const proxyUrl = `${baseWorkerUrl.split("?")[0]}?engine=${encodeURIComponent(provider.toLowerCase())}&q=${encodeURIComponent(normalizedQuery)}`;
        const res = await fetch(proxyUrl, { signal });
        if (res.ok) {
          const text = await res.text();
          if (this.isValidJsonResponse(text)) {
            const data = JSON.parse(text);
            const suggestions = this.parseEngineSuggestions(data);
            if (suggestions.length > 0) {
              console.log(
                `[Suggestions] Resolved via Worker Proxy (${provider}):`,
                suggestions,
              );
              this.setCachedSuggestions(cacheKey, suggestions, settings);
              return suggestions;
            }
          }
        } else if (res.status === 429) {
          console.warn(
            `[Suggestions] Worker proxy rate limited (429) for ${provider}. Falling back to AllOrigins...`,
          );
        } else {
          console.warn(
            `[Suggestions] Worker proxy returned HTTP ${res.status} for ${provider}`,
          );
        }
      } catch (e) {
        if (/** @type {Error} */ (e).name === "AbortError") return [];
        console.warn(
          `[Suggestions] Worker proxy fetch failed for ${provider}:`,
          e,
        );
      }

      // STRATEGY 2: AllOrigins Raw (Fallback Proxy)
      try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
        const res = await fetch(proxyUrl, { signal });
        if (res.ok) {
          const text = await res.text();
          if (this.isValidJsonResponse(text)) {
            const data = JSON.parse(text);
            const suggestions = this.parseEngineSuggestions(data);
            if (suggestions.length > 0) {
              console.log(
                `[Suggestions] Resolved via AllOrigins Raw (${provider})`,
              );
              this.setCachedSuggestions(cacheKey, suggestions, settings);
              return suggestions;
            }
          }
        } else {
          console.warn(
            `[Suggestions] AllOrigins returned HTTP ${res.status} for ${provider}`,
          );
        }
      } catch (e) {
        if (/** @type {Error} */ (e).name === "AbortError") return [];
        console.warn(
          `[Suggestions] AllOrigins proxy fetch failed for ${provider}:`,
          e,
        );
      }
    }

    return [];
  }
}

// Default singleton instance for fallback export
const defaultSuggestionService = new SuggestionService();

/**
 * Clears the in-memory suggestion cache.
 */
export function clearSuggestionCache() {
  defaultSuggestionService.clearSuggestionCache();
}

/**
 * Stores suggestion results in the in-memory cache with LRU eviction.
 * @param {string} key - Cache key formatted as `provider:query`.
 * @param {string[]} results - Array of suggestion phrases.
 * @param {AppSettings} settings - Application settings object.
 */
/**
 * Standalone wrapper for fetching external search suggestions using default SuggestionService instance.
 * @param {string} query - Search input text.
 * @param {AppSettings} [settings={}] - Application settings.
 * @returns {Promise<string[]>} Resolves to array of suggestion phrases.
 */
export async function fetchExternalSuggestions(query, settings = {}) {
  return defaultSuggestionService.fetchExternalSuggestions(query, settings);
}

/**
 * Handles user typing in search input, rendering local and external suggestions.
 * @param {Event} [e] - Input event.
 * @param {Object} deps - Injected dependencies.
 * @param {Array<{name: string, url: string}>} [deps.links=[]] - Dashboard quick links.
 * @param {AppSettings} [deps.settings={}] - Application settings.
 * @param {string[]} [deps.searchHistory=[]] - User search history.
 * @param {HTMLInputElement} deps.inputEl - Search input element.
 * @param {HTMLElement} deps.containerEl - Suggestions dropdown container element.
 * @param {Function} [deps.selectSuggestionFn] - Callback when a suggestion is selected.
 */
export function handleSuggestions(e, deps) {
  const {
    suggestionService = defaultSuggestionService,
    links = [],
    settings = {},
    searchHistory = [],
    inputEl,
    containerEl,
    selectSuggestionFn,
  } = deps || {};

  if (!inputEl || !containerEl) return;

  const inputVal = inputEl.value;
  const normalizedInput = inputVal.toLowerCase().trim();

  if (e && e.type === "input") {
    suggestionService.originalSearchText = inputVal;
  }

  if (suggestionService.debounceTimer) {
    clearTimeout(suggestionService.debounceTimer);
  }

  if (normalizedInput.length < MIN_QUERY_LENGTH) {
    containerEl.innerHTML = "";
    containerEl.classList.add("hidden");
    return;
  }

  // 1. Local Matches (Instant)
  /** @type {SuggestionItem[]} */
  let localSuggestions = [];

  if (settings.historyEnabled !== false) {
    const linkMatches = links
      .filter((l) => l.name.toLowerCase().includes(normalizedInput))
      .map((l) => ({
        name: l.name,
        url: l.url,
        type: /** @type {const} */ ("Link"),
      }));

    const historyMatches = searchHistory
      .filter((h) => h.toLowerCase().includes(normalizedInput))
      .map((h) => ({
        name: h,
        type: /** @type {const} */ ("History"),
      }));

    localSuggestions = [...linkMatches, ...historyMatches];
  }

  // Render Local Matches immediately
  renderSuggestions(localSuggestions, containerEl, selectSuggestionFn);

  // 2. External Matches (Debounced)
  if (settings.externalSuggest) {
    suggestionService.debounceTimer = setTimeout(() => {
      suggestionService
        .fetchExternalSuggestions(normalizedInput, settings)
        .then((external) => {
          const uniqueExternal = external
            .map((name) => ({
              name,
              type: /** @type {const} */ ("Search"),
            }))
            .filter(
              (ext) =>
                !localSuggestions.some(
                  (s) => s.name.toLowerCase() === ext.name.toLowerCase(),
                ),
            );

          const finalSuggestions = [...localSuggestions, ...uniqueExternal];
          renderSuggestions(finalSuggestions, containerEl, selectSuggestionFn);
        });
    }, DEBOUNCE_DELAY_MS);
  }
}

/**
 * Renders the suggestion list items into the UI container.
 * @param {SuggestionItem[]} suggestions - List of suggestion items to render.
 * @param {HTMLElement} container - Container element.
 * @param {Function} [selectSuggestionFn] - Callback function when item clicked.
 */
export function renderSuggestions(suggestions, container, selectSuggestionFn) {
  if (!container) return;
  container.innerHTML = "";

  if (suggestions.length === 0) {
    container.classList.add("hidden");
    return;
  }

  suggestions.slice(0, MAX_SUGGESTIONS_DISPLAY).forEach((s, index) => {
    const item = document.createElement("div");
    item.className = "suggestion-item";
    item.setAttribute("data-index", String(index));
    item.dataset.name = s.name;
    item.dataset.url = s.url || "";
    item.dataset.type = s.type;

    item.addEventListener("click", () => {
      if (typeof selectSuggestionFn === "function") {
        selectSuggestionFn({ name: s.name, url: s.url || "", type: s.type });
      }
    });

    item.addEventListener("mouseenter", () => {
      const currentlyActive = container.querySelector(
        ".suggestion-item.active",
      );
      if (currentlyActive) currentlyActive.classList.remove("active");
      item.classList.add("active");
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

/**
 * Handles keyboard events (Arrow up/down, Enter, Escape, Tab) for suggestion navigation.
 * @param {KeyboardEvent} e - Keyboard event.
 * @param {HTMLInputElement} inputEl - Search input element.
 * @param {HTMLElement} containerEl - Suggestions dropdown container element.
 * @param {Function} [selectSuggestionFn] - Selection callback.
 */
export function handleSuggestionKeyDown(
  e,
  inputEl,
  containerEl,
  selectSuggestionFn,
  deps,
) {
  if (!containerEl || containerEl.classList.contains("hidden")) return;

  const items = Array.from(containerEl.querySelectorAll(".suggestion-item"));
  if (items.length === 0) return;

  const activeItem = containerEl.querySelector(".suggestion-item.active");
  let currentIndex = activeItem
    ? parseInt(activeItem.getAttribute("data-index") || "-1", 10)
    : -1;

  const suggestionService = deps?.suggestionService || defaultSuggestionService;

  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();

    if (activeItem) activeItem.classList.remove("active");

    if (e.key === "ArrowDown") {
      currentIndex = (currentIndex + 1) % items.length;
    } else {
      currentIndex = (currentIndex - 1 + items.length) % items.length;
    }

    const nextActive = items[currentIndex];
    nextActive.classList.add("active");
    nextActive.scrollIntoView({ behavior: "smooth", block: "nearest" });
    if (inputEl) inputEl.value = nextActive.dataset.name || "";
  } else if ((e.key === "ArrowRight" || e.key === "Tab") && activeItem) {
    if (inputEl && inputEl.selectionStart === inputEl.value.length) {
      e.preventDefault();
      inputEl.value = activeItem.dataset.name || "";
    }
  } else if (e.key === "Enter") {
    if (activeItem) {
      e.preventDefault();
      if (typeof selectSuggestionFn === "function") {
        selectSuggestionFn({
          name: activeItem.dataset.name || "",
          url: activeItem.dataset.url || "",
          type: /** @type {SuggestionItem['type']} */ (
            activeItem.dataset.type || "Search"
          ),
        });
      }
    }
  } else if (e.key === "Escape") {
    e.preventDefault();
    if (inputEl) inputEl.value = suggestionService.originalSearchText;
    if (activeItem) activeItem.classList.remove("active");
    containerEl.classList.add("hidden");
  }
}

/**
 * Logs a query into search history with case-insensitive duplicate prevention.
 * @param {string} query - Query string to log.
 * @param {Object} store - Centralized application store instance.
 */
export function logSearch(query, store) {
  if (!store || typeof store.getState !== "function") return;

  const state = store.getState();
  const currentHistory = state.searchHistory || [];
  const currentSettings = state.settings || {};
  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();

  if (
    currentSettings.historyEnabled !== false &&
    normalizedQuery &&
    !currentHistory.some((h) => h.toLowerCase() === normalizedQuery)
  ) {
    const updatedHistory = [normalizedQuery, ...currentHistory].slice(
      0,
      MAX_HISTORY_ITEMS,
    );
    store.setState({ searchHistory: updatedHistory });
  }
}

/**
 * Prompts user confirmation and clears local search history.
 * @param {Object} deps - Injected dependencies.
 * @param {Object} deps.store - Application state store.
 * @param {Function} [deps.customConfirmFn] - Custom dialog confirmation function.
 * @param {Function} [deps.showToastFn] - Toast notification function.
 * @param {HTMLInputElement} [deps.inputEl] - Optional search input element to restore focus.
 */
export async function clearHistory(deps) {
  const { store, customConfirmFn, showToastFn, inputEl } = deps || {};

  const confirmed =
    typeof customConfirmFn === "function"
      ? await customConfirmFn(
          "Are you sure you want to clear your local search history?",
          "Clear Search History?",
        )
      : true;

  if (confirmed && store) {
    store.setState({ searchHistory: [] });
    if (inputEl) inputEl.focus();
    if (typeof showToastFn === "function") {
      showToastFn("Search history cleared", "info");
    }
  }
}
