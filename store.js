/* store.js - Centralized State & Event Subscriptions */

(function (global) {
  let state = {
    links: JSON.parse(localStorage.getItem("0fluff_links") || "[]"),
    settings: JSON.parse(
      localStorage.getItem("0fluff_settings") ||
        JSON.stringify({
          theme: "dark",
          clockFormat: "24h",
          clockStyle: "default",
          searchEngine: "Google",
          userName: "User",
          customProxyUrl: "",
          forceTranslucency: false,
        }),
    ),
    searchHistory: JSON.parse(localStorage.getItem("0fluff_history") || "[]"),
    isEditMode: false,
    isEditingId: null,
    activeFolderId: null,
    currentFolderId: null,
  };

  const listeners = new Set();

  const saveToStorage = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Failed persisting ${key} to localStorage:`, e);
    }
  };

  const store = {
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

  global.store = store;
})(window);
