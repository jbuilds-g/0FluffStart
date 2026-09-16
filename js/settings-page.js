import "./main.js";
import { store } from "./store.js";
import { renderLinkManager } from "./links.js";
import { initSettingsPageSearch } from "./settings-search.js";

document.addEventListener("DOMContentLoaded", async () => {
  const pageStyles = document.querySelector('link[href^="css/settings-page.css"]');
  if (pageStyles) pageStyles.href = "css/settings-page.css?v=6";

  const controlStyles = document.createElement("link");
  controlStyles.rel = "stylesheet";
  controlStyles.href = "css/settings-controls.css?v=3";
  document.head.appendChild(controlStyles);

  document.documentElement.classList.add("settings-page");

  const isMobileDevice =
    navigator.userAgentData?.mobile === true ||
    /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  document.documentElement.classList.toggle("settings-mobile-context", isMobileDevice);
  document.documentElement.classList.toggle("settings-desktop-context", !isMobileDevice);

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
  scrollAnchor.innerHTML = '<span class="icon-mask icon-arrow-up" aria-hidden="true"></span>';
  document.body.appendChild(scrollAnchor);

  const scrollAnchorStyle = document.createElement("style");
  scrollAnchorStyle.textContent = `
    html.settings-page .settings-modal-scroll-anchor {
      position:fixed !important;
      right:24px !important;
      bottom:96px !important;
      z-index:100 !important;
      display:inline-flex !important;
      align-items:center !important;
      justify-content:center !important;
      width:40px !important;
      height:40px !important;
      min-width:40px !important;
      min-height:40px !important;
      padding:0 !important;
      cursor:pointer !important;
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
  window.addEventListener("scroll", updateSettingsScrollAnchor, { passive: true });
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
    setActiveSection(id && sections.some((section) => section.id === id) ? id : sections[0].id);
  };

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const id = link.getAttribute("href")?.slice(1);
      if (id) setActiveSection(id);
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveSection(visible.target.id);
    },
    { rootMargin: "-96px 0px -55% 0px", threshold: [0.05, 0.2, 0.5] },
  );
  sections.forEach((section) => observer.observe(section));

  const defaultMaterialPreview = "linear-gradient(135deg,#ff6b6b 0 25%,#ffd166 25% 50%,#06d6a0 50% 75%,#118ab2 75%)";

  const updateThemePreview = (settings = store.getState().settings || {}) => {
    const select = document.getElementById("themeSelect");
    const trigger = select?.querySelector(".select-trigger");
    const materialOption = select?.querySelector('.select-option[data-value="material-you"]');
    if (!select || !trigger || !materialOption) return;

    const palette = settings.materialYouPalette;
    const colors = palette
      ? [palette["--bg"], palette["--card"], palette["--card-hover"], palette["--accent"]].filter(Boolean)
      : [];
    const materialPreview = colors.length && settings.backgroundImage === "indexeddb"
      ? `linear-gradient(135deg, ${colors.join(", ")})`
      : defaultMaterialPreview;

    materialOption.style.setProperty("--theme-preview", materialPreview);

    const selectedValue = select.dataset.value || "dark";
    const selectedOption = select.querySelector(`.select-option[data-value="${CSS.escape(selectedValue)}"]`);
    const selectedPreview = selectedOption
      ? getComputedStyle(selectedOption).getPropertyValue("--theme-preview").trim()
      : "";

    if (selectedPreview) trigger.style.setProperty("--theme-preview", selectedPreview);
    else trigger.style.removeProperty("--theme-preview");
  };

  const themeSelect = document.getElementById("themeSelect");
  themeSelect?.addEventListener("change", () => updateThemePreview());

  const clockPicker = document.getElementById("clockStyleSelect");
  if (clockPicker) {
    clockPicker.classList.add("clock-style-picker");
    clockPicker.setAttribute("role", "radiogroup");
    clockPicker.setAttribute("aria-label", "Clock style");

    const dropdown = clockPicker.querySelector(".select-dropdown");
    dropdown?.classList.remove("hidden");

    const options = Array.from(clockPicker.querySelectorAll(".select-option"));

    options.forEach((option) => {
      const value = option.dataset.value || "default";
      const label = option.textContent.trim();
      const preview = document.createElement("span");
      preview.className = `clock clock-style-${value} settings-clock-preview`;
      preview.setAttribute("aria-hidden", "true");
      preview.textContent = "12:34";

      const labelEl = document.createElement("span");
      labelEl.className = "settings-clock-label";
      labelEl.textContent = label;
      option.replaceChildren(preview, labelEl);

      option.setAttribute("role", "radio");
      option.setAttribute("tabindex", "0");
      option.setAttribute("aria-label", label);
      option.addEventListener("click", () => {
        options.forEach((item) => item.setAttribute("aria-checked", item === option ? "true" : "false"));
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
        const next = event.key === "ArrowRight" ? Math.min(options.length - 1, index + 1) : Math.max(0, index - 1);
        options[next]?.focus();
        options[next]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      });
    });

    const syncClockSelection = () => {
      const value = clockPicker.dataset.value;
      options.forEach((option) => option.setAttribute("aria-checked", option.dataset.value === value ? "true" : "false"));
    };

    clockPicker.addEventListener("change", syncClockSelection);
    syncClockSelection();
  }

  await store.init();
  renderLinkManager();

  store.subscribe((prevState, currentState) => {
    if (prevState.settings !== currentState.settings) updateThemePreview(currentState.settings || {});
    if (prevState.links !== currentState.links ||
        prevState.isSelectionMode !== currentState.isSelectionMode ||
        prevState.selectedLinkIds !== currentState.selectedLinkIds ||
        prevState.activeFolderId !== currentState.activeFolderId ||
        prevState.expandedFolderIds !== currentState.expandedFolderIds) {
      renderLinkManager();
    }
  });

  updateThemePreview();
  window.setTimeout(updateThemePreview, 0);
  initSettingsPageSearch();

  const overlay = document.getElementById("bgOverlay");
  overlay?.classList.remove("bg-overlay-active");

  updateFromHash();
  window.addEventListener("hashchange", updateFromHash);
});
