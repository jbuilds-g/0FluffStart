/**
 * @file search.js
 * @description Centralized search query resolution and navigation router.
 */

import { store } from "./store.js";
import { sanitizeUrl } from "./utils.js";

const GENERIC_SEARCH_ICON = `<span class="inline-icon" data-icon="search"></span>`;

export const searchEngines = [
  {
    name: "Browser Default",
    url: "default",
    icon: `<span class="inline-icon icon-browser-globe" data-icon="browser-globe"></span>`,
  },
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

export function resolveSearchQueryAndEngine(inputValue) {
  let val = (inputValue || "").trim();
  if (!val) return { query: "", targetEngine: null };

  const state = store.getState();
  const available = getAvailableEngines();

  const customEngines = state.settings?.customEngines || [];
  const customTags = customEngines.map((c) => ({
    tag: c.tag || `?${c.name.charAt(0).toLowerCase()}`,
    name: c.name,
  }));

  const tagMap = [
    ...customTags,
    { tag: "?def", name: "Browser Default" },
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

  if (!targetEngine) {
    targetEngine =
      available.find((s) => s.name === state.settings?.searchEngine) ||
      available[0];
  }

  return { query: val, targetEngine };
}

export function executeSearch(query, targetEngine) {
  if (!query || !targetEngine) return;

  const state = store.getState();
  const history = state.searchHistory || [];
  if (state.settings?.historyEnabled !== false) {
    const updatedHistory = [
      query,
      ...history.filter((item) => item !== query),
    ].slice(0, 50);
    store.setState({ searchHistory: updatedHistory });
  }

  const isDirectUrl = query.includes(".") && !query.includes(" ");

  if (targetEngine.url === "default" && !isDirectUrl) {
    try {
      if (
        typeof chrome !== "undefined" &&
        chrome.search &&
        chrome.search.query
      ) {
        const targetDisposition = state.settings?.openInNewTab
          ? "NEW_TAB"
          : "CURRENT_TAB";
        chrome.search.query({ text: query, disposition: targetDisposition });
        return;
      }
    } catch (err) {
      // Fallback to Google if an error occurs
    }
  }

  const destinationUrl = isDirectUrl
    ? sanitizeUrl(query)
    : targetEngine.url === "default"
      ? `https://www.google.com/search?q=${encodeURIComponent(query)}`
      : `${targetEngine.url}${encodeURIComponent(query)}`;

  if (destinationUrl === "#") return;

  if (state.settings?.openInNewTab) {
    window.open(destinationUrl, "_blank", "noopener,noreferrer");
  } else {
    window.location.href = destinationUrl;
  }
}

export function handleSearch(e) {
  if (e.key === "Enter" || e.type === "click") {
    const rawVal = document.getElementById("searchInput")?.value.trim();
    const { query: val, targetEngine } = resolveSearchQueryAndEngine(rawVal);
    executeSearch(val, targetEngine);
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
    if (safeUrl !== "#") {
      const state = store.getState();
      if (state.settings?.openInNewTab) {
        window.open(safeUrl, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = safeUrl;
      }
    }
  } else {
    const { query: val, targetEngine } = resolveSearchQueryAndEngine(
      suggestion.name,
    );
    executeSearch(val, targetEngine);
  }
}
