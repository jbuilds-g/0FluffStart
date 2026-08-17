import { store } from "./store.js";
import { debounce, sanitizeUrl } from "./utils.js";
import { backupData, restoreData } from "./storage.js";
import {
  handleSuggestions,
  handleSuggestionKeyDown,
  clearHistory,
} from "./suggestions.js";
import {
  loadSettings,
  autoSaveSettings,
  toggleSettings,
  closeModal,
  renderEngineDropdown,
  toggleEngineDropdown,
  handleSearch,
  selectSuggestion,
  updateClock,
  customConfirm,
  showToast,
  handleImageUpload,
  clearBackground,
  updateBackgroundMedia,
  initCustomSelects,
  checkMaterialYouReload,
  renderEngineSelectionList,
} from "./ui.js";
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

document.addEventListener("DOMContentLoaded", async () => {
  const CURRENT_VERSION = "v5.5.0";
  const storedVersion = localStorage.getItem("0fluff_app_version");

  if (storedVersion !== CURRENT_VERSION) {
    localStorage.setItem("0fluff_app_version", CURRENT_VERSION);
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
  renderLinks();
  renderEngineDropdown();
  updateClock();
  setInterval(updateClock, 1000);

  store.subscribe((prevState, currentState) => {
    const linksChanged = prevState.links !== currentState.links;
    const folderChanged =
      prevState.currentFolderId !== currentState.currentFolderId;
    const titlesChanged =
      prevState.settings?.showTitles !== currentState.settings?.showTitles;

    if (linksChanged || folderChanged || titlesChanged) {
      renderLinks();
    }
  });

  const searchInput = document.getElementById("searchInput");
  if (searchInput) searchInput.focus();

  document.addEventListener("click", (e) => {
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
    if (
      searchBarContainer?.classList.contains("mobile-expanded") &&
      !e.target.closest(".search-bar") &&
      !e.target.closest("#mobileSearchBtn")
    ) {
      closeMobileSearch();
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
    ).filter((panel) => panel.offsetParent !== null);

    const nonTopExpanded = panels.slice(1).some((panel) => panel.open);
    const isScrolledDown = modalContent.scrollTop > 30;

    btn.classList.toggle("hidden", !(nonTopExpanded && isScrolledDown));
  }

  async function animateToggleAllCategories() {
    const modalContent = document.querySelector(
      "#settingsModal .modal-content",
    );
    const panels = Array.from(
      document.querySelectorAll("#settingsModal details.category-panel"),
    ).filter((panel) => panel.offsetParent !== null);

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
      panel.addEventListener("toggle", () => {
        if (panel.open && !isBulkAnimating) {
          panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
        updateScrollToTopBtn();
      });
    });

  const mobileSearchBtn = document.getElementById("mobileSearchBtn");
  const searchBarContainer = document.querySelector(".search-bar");
  const searchBackdrop = document.querySelector(".search-backdrop");

  const closeMobileSearch = () => {
    if (searchBarContainer)
      searchBarContainer.classList.remove("mobile-expanded");
    if (searchBackdrop) searchBackdrop.classList.remove("active");
    if (searchInput) searchInput.blur();
  };

  if (mobileSearchBtn && searchInput && searchBarContainer) {
    mobileSearchBtn.addEventListener("click", (e) => {
      e.preventDefault();
      searchBarContainer.classList.add("mobile-expanded");
      if (searchBackdrop) searchBackdrop.classList.add("active");
      searchInput.focus();
    });

    if (searchBackdrop) {
      searchBackdrop.addEventListener("click", closeMobileSearch);
    }
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
    themeSelect.addEventListener("change", async () => {
      autoSaveSettings();
      await checkMaterialYouReload();
    });
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

  const externalSuggestToggle = document.getElementById(
    "externalSuggestToggle",
  );
  if (externalSuggestToggle) {
    externalSuggestToggle.addEventListener("change", async () => {
      if (
        externalSuggestToggle.checked &&
        typeof chrome !== "undefined" &&
        chrome?.permissions
      ) {
        const origins = [
          "https://0fluffstart-suggest-proxy.jbuilds.workers.dev/*",
          "https://api.allorigins.win/*",
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
      await checkMaterialYouReload();
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
        await checkMaterialYouReload();
      }, 400),
    );
  }

  const resetBgBtn = document.getElementById("resetBgBtn");
  if (resetBgBtn) {
    resetBgBtn.addEventListener("click", async () => {
      await clearBackground();
      await checkMaterialYouReload();
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
        localStorage.removeItem("0fluff_settings");
        localStorage.removeItem("0fluff_links");
        localStorage.removeItem("0fluff_history");
        store.setState({ links: [], searchHistory: [] });
        showToast("App completely reset to factory defaults", "success");
        setTimeout(() => window.location.reload(), 1000);
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
        if (safeUrl !== "#") window.location.href = safeUrl;
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
