// state.js

let links = JSON.parse(localStorage.getItem('0fluff_links') || '[]');

let settings = JSON.parse(localStorage.getItem('0fluff_settings') || JSON.stringify({
    theme: "dark",
    clockFormat: "24h",
    clockStyle: "default",
    searchEngine: "Google",
    userName: "User"
}));

let searchHistory = JSON.parse(localStorage.getItem('0fluff_history') || '[]');

let isEditMode = false;
let isEditingId = null;

const searchEngines = [
    { name: 'Google', url: 'https://www.google.com/search?q=', initial: 'G' },
    { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=', initial: 'D' },
    { name: 'Bing', url: 'https://www.bing.com/search?q=', initial: 'B' },
    { name: 'Brave', url: 'https://search.brave.com/search?q=', initial: 'Br' }
];
