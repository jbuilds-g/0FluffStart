(function () {
  const THEMES = [
    "dark",
    "amoled",
    "light",
    "material-you",
    "cyberpunk",
    "sunset",
    "forest",
    "paper",
    "luminous",
    "nord",
    "dracula",
    "retro",
    "rose",
    "night-glow",
    "heatwave",
    "slate",
    "toxic-tide",
    "evergreen-archive",
  ];

  const root = document.documentElement;
  root.classList.add("theme-pending");

  function readLocalTheme() {
    try {
      const raw = localStorage.getItem("0fluff_settings");
      const settings = raw ? JSON.parse(raw) : null;
      return THEMES.includes(settings?.theme) ? settings.theme : "dark";
    } catch (error) {
      return "dark";
    }
  }

  function getStoredTheme(result, fallbackTheme) {
    try {
      let settings = result?.["0fluff_settings"];
      if (typeof settings === "string") {
        settings = JSON.parse(settings);
      }
      return THEMES.includes(settings?.theme)
        ? settings.theme
        : fallbackTheme;
    } catch (error) {
      return fallbackTheme;
    }
  }

  function applyTheme(theme) {
    const apply = () => {
      if (!document.body) return;

      document.body.classList.remove(...THEMES);
      document.body.classList.add(theme);
      root.classList.remove("theme-pending");
    };

    if (document.body) {
      apply();
    } else {
      document.addEventListener("DOMContentLoaded", apply, { once: true });
    }
  }

  const fallbackTheme = readLocalTheme();
  const extensionStorage =
    typeof chrome !== "undefined" && chrome?.storage?.local;

  if (!extensionStorage) {
    applyTheme(fallbackTheme);
    return;
  }

  try {
    chrome.storage.local
      .get(["0fluff_settings"])
      .then((result) => applyTheme(getStoredTheme(result, fallbackTheme)))
      .catch(() => applyTheme(fallbackTheme));
  } catch (error) {
    applyTheme(fallbackTheme);
  }
})();
