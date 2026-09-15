import "./main.js";
import { store } from "./store.js";

document.addEventListener("DOMContentLoaded", () => {
  document.documentElement.classList.add("settings-page");

  document.getElementById("clockDisplay")?.remove();
  document.getElementById("greetingDisplay")?.remove();

  const footer = document.querySelector(".settings-page-footer");
  if (footer) {
    footer.innerHTML = `
      <div class="footer-row footer-row-primary">
        <span class="footer-brand">0FluffStart</span>
        <a href="https://github.com/jbuilds-g/0FluffStart" target="_blank" rel="noopener noreferrer" class="footer-version" title="View Source on GitHub" data-version>v6.4.0</a>
      </div>
      <div class="footer-row footer-row-secondary">
        <span class="footer-copy">
          © 2026 •
          <a href="https://github.com/jbuilds-g/0FluffStart/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">AGPL-3.0</a>
        </span>
        <a href="https://jbuilds-g.github.io/0fluffstart-privacy-policy/" target="_blank" rel="noopener noreferrer" class="footer-link">Privacy Policy</a>
        <span class="footer-credit">
          Made with ♥️ •
          <a href="https://github.com/jbuilds-g" target="_blank" rel="noopener noreferrer">jbuilds-g</a>
        </span>
      </div>
    `;
  }

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
    if (id && sections.some((section) => section.id === id)) {
      setActiveSection(id);
    } else {
      setActiveSection(sections[0].id);
    }
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

  const materialYouDefaultPreview =
    "linear-gradient(135deg, #ff6b6b 0 25%, #ffd166 25% 50%, #06d6a0 50% 75%, #118ab2 75%)";

  const updateThemePreview = (settings = store.getState().settings || {}) => {
    const option = document.querySelector(
      '#themeSelect .select-option[data-value="material-you"]',
    );
    if (!option) return;

    const palette = settings.materialYouPalette;
    const hasCustomBackground = settings.backgroundImage === "indexeddb";

    if (hasCustomBackground && palette) {
      const colors = [
        palette["--bg"],
        palette["--card"],
        palette["--card-hover"],
        palette["--accent"],
      ].filter(Boolean);
      option.style.setProperty(
        "--theme-preview",
        `linear-gradient(135deg, ${colors.join(", ")})`,
      );
    } else {
      option.style.setProperty("--theme-preview", materialYouDefaultPreview);
    }
  };

  const clockPicker = document.getElementById("clockStyleSelect");
  if (clockPicker) {
    clockPicker.classList.add("clock-style-picker");

    const options = Array.from(clockPicker.querySelectorAll(".select-option"));
    options.forEach((option) => {
      option.setAttribute("role", "radio");
      option.setAttribute("tabindex", "0");
      option.setAttribute(
        "aria-checked",
        option.classList.contains("selected") ? "true" : "false",
      );

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
        const currentIndex = options.indexOf(option);
        const nextIndex =
          event.key === "ArrowRight"
            ? Math.min(options.length - 1, currentIndex + 1)
            : Math.max(0, currentIndex - 1);
        options[nextIndex]?.focus();
        options[nextIndex]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      });
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

  store.subscribe((prevState, currentState) => {
    if (prevState.settings !== currentState.settings) {
      updateThemePreview(currentState.settings || {});
    }
  });

  updateThemePreview();
  window.setTimeout(updateThemePreview, 0);

  // Full Settings uses the same backdrop concept as the old modal, without
  // changing the stored background media or adding a second overlay system.
  const overlay = document.getElementById("bgOverlay");
  if (overlay) overlay.classList.add("bg-overlay-active");

  updateFromHash();
  window.addEventListener("hashchange", updateFromHash);
});
