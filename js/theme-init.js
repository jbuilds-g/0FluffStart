(function () {
  const themes = [
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

  try {
    const settings = JSON.parse(localStorage.getItem("0fluff_settings") || "{}");
    const savedTheme = themes.includes(settings.theme) ? settings.theme : "dark";

    document.body.classList.remove(...themes);
    document.body.classList.add(savedTheme);
  } catch (error) {
    document.body.classList.remove(...themes);
    document.body.classList.add("dark");
  }
})();
