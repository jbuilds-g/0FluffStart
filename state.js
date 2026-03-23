// state.js

// --- HELPER: Generate Unique IDs ---
// Crucial for drag and drop. We need to track exactly which item is moving.
function generateId() {
  return (
    "item_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
  );
}

// --- CORE STATE ---
let links = JSON.parse(localStorage.getItem("0fluff_links") || "[]");

// --- MIGRATION SCRIPT ---
// Upgrades old basic links into the new advanced format
let needsSave = false;
links = links.map((item) => {
  // If the item doesn't have an ID, it's from the old version of the app
  if (!item.id) {
    needsSave = true;
    return {
      id: generateId(),
      type: "link", // Explicitly label it as a link
      name: item.name,
      url: item.url,
    };
  }
  // If it already has an ID, it's a modern item (link or folder), leave it alone
  return item;
});

// If we upgraded any old links, save the new modern list back to storage
if (needsSave) {
  localStorage.setItem("0fluff_links", JSON.stringify(links));
}

// Helper to easily save links whenever we drag/drop or edit them
function saveLinksState() {
  localStorage.setItem("0fluff_links", JSON.stringify(links));
}

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

// NEW: Tracks if the user is currently viewing the inside of a folder
let activeFolderId = null;

const searchEngines = [
  { name: "Google", url: "https://www.google.com/search?q=", initial: "G" },
  { name: "DuckDuckGo", url: "https://duckduckgo.com/?q=", initial: "D" },
  { name: "Bing", url: "https://www.bing.com/search?q=", initial: "B" },
  { name: "Brave", url: "https://search.brave.com/search?q=", initial: "Br" },
];
