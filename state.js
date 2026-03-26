/* state.js - Core Data & Persistence Management */

// --- CORE STATE ---
let links = JSON.parse(localStorage.getItem("0fluff_links") || "[]");

// --- MIGRATION SCRIPT ---
// Upgrades legacy links into the modern ID-based format
let needsSave = false;
links = links.map((item) => {
  if (!item.id) {
    needsSave = true;
    return {
      id: generateId(),
      type: "link",
      name: item.name,
      url: item.url,
      parentId: null, // Ensure new links have a parentId for the move-out logic
    };
  }
  return item;
});

if (needsSave) {
  localStorage.setItem("0fluff_links", JSON.stringify(links));
}

// Helper to persist the current state of links to local storage
function saveLinksState() {
  localStorage.setItem("0fluff_links", JSON.stringify(links));
}

// --- SETTINGS & HISTORY ---
let settings = JSON.parse(
  localStorage.getItem("0fluff_settings") ||
    JSON.stringify({
      theme: "dark",
      clockFormat: "24h",
      clockStyle: "default",
      searchEngine: "Google",
      userName: "User",
    }),
);

let searchHistory = JSON.parse(localStorage.getItem("0fluff_history") || "[]");

// --- UI STATE ---
let isEditMode = false;
let isEditingId = null;
let activeFolderId = null; // Tracks the current folder view depth

// --- SEARCH ENGINE CONFIGURATION ---
const searchEngines = [
  { name: "Google", url: "https://www.google.com/search?q=", initial: "G" },
  { name: "DuckDuckGo", url: "https://duckduckgo.com/?q=", initial: "D" },
  { name: "Bing", url: "https://www.bing.com/search?q=", initial: "B" },
  { name: "Brave", url: "https://search.brave.com/search?q=", initial: "Br" },
];
