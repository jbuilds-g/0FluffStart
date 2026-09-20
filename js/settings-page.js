import "./main.js";
import { store } from "./store.js";
import { renderLinkManager } from "./links.js";
import { initSettingsPageSearch } from "./settings-search.js";
import { searchEngines } from "./search.js";

document.addEventListener("DOMContentLoaded", async () => {
  const pageStyles = document.querySelector(
    'link[href^="css/settings-page.css"]',
  );
  if (pageStyles) pageStyles.href = "css/settings-page.css?v=11";

  const controlStyles = document.createElement("link");
  controlStyles.rel = "stylesheet";
  controlStyles.href = "css/settings-controls.css?v=9";
  document.head.appendChild(controlStyles);

  document.documentElement.classList.add("settings-page");

  const isMobileDevice =
    navigator.userAgentData?.mobile === true ||
    /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ) ||
    (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  document.documentElement.classList.toggle(
    "settings-mobile-context",
    isMobileDevice,
  );
  document.documentElement.classList.toggle(
    "settings-desktop-context",
    !isMobileDevice,
  );

  const footer = document.querySelector(".settings-page-footer");
  if (footer) {
    footer.innerHTML = `
      <div class="footer-row footer-row-primary">
        <span class="footer-brand">0FluffStart</span>
        <a href="https://github.com/jbuilds-g/0FluffStart" target="_blank" rel="noopener noreferrer" class="footer-version" title="View Source on GitHub" data-version>v6.4.0</a>
      </div>
      <div class="footer-row footer-row-secondary">
        <span class="footer-copy">© 2026 • <a href="https://github.com/jbuilds-g/0FluffStart/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">AGPL-3.0</a></span>
        <a href="https://jbuilds-g.github.io/0fluffstart-privacy-policy/" target="_blank" rel="noopener noreferrer" class="footer-link">Privacy Policy</a>
        <span class="footer-credit">Made with ♥️ • <a href="https://github.com/jbuilds-g" target="_blank" rel="noopener noreferrer">jbuilds-g</a></span>
      </div>
    `;
  }

  const scrollAnchor = document.createElement("button");
  scrollAnchor.type = "button";
  scrollAnchor.id = "settingsModalScrollAnchor";
  scrollAnchor.className = "settings-modal-scroll-anchor hidden";
  scrollAnchor.setAttribute("aria-label", "Return upward");
  scrollAnchor.innerHTML =
    '<span class="icon-mask icon-arrow-up" aria-hidden="true"></span>';
  document.body.appendChild(scrollAnchor);

  const scrollAnchorStyle = document.createElement("style");
  scrollAnchorStyle.textContent = `
    html.settings-page .settings-modal-scroll-anchor {
      position:fixed !important;
      right:24px !important;
      bottom:96px !important;
      z-index:90 !important;
      display:inline-flex !important;
      align-items:center !important;
      justify-content:center !important;
      width:40px !important;
      height:40px !important;
      min-width:40px !important;
      min-height:40px !important;
      padding:0 !important;
      cursor:none !important;
      opacity:1 !important;
      pointer-events:auto !important;
      visibility:visible !important;
    }
    html.settings-page .settings-modal-scroll-anchor.hidden {
      display:none !important;
    }
    @media (max-width:900px) {
      html.settings-page.settings-mobile-context .settings-modal-scroll-anchor {
        right:16px !important;
        bottom:calc(118px + env(safe-area-inset-bottom)) !important;
      }
    }
  `;
  document.head.appendChild(scrollAnchorStyle);

  const updateSettingsScrollAnchor = () => {
    scrollAnchor.classList.toggle("hidden", window.scrollY <= 360);
  };
  window.addEventListener("scroll", updateSettingsScrollAnchor, {
    passive: true,
  });
  scrollAnchor.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  updateSettingsScrollAnchor();

  const nav = document.querySelector(".settings-section-nav");
  const sections = Array.from(document.querySelectorAll(".settings-section"));
  if (!nav || !sections.length) return;

  const navLinks = Array.from(nav.querySelectorAll("a[href^='#']"));
  const setActiveSection = (id) => {
    navLinks.forEach((link) => {
      const active = link.getAttribute("href") === `#${id}`;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };

  const updateFromHash = () => {
    const id = window.location.hash.slice(1);
    setActiveSection(
      id && sections.some((section) => section.id === id) ? id : sections[0].id,
    );
  };

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const id = link.getAttribute("href")?.slice(1);
      if (id) setActiveSection(id);
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveSection(visible.target.id);
    },
    { rootMargin: "-96px 0px -55% 0px", threshold: [0.05, 0.2, 0.5] },
  );
  sections.forEach((section) => observer.observe(section));

  const engineSelectionList = document.getElementById("engineSelectionList");
  if (engineSelectionList) {
    let engineListScrollIntent = false;

    engineSelectionList.addEventListener("pointerdown", () => {
      engineListScrollIntent = true;
    });

    engineSelectionList.addEventListener("pointerleave", () => {
      engineListScrollIntent = false;
    });

    engineSelectionList.addEventListener("wheel", (event) => {
      if (
        engineListScrollIntent ||
        event.ctrlKey ||
        event.deltaY === 0
      ) {
        return;
      }

      const deltaMultiplier =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? window.innerHeight
            : 1;

      event.preventDefault();
      window.scrollBy({
        top: event.deltaY * deltaMultiplier,
        behavior: "auto",
      });
    }, { passive: false });
  }

  const defaultMaterialPreview =
    "linear-gradient(135deg,#ff6b6b 0 25%,#ffd166 25% 50%,#06d6a0 50% 75%,#118ab2 75%)";

  const syncScrollbarTheme = () => {
    const styles = getComputedStyle(document.body);
    const accent = styles.getPropertyValue("--accent").trim();
    const card = styles.getPropertyValue("--card").trim();
    if (!accent || !card) return;

    const root = document.documentElement;
    root.style.setProperty(
      "--settings-scrollbar-thumb",
      `color-mix(in srgb, ${accent} 58%, ${card})`,
    );
    root.style.setProperty(
      "--settings-scrollbar-thumb-hover",
      `color-mix(in srgb, ${accent} 78%, ${card})`,
    );
  };

  const scrollbarThemeObserver = new MutationObserver(() => {
    syncScrollbarTheme();
  });

  const updateThemePreview = (settings = store.getState().settings || {}) => {
    const select = document.getElementById("themeSelect");
    const materialOption = select?.querySelector(
      '.select-option[data-value="material-you"]',
    );
    if (!select || !materialOption) return;

    const palette = settings.materialYouPalette;
    const colors = palette
      ? [
          palette["--bg"],
          palette["--card"],
          palette["--card-hover"],
          palette["--accent"],
        ].filter(Boolean)
      : [];
    const materialPreview =
      colors.length && settings.backgroundImage === "indexeddb"
        ? `linear-gradient(135deg, ${colors.join(", ")})`
        : defaultMaterialPreview;

    materialOption.style.setProperty("--theme-preview", materialPreview);
    const materialPreviewEl = materialOption.querySelector(
      ".settings-theme-preview",
    );
    if (materialPreviewEl) materialPreviewEl.style.background = materialPreview;
  };

  scrollbarThemeObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ["class", "style"],
  });

  const themePreviewColors = {
    dark: ["#000000", "#141418", "#00aaff"],
    amoled: ["#000000", "#000000", "#ffffff"],
    light: ["#f2f2f7", "#ffffff", "#007aff"],
    "material-you": ["#ff6b6b", "#06d6a0", "#118ab2"],
    cyberpunk: ["#050505", "#121212", "#f0e600"],
    sunset: ["#2d1b2e", "#442646", "#ef476f"],
    forest: ["#1a2f1a", "#2d4c2d", "#c3e6c3"],
    paper: ["#f9f7f2", "#ffffff", "#222222"],
    luminous: ["#0f172a", "#1e293b", "#38bdf8"],
    nord: ["#2e3440", "#3b4252", "#88c0d0"],
    dracula: ["#282a36", "#44475a", "#bd93f9"],
    retro: ["#0d0202", "#1a0505", "#ffb000"],
    rose: ["#191724", "#1f1d2e", "#ebbcba"],
    "night-glow": ["#000000", "#0a0a0a", "#ffffff"],
    heatwave: ["#1f0a00", "#2d0f02", "#ff4500"],
    slate: ["#1a1a1a", "#252525", "#ffd700"],
    "toxic-tide": ["#041614", "#09201d", "#2fbfa2"],
    "evergreen-archive": ["#1a2416", "#253321", "#d9c588"],
  };

  const setupVisualPicker = (selectId, previewBuilder) => {
    const picker = document.getElementById(selectId);
    if (!picker) return;

    picker.classList.add("clock-style-picker");
    picker.setAttribute("role", "radiogroup");
    picker.setAttribute(
      "aria-label",
      picker.dataset.label || "Settings option",
    );
    picker
      .querySelector(".select-trigger")
      ?.setAttribute("aria-hidden", "true");

    const dropdown = picker.querySelector(".select-dropdown");
    dropdown?.classList.remove("hidden");

    const options = Array.from(picker.querySelectorAll(".select-option"));
    options.forEach((option) => {
      const label = option.textContent.trim();
      const preview = previewBuilder(option, label);
      const labelEl = document.createElement("span");
      labelEl.className = "settings-clock-label";
      labelEl.textContent = label;
      option.replaceChildren(preview, labelEl);
      option.setAttribute("role", "radio");
      option.setAttribute("tabindex", "0");
      option.setAttribute("aria-label", label);
      option.addEventListener("click", () => {
        options.forEach((item) =>
          item.setAttribute("aria-checked", item === option ? "true" : "false"),
        );
      });
      option.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          option.click();
          return;
        }
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const index = options.indexOf(option);
        const next =
          event.key === "ArrowRight"
            ? (index + 1) % options.length
            : (index - 1 + options.length) % options.length;
        options[next]?.focus();
        options[next]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      });
    });

    const syncSelection = () => {
      const value = picker.dataset.value;
      options.forEach((option) =>
        option.setAttribute(
          "aria-checked",
          option.dataset.value === value ? "true" : "false",
        ),
      );
    };
    picker.addEventListener("change", syncSelection);
    syncSelection();
  };

  const createThemePreview = (option) => {
    const value = option.dataset.value || "dark";
    const colors = themePreviewColors[value] || themePreviewColors.dark;
    const preview = document.createElement("span");
    preview.className = "settings-clock-preview settings-theme-preview";
    preview.setAttribute("aria-hidden", "true");
    preview.style.background = `linear-gradient(135deg, ${colors[0]} 0 42%, ${colors[1]} 42% 72%, ${colors[2]} 72% 100%)`;
    if (value === "material-you")
      preview.style.background = defaultMaterialPreview;
    return preview;
  };

  setupVisualPicker("themeSelect", createThemePreview);

  setupVisualPicker("searchBarLayoutSelect", (option) => {
    const preview = document.createElement("span");
    const layout = option.dataset.value || "unified";
    preview.className = `settings-clock-preview settings-searchbar-preview settings-searchbar-preview-${layout}`;
    preview.setAttribute("aria-hidden", "true");
    preview.innerHTML = `
      <span class="searchbar-mock-engine">G</span>
      <span class="searchbar-mock-input"></span>
      <span class="searchbar-mock-submit"><span class="icon-mask icon-search"></span></span>
    `;
    return preview;
  });

  const providerPicker = document.getElementById("suggestProviderSelect");
  if (providerPicker) {
    providerPicker.dataset.label = "Suggestion Provider";
  }

  setupVisualPicker("suggestProviderSelect", (option) => {
    const value = option.dataset.value;
    const name = value === "auto" ? "Browser Default" : value;
    const engine = searchEngines.find((item) => item.name === name);
    const preview = document.createElement("span");
    preview.className = "settings-clock-preview settings-provider-preview";
    preview.setAttribute("aria-hidden", "true");
    preview.innerHTML =
      engine?.icon || '<span class="icon-mask icon-search"></span>';
    return preview;
  });

  const themeSelect = document.getElementById("themeSelect");
  themeSelect?.addEventListener("change", () => updateThemePreview());

  const clockPicker = document.getElementById("clockStyleSelect");
  let clockPreviewOptions = [];

  const formatPreviewTime = (date, settings) => {
    const format = settings.clockFormat || "24h";
    const showSeconds = settings.showSeconds !== false;
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    let suffix = "";

    if (format === "12h") {
      suffix = hours >= 12 ? " PM" : " AM";
      hours = hours % 12 || 12;
    } else {
      hours = String(hours).padStart(2, "0");
    }

    return `${showSeconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`}${suffix}`;
  };

  const updateClockStylePreviews = (
    settings = store.getState().settings || {},
  ) => {
    if (!clockPreviewOptions.length) return;
    const time = formatPreviewTime(new Date(), settings);
    clockPreviewOptions.forEach(({ preview }) => {
      preview.textContent = time;
    });
  };

  if (clockPicker) {
    clockPicker.classList.add("clock-style-picker");
    clockPicker.setAttribute("role", "radiogroup");
    clockPicker.setAttribute("aria-label", "Clock style");

    const dropdown = clockPicker.querySelector(".select-dropdown");
    dropdown?.classList.remove("hidden");

    const options = Array.from(clockPicker.querySelectorAll(".select-option"));
    clockPreviewOptions = options.map((option) => {
      const value = option.dataset.value || "default";
      const label = option.textContent.trim();
      const preview = document.createElement("span");
      preview.className = `clock clock-style-${value} settings-clock-preview`;
      preview.setAttribute("aria-hidden", "true");

      const labelEl = document.createElement("span");
      labelEl.className = "settings-clock-label";
      labelEl.textContent = label;
      option.replaceChildren(preview, labelEl);

      option.setAttribute("role", "radio");
      option.setAttribute("tabindex", "0");
      option.setAttribute("aria-label", label);
      option.addEventListener("click", () => {
        options.forEach((item) =>
          item.setAttribute("aria-checked", item === option ? "true" : "false"),
        );
      });
      option.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          option.click();
          return;
        }
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const index = options.indexOf(option);
        const next =
          event.key === "ArrowRight"
            ? (index + 1) % options.length
            : (index - 1 + options.length) % options.length;
        options[next]?.focus();
        options[next]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      });

      return { preview };
    });

    const syncClockSelection = () => {
      const value = clockPicker.dataset.value;
      options.forEach((option) =>
        option.setAttribute(
          "aria-checked",
          option.dataset.value === value ? "true" : "false",
        ),
      );
    };

    clockPicker.addEventListener("change", syncClockSelection);
    syncClockSelection();
  }

  await store.init();
  renderLinkManager();

  store.subscribe((prevState, currentState) => {
    if (prevState.settings !== currentState.settings) {
      syncScrollbarTheme();
      updateThemePreview(currentState.settings || {});
      updateClockStylePreviews(currentState.settings || {});
    }
    if (
      prevState.links !== currentState.links ||
      prevState.isSelectionMode !== currentState.isSelectionMode ||
      prevState.selectedLinkIds !== currentState.selectedLinkIds ||
      prevState.activeFolderId !== currentState.activeFolderId ||
      prevState.expandedFolderIds !== currentState.expandedFolderIds
    ) {
      renderLinkManager();
    }
  });

  syncScrollbarTheme();
  updateThemePreview();
  updateClockStylePreviews();
  window.setTimeout(updateThemePreview, 0);
  window.setInterval(() => updateClockStylePreviews(), 1000);
  initSettingsPageSearch();

  const overlay = document.getElementById("bgOverlay");
  overlay?.classList.remove("bg-overlay-active");

  updateFromHash();
  window.addEventListener("hashchange", updateFromHash);
});
