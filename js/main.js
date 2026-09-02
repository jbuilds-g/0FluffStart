import { store, DEFAULT_LINKS } from "./store.js";
import { debounce, sanitizeUrl } from "./utils.js";
import { backupData, restoreData, clearBgFromDB } from "./storage.js";
import {
  handleSuggestions,
  handleSuggestionKeyDown,
  clearHistory,
} from "./suggestions.js";
import { APP_VERSION } from "./version.js";
import {
  loadSettings,
  autoSaveSettings,
  toggleSettings,
  closeModal,
  renderEngineDropdown,
  toggleEngineDropdown,
  updateClock,
  customConfirm,
  showToast,
  handleImageUpload,
  clearBackground,
  updateBackgroundMedia,
  initCustomSelects,
  renderEngineSelectionList,
} from "./ui.js";
import { handleSearch, selectSuggestion } from "./search.js";
import {
  renderLinks,
  renderLinkManager,
  openEditor,
  cancelEdit,
  saveLink,
  editLink,
  deleteLink,
  toggleSelection,
  navigateToFolder,
  addFolder,
} from "./links.js";
import { CustomCursorEngine } from "./cursor.js";

document.addEventListener("DOMContentLoaded", async () => {
  const storedVersion = localStorage.getItem("0fluff_app_version");

  if (storedVersion && storedVersion !== APP_VERSION) {
    showToast(`Updated to v${APP_VERSION}`, "success", 4000);
  }

  if (storedVersion !== APP_VERSION) {
    localStorage.setItem("0fluff_app_version", APP_VERSION);
    if ("caches" in window) {
      caches.keys().then((names) => {
        for (let name of names) caches.delete(name);
      });
    }
  }

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker
      .register("./sw.js", { updateViaCache: "none" })
      .then((reg) => {
        const lastCheck = sessionStorage.getItem("sw_last_check");
        const now = Date.now();
        if (!lastCheck || now - parseInt(lastCheck, 10) > 3600000) {
          reg.update();
          sessionStorage.setItem("sw_last_check", now.toString());
        }

        if (reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                newWorker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          }
        });
      })
      .catch((err) => console.warn("SW Registration:", err));

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }

  await store.init();
  initCustomSelects();
  bindStaticEvents();
  await loadSettings();

  if (!localStorage.getItem("0fluff_has_opened_engine_dropdown")) {
    showToast("Welcome to 0FluffStart! Click ⚙️ to customize.", "info", 5000);
  }

  renderLinks();
  renderEngineDropdown();

  if (!localStorage.getItem("0fluff_has_opened_engine_dropdown")) {
    toggleEngineDropdown();
    localStorage.setItem("0fluff_has_opened_engine_dropdown", "true");
  }

  updateClock();
  setInterval(updateClock, 1000);
  new CustomCursorEngine();

  store.subscribe((prevState, currentState) => {
    const linksChanged = prevState.links !== currentState.links;
    const folderChanged =
      prevState.currentFolderId !== currentState.currentFolderId;
    const stackChanged = prevState.folderStack !== currentState.folderStack;
    const titlesChanged =
      prevState.settings?.showTitles !== currentState.settings?.showTitles;

    if (linksChanged || folderChanged || stackChanged || titlesChanged) {
      renderLinks();
    }

    const folderExitBtn = document.getElementById("folderExitBtn");
    if (folderExitBtn) {
      const hasStack = (currentState.folderStack || []).length > 0;
      folderExitBtn.classList.toggle("hidden", !hasStack);
    }
  });

  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.focus();

  // --- DEEP LINKING ROUTER ---
  const urlParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash;
  let hasDeepLinkAction = false;

  const targetFolderQuery = urlParams.get("folder");
  if (targetFolderQuery) {
    const links = store.getState().links || [];
    const matchedFolder = links.find(
      (l) =>
        l.isFolder &&
        (l.id === targetFolderQuery ||
          l.name.toLowerCase() === targetFolderQuery.toLowerCase()),
    );
    if (matchedFolder) {
      navigateToFolder(matchedFolder.id);
      hasDeepLinkAction = true;
    }
  }

  if (hash === "#settings") {
    toggleSettings();
    hasDeepLinkAction = true;
  }

  const queryParam = urlParams.get("q");
  if (queryParam) {
    const engineParam = urlParams.get("engine");
    let queryPrefix = "";

    if (engineParam) {
      const tag = engineParam.trim();
      queryPrefix = (tag.startsWith("?") ? tag : `?${tag}`) + " ";
    }

    if (searchInput) {
      searchInput.value = `${queryPrefix}${queryParam}`;
      handleSearch({ key: "Enter", type: "keydown", preventDefault: () => {} });
      hasDeepLinkAction = true;
    }
  }

  if (hasDeepLinkAction) {
    history.replaceState({}, document.title, window.location.pathname);
  }

  // --- GITHUB PAGES MIGRATION BANNER & FIXED UTC TIMER ---
  if (window.location.hostname.includes("github.io")) {
    // Hardcoded absolute target timestamp set to 20 hours from deploy (September 1, 2026 15:38:22 UTC)
    const TARGET_UTC_MS =
      Date.UTC(2026, 7, 31, 23, 38, 22) + 20 * 60 * 60 * 1000;

    const banner = document.createElement("div");
    banner.className = "migration-banner";
    banner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      background: #111827;
      color: #f9fafb;
      padding: 10px 16px;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-size: 0.875rem;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      box-sizing: border-box;
    `;

    banner.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
        <span>⚠️ GitHub Pages closing in <strong id="migrationTimer" style="color:#f59e0b;">00h 00m 00s</strong>. Move to Cloudflare Pages!</span>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <button id="exportMigrationBtn" style="background:#374151; color:#fff; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:0.8rem;">Export Data</button>
        <a href="https://0fluffstart.pages.dev" target="_blank" rel="noopener noreferrer" style="background:#2563eb; color:#fff; text-decoration:none; padding:6px 12px; border-radius:4px; font-weight:bold; font-size:0.8rem;">Go to New Site</a>
        <button id="dismissMigrationBtn" style="background:transparent; color:#9ca3af; border:none; font-size:1.1rem; cursor:pointer; padding:0 4px;">✕</button>
      </div>
    `;

    document.body.prepend(banner);

    const timerEl = document.getElementById("migrationTimer");
    const updateCountdown = () => {
      const remaining = Math.max(0, TARGET_UTC_MS - Date.now());

      const hrs = Math.floor(remaining / (1000 * 60 * 60));
      const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((remaining % (1000 * 60)) / 1000);

      if (timerEl) {
        timerEl.textContent = `${hrs}h ${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
      }

      if (remaining <= 0) {
        clearInterval(intervalId);
      }
    };

    updateCountdown();
    const intervalId = setInterval(updateCountdown, 1000);

    document
      .getElementById("exportMigrationBtn")
      ?.addEventListener("click", backupData);
    document
      .getElementById("dismissMigrationBtn")
      ?.addEventListener("click", () => {
        clearInterval(intervalId);
        banner.remove();
      });
  }

  document.addEventListener("click", (e) => {
    if (
      !e.target.closest(".unified-nav-pill") &&
      !e.target.closest(".nav-pill-dropdown")
    ) {
      document.querySelector(".nav-pill-dropdown")?.classList.add("hidden");
    }
    if (!e.target.closest(".engine-switcher")) {
      document.getElementById("engineDropdown")?.classList.add("hidden");
    }
    if (
      !e.target.closest("#searchInput") &&
      !e.target.closest("#suggestionsContainer")
    ) {
      document.getElementById("suggestionsContainer")?.classList.add("hidden");
    }

    const searchBarContainer = document.querySelector(".search-bar");
    const searchBackdrop = document.querySelector(".search-backdrop");
    const targetInput = document.getElementById("searchInput");

    if (
      searchBarContainer?.classList.contains("mobile-expanded") &&
      !e.target.closest(".search-bar") &&
      !e.target.closest("#mobileDock")
    ) {
      searchBarContainer.classList.remove("mobile-expanded");
      if (searchBackdrop) searchBackdrop.classList.remove("active");
      if (targetInput) targetInput.blur();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal("settingsModal");
      document.getElementById("engineDropdown")?.classList.add("hidden");
      document.getElementById("suggestionsContainer")?.classList.add("hidden");
      document
        .querySelector(".search-bar")
        ?.classList.remove("mobile-expanded");
      document.querySelector(".search-backdrop")?.classList.remove("active");
      if (
        !document
          .getElementById("linkEditorContainer")
          ?.classList.contains("hidden")
      ) {
        cancelEdit();
      }
    }
  });
});

function bindStaticEvents() {
  document
    .getElementById("settingsToggleBtn")
    ?.addEventListener("click", toggleSettings);
  document
    .getElementById("closeSettingsBtn")
    ?.addEventListener("click", () => closeModal("settingsModal"));
  document.getElementById("settingsModal")?.addEventListener("click", (e) => {
    if (e.target === document.getElementById("settingsModal")) {
      closeModal("settingsModal");
    }
  });

  document
    .getElementById("engineDropdownBtn")
    ?.addEventListener("click", toggleEngineDropdown);
  document
    .getElementById("searchSubmitBtn")
    ?.addEventListener("click", () =>
      handleSearch({ key: "Enter", type: "click", preventDefault: () => {} }),
    );

  const searchInput = document.getElementById("searchInput");
  const suggestionsContainer = document.getElementById("suggestionsContainer");

  if (searchInput && suggestionsContainer) {
    searchInput.addEventListener("input", (e) => {
      handleSuggestions(e, {
        links: store.getState().links || [],
        settings: store.getState().settings || {},
        searchHistory: store.getState().searchHistory || [],
        inputEl: searchInput,
        containerEl: suggestionsContainer,
        selectSuggestionFn: selectSuggestion,
      });
    });

    searchInput.addEventListener("keydown", (e) => {
      handleSuggestionKeyDown(
        e,
        searchInput,
        suggestionsContainer,
        selectSuggestion,
      );
      if (!e.defaultPrevented) {
        handleSearch(e);
      }
    });
  }

  const githubBtn = document.getElementById("githubBtn");
  if (githubBtn) {
    githubBtn.addEventListener("click", () =>
      window.open("https://github.com/jbuilds-g/0FluffStart", "_blank"),
    );
  }

  let isBulkAnimating = false;

  function updateScrollToTopBtn() {
    const btn = document.getElementById("scrollToTopBtn");
    const modalContent = document.querySelector(
      "#settingsModal .modal-content",
    );
    if (!btn || !modalContent) return;

    const panels = Array.from(
      document.querySelectorAll("#settingsModal details.category-panel"),
    );

    const isAnyPanelOpen = panels.some((panel) => panel.open);
    const isScrolledDown = modalContent.scrollTop > 30;

    btn.classList.toggle("hidden", !(isAnyPanelOpen && isScrolledDown));
  }

  async function animateToggleAllCategories() {
    const modalContent = document.querySelector(
      "#settingsModal .modal-content",
    );
    const panels = Array.from(
      document.querySelectorAll("#settingsModal details.category-panel"),
    );

    if (!panels.length || !modalContent) return;

    const openPanels = panels.filter((p) => p.open);
    const closedPanels = panels.filter((p) => !p.open);
    const shouldCollapse = openPanels.length >= closedPanels.length;

    if (shouldCollapse) {
      panels.forEach((panel) => (panel.open = false));
      updateScrollToTopBtn();
      return;
    }

    isBulkAnimating = true;
    closedPanels.forEach((panel) => {
      panel.open = true;
    });

    const lastPanel = panels[panels.length - 1];
    if (lastPanel) {
      lastPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    setTimeout(() => {
      isBulkAnimating = false;
      updateScrollToTopBtn();
    }, 350);
  }

  const toggleAllCategoriesBtn = document.getElementById(
    "toggleAllCategoriesBtn",
  );
  if (toggleAllCategoriesBtn) {
    toggleAllCategoriesBtn.addEventListener(
      "click",
      animateToggleAllCategories,
    );
  }

  const modalContent = document.querySelector("#settingsModal .modal-content");
  if (modalContent) {
    modalContent.addEventListener("scroll", updateScrollToTopBtn);
  }

  const scrollToTopBtn = document.getElementById("scrollToTopBtn");
  if (scrollToTopBtn) {
    scrollToTopBtn.addEventListener("click", () => {
      modalContent?.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  document
    .querySelectorAll("#settingsModal details.category-panel")
    .forEach((panel) => {
      panel.addEventListener("toggle", updateScrollToTopBtn);
    });

  const folderExitBtn = document.getElementById("folderExitBtn");
  const mobileSearchPill = document.getElementById("mobileSearchPill");
  const searchBarContainer = document.querySelector(".search-bar");
  const searchBackdrop = document.querySelector(".search-backdrop");

  if (folderExitBtn) {
    const currentFolderId = store.getState().currentFolderId;
    if (currentFolderId) {
      folderExitBtn.classList.remove("hidden");
    } else {
      folderExitBtn.classList.add("hidden");
    }

    folderExitBtn.addEventListener("click", () => {
      if (typeof window.exitFolder === "function") {
        window.exitFolder();
      }
    });
  }

  if (mobileSearchPill && searchBarContainer && searchBackdrop) {
    mobileSearchPill.addEventListener("click", () => {
      searchBarContainer.classList.add("mobile-expanded");
      searchBackdrop.classList.add("active");
      mobileSearchPill.classList.add("hidden");
      document.getElementById("searchInput")?.focus();
    });

    searchBackdrop.addEventListener("click", () => {
      searchBarContainer.classList.remove("mobile-expanded");
      searchBackdrop.classList.remove("active");
      mobileSearchPill.classList.remove("hidden");
      document.getElementById("searchInput")?.blur();
    });
  }

  const addLinkBtn = document.getElementById("addLinkBtn");
  if (addLinkBtn) {
    addLinkBtn.addEventListener("click", () =>
      openEditor(null, store.getState().currentFolderId),
    );
  }

  const addFolderBtn = document.getElementById("addFolderBtn");
  if (addFolderBtn) addFolderBtn.addEventListener("click", addFolder);

  const saveLinkBtn = document.getElementById("saveLinkBtn");
  if (saveLinkBtn) saveLinkBtn.addEventListener("click", saveLink);

  const cancelEditBtn = document.getElementById("cancelEditBtn");
  if (cancelEditBtn) cancelEditBtn.addEventListener("click", cancelEdit);

  document
    .getElementById("cancelSelectionBtn")
    ?.addEventListener("click", () => {
      store.setState({
        isSelectionMode: false,
        selectedLinkIds: [],
        activeFolderId: null,
      });
      renderLinkManager();
    });

  document
    .getElementById("confirmSelectionBtn")
    ?.addEventListener("click", () => {
      const state = store.getState();
      const selectedLinkIds = state.selectedLinkIds || [];
      const activeFolderId = state.activeFolderId;

      if (selectedLinkIds.length === 0) {
        return showToast("Please select at least one link.", "error");
      }

      const updatedLinks = state.links.map((link) => {
        if (selectedLinkIds.includes(link.id)) {
          return { ...link, parentId: activeFolderId };
        }
        return link;
      });

      store.setState({
        links: updatedLinks,
        isSelectionMode: false,
        selectedLinkIds: [],
        activeFolderId: null,
      });

      renderLinkManager();
    });

  const debouncedSaveUsername = debounce(() => autoSaveSettings(), 400);
  const debouncedSaveProxy = debounce(() => autoSaveSettings(), 400);

  const userNameInput = document.getElementById("userNameInput");
  if (userNameInput)
    userNameInput.addEventListener("input", debouncedSaveUsername);

  const themeSelect = document.getElementById("themeSelect");
  if (themeSelect) {
    themeSelect.addEventListener("change", () => autoSaveSettings());
  }

  const clockStyleSelect = document.getElementById("clockStyleSelect");
  if (clockStyleSelect)
    clockStyleSelect.addEventListener("change", () => autoSaveSettings());

  const showTitlesToggle = document.getElementById("showTitlesToggle");
  if (showTitlesToggle)
    showTitlesToggle.addEventListener("change", () => autoSaveSettings());

  const forceDesktopToggle = document.getElementById("forceDesktopToggle");
  if (forceDesktopToggle)
    forceDesktopToggle.addEventListener("change", () => autoSaveSettings());

  const openNewTabToggle = document.getElementById("openNewTabToggle");
  if (openNewTabToggle)
    openNewTabToggle.addEventListener("change", () => autoSaveSettings());

  const customCursorToggle = document.getElementById("customCursorToggle");
  if (customCursorToggle) {
    customCursorToggle.addEventListener("change", () => {
      autoSaveSettings();
      if (window.customCursorInstance) {
        window.customCursorInstance.toggleEnabled(customCursorToggle.checked);
      }
    });
  }

  const shadowSlider = document.getElementById("shadowSlider");
  const shadowInputNumber = document.getElementById("shadowInputNumber");

  if (shadowSlider && shadowInputNumber) {
    shadowSlider.addEventListener("input", () => {
      shadowInputNumber.value = shadowSlider.value;
      autoSaveSettings();
    });

    const syncNumberToSlider = () => {
      let val = parseInt(shadowInputNumber.value, 10);
      if (isNaN(val)) val = 100;
      val = Math.max(0, Math.min(200, val));
      shadowInputNumber.value = val;
      shadowSlider.value = val;
      autoSaveSettings();
    };

    shadowInputNumber.addEventListener("change", syncNumberToSlider);
    shadowInputNumber.addEventListener("blur", syncNumberToSlider);
  }

  const quickSuggestToggleBtn = document.getElementById(
    "quickSuggestToggleBtn",
  );
  if (quickSuggestToggleBtn) {
    quickSuggestToggleBtn.addEventListener("click", () => {
      const externalSuggestToggle = document.getElementById(
        "externalSuggestToggle",
      );
      if (externalSuggestToggle) {
        externalSuggestToggle.checked = !externalSuggestToggle.checked;
        externalSuggestToggle.dispatchEvent(new Event("change"));
      }
    });
  }

  const externalSuggestToggle = document.getElementById(
    "externalSuggestToggle",
  );
  if (externalSuggestToggle) {
    externalSuggestToggle.addEventListener("change", async () => {
      const isFirefox = navigator.userAgent.includes("Firefox");
      if (
        externalSuggestToggle.checked &&
        isFirefox &&
        typeof chrome !== "undefined" &&
        chrome?.permissions
      ) {
        const origins = [
          "https://0fluffstart-suggest-proxy.jbuilds.workers.dev/*",
        ];

        try {
          const hasPerm = await chrome.permissions.contains({ origins });
          if (!hasPerm) {
            const userAllowed = await customConfirm(
              "Fetching live search suggestions requires network access to privacy proxy endpoints. Click Allow to grant permission on the browser prompt.",
              "Enable Live Suggestions?",
            );

            if (!userAllowed) {
              externalSuggestToggle.checked = false;
              return;
            }

            const granted = await chrome.permissions.request({ origins });
            if (!granted) {
              externalSuggestToggle.checked = false;
              showToast(
                "Permission required to enable live search suggestions.",
                "error",
              );
              return;
            }
          }
        } catch (err) {
          console.warn("Permission check failed:", err);
          externalSuggestToggle.checked = false;
          return;
        }
      }
      autoSaveSettings();
    });
  }

  const suggestProviderSelect = document.getElementById(
    "suggestProviderSelect",
  );
  if (suggestProviderSelect)
    suggestProviderSelect.addEventListener("change", () => autoSaveSettings());

  const cacheSuggestToggle = document.getElementById("cacheSuggestToggle");
  if (cacheSuggestToggle)
    cacheSuggestToggle.addEventListener("change", () => autoSaveSettings());

  const customProxyInput = document.getElementById("customProxyInput");
  if (customProxyInput)
    customProxyInput.addEventListener("input", debouncedSaveProxy);

  const showEngineDropdownToggle = document.getElementById(
    "showEngineDropdownToggle",
  );
  if (showEngineDropdownToggle)
    showEngineDropdownToggle.addEventListener("change", () =>
      autoSaveSettings(),
    );

  const showQuickSuggestToggle = document.getElementById(
    "showQuickSuggestToggle",
  );
  if (showQuickSuggestToggle)
    showQuickSuggestToggle.addEventListener("change", () => autoSaveSettings());

  const showAllSearchControlsToggle = document.getElementById(
    "showAllSearchControlsToggle",
  );
  if (showAllSearchControlsToggle)
    showAllSearchControlsToggle.addEventListener("change", () =>
      autoSaveSettings(),
    );

  const showSearchSubmitToggle = document.getElementById(
    "showSearchSubmitToggle",
  );
  if (showSearchSubmitToggle)
    showSearchSubmitToggle.addEventListener("change", () => autoSaveSettings());

  const searchBarLayoutSelect = document.getElementById(
    "searchBarLayoutSelect",
  );
  if (searchBarLayoutSelect)
    searchBarLayoutSelect.addEventListener("change", () => autoSaveSettings());

  const historyEnabledToggle = document.getElementById("historyEnabledToggle");
  if (historyEnabledToggle)
    historyEnabledToggle.addEventListener("change", () => autoSaveSettings());

  document.querySelectorAll(".clock-radio").forEach((radio) => {
    radio.addEventListener("change", () => autoSaveSettings());
  });

  const showSecondsToggle = document.getElementById("showSecondsToggle");
  if (showSecondsToggle) {
    showSecondsToggle.addEventListener("change", () => {
      autoSaveSettings();
      updateClock();
    });
  }

  const bgInput = document.getElementById("bgImageInput");
  if (bgInput) {
    bgInput.addEventListener("change", async () => {
      await handleImageUpload(bgInput);
    });
  }

  const bgUrlInput = document.getElementById("bgUrlInput");
  if (bgUrlInput) {
    bgUrlInput.addEventListener(
      "input",
      debounce(async () => {
        const val = bgUrlInput.value.trim();
        if (val) {
          await updateBackgroundMedia("url", val);
        } else {
          await updateBackgroundMedia("clear", null);
        }
      }, 400),
    );
  }

  const resetBgBtn = document.getElementById("resetBgBtn");
  if (resetBgBtn) {
    resetBgBtn.addEventListener("click", async () => {
      await clearBackground();
    });
  }

  const clearHistoryBtn = document.getElementById("clearHistoryBtn");
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", () => {
      clearHistory({
        store,
        customConfirmFn: customConfirm,
        showToastFn: showToast,
        inputEl: document.getElementById("searchInput"),
      });
    });
  }

  const backupDataBtn = document.getElementById("backupDataBtn");
  if (backupDataBtn) backupDataBtn.addEventListener("click", backupData);

  const restoreDataBtn = document.getElementById("restoreDataBtn");
  if (restoreDataBtn) {
    restoreDataBtn.addEventListener("click", () =>
      document.getElementById("restoreInput")?.click(),
    );
  }

  const restoreInput = document.getElementById("restoreInput");
  if (restoreInput) {
    restoreInput.addEventListener("change", (e) =>
      restoreData(e, customConfirm, showToast),
    );
  }

  const engineCollapsibleTrigger = document.getElementById(
    "engineCollapsibleTrigger",
  );
  if (engineCollapsibleTrigger) {
    engineCollapsibleTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const container = document.getElementById("engineCollapsible");
      const content = document.getElementById("engineSectionContent");
      if (container && content) {
        const isOpen = container.classList.toggle("open");
        content.classList.toggle("hidden", !isOpen);
      }
    });

    const parentDetails = engineCollapsibleTrigger.closest("details");
    if (parentDetails) {
      parentDetails.addEventListener("toggle", () => {
        if (!parentDetails.open) {
          const container = document.getElementById("engineCollapsible");
          const content = document.getElementById("engineSectionContent");
          if (container && content) {
            container.classList.remove("open");
            content.classList.add("hidden");
          }
        }
      });
    }
  }

  const customEngineName = document.getElementById("customEngineName");
  const customEngineTag = document.getElementById("customEngineTag");
  let tagManuallyEdited = false;

  if (customEngineTag) {
    customEngineTag.addEventListener("input", () => {
      tagManuallyEdited = customEngineTag.value.trim().length > 0;
    });
  }

  if (customEngineName && customEngineTag) {
    customEngineName.addEventListener("input", () => {
      if (!tagManuallyEdited) {
        const clean = customEngineName.value.trim().toLowerCase();
        if (!clean) {
          customEngineTag.value = "";
          return;
        }
        const defaults = [
          "?bi",
          "?b",
          "?st",
          "?s",
          "?g",
          "?d",
          "?e",
          "?k",
          "?w",
          "?y",
        ];
        const firstChar = `?${clean.charAt(0)}`;
        if (defaults.includes(firstChar)) {
          customEngineTag.value =
            clean.length > 1 ? `?${clean.slice(0, 2)}` : "";
        } else {
          customEngineTag.value = firstChar;
        }
      }
    });
  }

  const addCustomEngineBtn = document.getElementById("addCustomEngineBtn");
  if (addCustomEngineBtn) {
    addCustomEngineBtn.addEventListener("click", () => {
      const nameInput = document.getElementById("customEngineName");
      const tagInput = document.getElementById("customEngineTag");
      const urlInput = document.getElementById("customEngineUrl");
      const name = nameInput?.value.trim();
      let tag = tagInput?.value.trim();
      let url = urlInput?.value.trim();

      if (!name) return showToast("Please enter an engine title.", "error");
      if (!url) return showToast("Please enter a search URL.", "error");

      if (!tag) {
        tag = `?${name.charAt(0).toLowerCase()}`;
      } else if (!tag.startsWith("?")) {
        tag = `?${tag}`;
      }

      if (
        !url.includes("?q=") &&
        !url.includes("=") &&
        !url.includes("query=")
      ) {
        url = url.includes("?") ? `${url}&q=` : `${url}?q=`;
      }

      const currentCustom = store.getState().settings?.customEngines || [];
      const newEngine = {
        id: `ce_${Date.now()}`,
        name,
        tag,
        url,
      };

      autoSaveSettings({ customEngines: [...currentCustom, newEngine] });

      if (nameInput) nameInput.value = "";
      if (tagInput) tagInput.value = "";
      if (urlInput) urlInput.value = "";
      tagManuallyEdited = false;

      document.getElementById("customEngineEditor")?.classList.add("hidden");

      renderEngineSelectionList();
      renderEngineDropdown();
      showToast(`Added custom engine "${name}"`, "success");
    });
  }

  const showAddEngineBtn = document.getElementById("showAddEngineBtn");
  if (showAddEngineBtn) {
    showAddEngineBtn.addEventListener("click", () => {
      const editor = document.getElementById("customEngineEditor");
      if (editor) {
        editor.classList.remove("hidden");
        document.getElementById("customEngineName")?.focus();
      }
    });
  }

  const cancelCustomEngineBtn = document.getElementById(
    "cancelCustomEngineBtn",
  );
  if (cancelCustomEngineBtn) {
    cancelCustomEngineBtn.addEventListener("click", () => {
      const nameInput = document.getElementById("customEngineName");
      const urlInput = document.getElementById("customEngineUrl");
      if (nameInput) nameInput.value = "";
      if (urlInput) urlInput.value = "";
      document.getElementById("customEngineEditor")?.classList.add("hidden");
    });
  }

  const resetSettingsBtn = document.getElementById("resetSettingsBtn");
  if (resetSettingsBtn) {
    resetSettingsBtn.addEventListener("click", async () => {
      const confirmed = await customConfirm(
        "All custom preferences, links, and saved folders will be permanently deleted. This action cannot be undone.",
        "Reset Everything?",
      );
      if (confirmed) {
        localStorage.clear();
        sessionStorage.clear();
        await clearBgFromDB();

        if (typeof chrome !== "undefined" && chrome?.storage?.local) {
          try {
            await chrome.storage.local.clear();
          } catch (err) {
            console.warn("Failed clearing chrome.storage.local:", err);
          }
        }

        await store.setState({
          links: DEFAULT_LINKS,
          settings: {
            theme: "dark",
            clockStyle: "default",
            clockFormat: "24h",
            showSeconds: true,
            userName: "",
            searchEngine: "Browser Default",
            externalSuggest: false,
            cacheSuggestions: true,
            suggestProvider: "auto",
            customProxyUrl: "",
            historyEnabled: true,
            showTitles: false,
            forceDesktop: false,
            customCursorEnabled: true,
            backgroundImage: null,
            shadowIntensity: 100,
            showAllSearchControls: true,
            showEngineDropdown: true,
            showQuickSuggest: true,
            showSearchSubmit: true,
            searchBarLayout: "unified",
            openInNewTab: false,
          },
          searchHistory: [],
          expandedFolderIds: [],
          currentFolderId: null,
          activeFolderId: null,
          isSelectionMode: false,
          selectedLinkIds: [],
        });

        showToast("App completely reset to factory defaults", "success");
        setTimeout(() => window.location.reload(), 500);
      }
    });
  }

  document.querySelectorAll(".help-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const parent =
        btn.closest(".setting-item") ||
        btn.closest(".setting-header") ||
        btn.parentElement;
      const textEl = parent?.nextElementSibling;
      if (textEl && textEl.classList.contains("help-text")) {
        textEl.classList.toggle("show");
        btn.classList.toggle("active");
      }
    });
  });

  const grid = document.getElementById("linkGrid");
  if (grid) {
    grid.addEventListener("click", (e) => {
      const item = e.target.closest(".link-item");
      if (!item) return;
      const id = item.dataset.id;
      const links = store.getState().links || [];
      const link = links.find((l) => l.id === id);
      if (!link) return;

      if (link.isFolder) {
        navigateToFolder(link.id);
      } else {
        const safeUrl = sanitizeUrl(link.url);
        if (safeUrl !== "#") {
          const openInNewTab = store.getState().settings?.openInNewTab;
          if (openInNewTab) {
            window.open(safeUrl, "_blank", "noopener,noreferrer");
          } else {
            window.location.href = safeUrl;
          }
        }
      }
    });

    grid.addEventListener("contextmenu", (e) => {
      const item = e.target.closest(".link-item");
      if (!item) return;
      e.preventDefault();
      const id = item.dataset.id;
      const links = store.getState().links || [];
      const link = links.find((l) => l.id === id);
      if (!link) return;

      toggleSettings({
        openDashboardLinks: true,
        targetItemId: link.id,
        isFolder: !!link.isFolder,
      });
    });
  }
}
