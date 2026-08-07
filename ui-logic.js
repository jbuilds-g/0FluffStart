/* global links:writable, settings, isEditingId:writable, searchEngines, store, customConfirm, showToast */
/* global renderEngineDropdown, loadSettings, updateClock, autoSaveSettings */
/* global saveBgToDB, getBgFromDB, handleImageUpload, clearBackground */

import {
  handleSuggestions,
  handleSuggestionKeyDown,
  logSearch,
  clearHistory,
  clearSuggestionCache,
} from "./suggestions.js";
import { MaterialYouEngine } from "./material-you-engine.js";

const materialYouEngine = new MaterialYouEngine();

// --- STATE ---
let currentFolderId = null;

// --- DEBOUNCE UTILITY ---
function debounce(fn, delay = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

// --- SECURITY: PROTOCOL SANITIZER ---
function sanitizeUrl(url) {
  if (!url) return "#";
  const trimmed = url.trim();
  // Allow safe protocols or relative paths; block javascript:, data:, etc.
  if (/^(https?:\/\/|mailto:|tel:|\/|\.\/)/i.test(trimmed)) {
    return trimmed;
  }
  // Block any explicitly dangerous or malformed scheme
  if (/^[a-z0-9+-.]+:/i.test(trimmed)) {
    return "#";
  }
  // Default protocol-less entries to HTTPS
  return `https://${trimmed}`;
}

// --- SELECTION MODE STATE ---
let isSelectionMode = false;
let selectedLinkIds = [];
let editorTargetFolderId = null; // Tracks which folder a NEW link should be saved into

// --- REUSABLE CUSTOM SELECT ENGINE ---
function initCustomSelects() {
  document.addEventListener("click", (e) => {
    const trigger = e.target.closest(".select-trigger");
    const selectContainer = e.target.closest(".custom-select");

    // Close open dropdowns outside the active container
    document.querySelectorAll(".custom-select").forEach((cs) => {
      if (cs !== selectContainer) {
        cs.classList.remove("open");
        cs.querySelector(".select-dropdown")?.classList.add("hidden");
      }
    });

    if (trigger && selectContainer) {
      const dropdown = selectContainer.querySelector(".select-dropdown");
      const isOpening = dropdown?.classList.contains("hidden");
      selectContainer.classList.toggle("open", isOpening);
      dropdown?.classList.toggle("hidden");
      return;
    }

    const option = e.target.closest(".select-option");
    if (option && selectContainer) {
      const value = option.dataset.value;
      const label = option.textContent.trim();
      const labelEl = selectContainer.querySelector(".selected-text");
      const dropdown = selectContainer.querySelector(".select-dropdown");

      if (labelEl) labelEl.textContent = label;
      selectContainer.dataset.value = value;

      selectContainer.querySelectorAll(".select-option").forEach((opt) => {
        opt.classList.toggle("selected", opt === option);
      });

      selectContainer.classList.remove("open");
      dropdown?.classList.add("hidden");
      selectContainer.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
}

function setCustomSelectValue(selectId, value) {
  const selectEl = document.getElementById(selectId);
  if (!selectEl) return;
  const option = selectEl.querySelector(
    `.select-option[data-value="${value}"]`,
  );
  if (option) {
    selectEl
      .querySelectorAll(".select-option")
      .forEach((opt) => opt.classList.remove("selected"));
    option.classList.add("selected");
    const labelEl = selectEl.querySelector(".selected-text");
    if (labelEl) labelEl.textContent = option.textContent.trim();
    selectEl.dataset.value = value;
  }
}

function getCustomSelectValue(selectId) {
  const selectEl = document.getElementById(selectId);
  return selectEl ? selectEl.dataset.value || "" : "";
}

// --- INIT & PWA ---
document.addEventListener("DOMContentLoaded", () => {
  const CURRENT_VERSION = "v3.0.0";
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

  initCustomSelects();
  bindStaticEvents();
  loadSettings();
  renderLinks();
  renderEngineDropdown();
  updateClock();
  setInterval(updateClock, 1000);

  // --- REACTIVE STORE SUBSCRIPTION ---
  store.subscribe(() => {
    renderLinks();
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
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.getElementById("settingsModal")?.classList.remove("active");
      document.getElementById("engineDropdown")?.classList.add("hidden");
      document.getElementById("suggestionsContainer")?.classList.add("hidden");
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

async function checkMaterialYouReload() {
  if (
    settings.theme === "material-you" &&
    settings.backgroundImage === "indexeddb"
  ) {
    const confirmed = await customConfirm(
      "A quick page reload is required for Material You color extraction to take full effect.",
      "Reload Required?",
    );
    if (confirmed) {
      window.location.reload();
    }
  }
}

// --- EVENT BINDING ---
function bindStaticEvents() {
  document
    .getElementById("settingsToggleBtn")
    .addEventListener("click", toggleSettings);
  document
    .getElementById("closeSettingsBtn")
    .addEventListener("click", () => closeModal("settingsModal"));
  document.getElementById("settingsModal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("settingsModal"))
      closeModal("settingsModal");
  });

  document
    .getElementById("engineDropdownBtn")
    .addEventListener("click", toggleEngineDropdown);
  document
    .getElementById("searchSubmitBtn")
    .addEventListener("click", () =>
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
  if (githubBtn)
    githubBtn.addEventListener("click", () =>
      window.open("https://github.com/jbuilds-g/0FluffStart", "_blank"),
    );

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
    const isBottomOpen = panels[panels.length - 1].open;

    closedPanels.forEach((panel) => {
      panel.open = true;
    });

    if (!isBottomOpen && closedPanels.length > 0) {
      closedPanels[0].scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }

    isBulkAnimating = false;
    updateScrollToTopBtn();
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

  // --- MOBILE RESPONSIVE ENGINE ---
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

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMobileSearch();
    });
  }

  const addLinkBtn = document.getElementById("addLinkBtn");
  if (addLinkBtn)
    addLinkBtn.addEventListener("click", () =>
      openEditor(null, currentFolderId),
    );

  const addFolderBtn = document.getElementById("addFolderBtn");
  if (addFolderBtn) addFolderBtn.addEventListener("click", addFolder);

  const saveLinkBtn = document.getElementById("saveLinkBtn");
  if (saveLinkBtn) saveLinkBtn.addEventListener("click", saveLink);

  const cancelEditBtn = document.getElementById("cancelEditBtn");
  if (cancelEditBtn) cancelEditBtn.addEventListener("click", cancelEdit);

  // --- SELECTION MODE BUTTONS ---
  document
    .getElementById("cancelSelectionBtn")
    ?.addEventListener("click", () => {
      isSelectionMode = false;
      selectedLinkIds = [];
      activeFolderId = null;
      renderLinkManager();
    });

  document
    .getElementById("confirmSelectionBtn")
    ?.addEventListener("click", () => {
      if (selectedLinkIds.length === 0)
        return alert("Please select at least one link.");
      const updatedLinks = store.getState().links.map((link) => {
        if (selectedLinkIds.includes(link.id)) {
          return { ...link, parentId: activeFolderId };
        }
        return link;
      });
      store.setState({ links: updatedLinks });
      isSelectionMode = false;
      selectedLinkIds = [];
      activeFolderId = null;
      renderLinkManager();
    });

  // --- OPTIMIZATION 2: SELECTIVE SETTINGS TRIGGERS ---
  const debouncedSaveUsername = debounce(
    () => autoSaveSettings("username"),
    400,
  );
  const debouncedSaveProxy = debounce(
    () => autoSaveSettings("suggestions"),
    400,
  );

  const userNameInput = document.getElementById("userNameInput");
  if (userNameInput)
    userNameInput.addEventListener("input", debouncedSaveUsername);

  const themeSelect = document.getElementById("themeSelect");
  if (themeSelect)
    themeSelect.addEventListener("change", () => autoSaveSettings("theme"));

  const clockStyleSelect = document.getElementById("clockStyleSelect");
  if (clockStyleSelect)
    clockStyleSelect.addEventListener("change", () =>
      autoSaveSettings("clock"),
    );

  const showTitlesToggle = document.getElementById("showTitlesToggle");
  if (showTitlesToggle)
    showTitlesToggle.addEventListener("change", () =>
      autoSaveSettings("titles"),
    );

  const forceDesktopToggle = document.getElementById("forceDesktopToggle");
  if (forceDesktopToggle)
    forceDesktopToggle.addEventListener("change", () =>
      autoSaveSettings("forceDesktop"),
    );

  const externalSuggestToggle = document.getElementById(
    "externalSuggestToggle",
  );
  if (externalSuggestToggle)
    externalSuggestToggle.addEventListener("change", () =>
      autoSaveSettings("suggestions"),
    );

  const suggestProviderSelect = document.getElementById(
    "suggestProviderSelect",
  );
  if (suggestProviderSelect)
    suggestProviderSelect.addEventListener("change", () =>
      autoSaveSettings("suggestions"),
    );

  const cacheSuggestToggle = document.getElementById("cacheSuggestToggle");
  if (cacheSuggestToggle)
    cacheSuggestToggle.addEventListener("change", () =>
      autoSaveSettings("suggestions"),
    );

  const customProxyInput = document.getElementById("customProxyInput");
  if (customProxyInput)
    customProxyInput.addEventListener("input", debouncedSaveProxy);

  const historyEnabledToggle = document.getElementById("historyEnabledToggle");
  if (historyEnabledToggle)
    historyEnabledToggle.addEventListener("change", () =>
      autoSaveSettings("history"),
    );

  document.querySelectorAll(".clock-radio").forEach((radio) => {
    radio.addEventListener("change", () => autoSaveSettings("clock"));
  });

  const showSecondsToggle = document.getElementById("showSecondsToggle");
  if (showSecondsToggle) {
    showSecondsToggle.addEventListener("change", () => {
      autoSaveSettings("clock");
      updateClock(); // Force an instant visual update!
    });
  }

  // --- BACKGROUND & DATA BUTTONS ---
  const bgInput = document.getElementById("bgImageInput");
  if (bgInput)
    bgInput.addEventListener("change", async () => {
      await handleImageUpload(bgInput);
      await checkMaterialYouReload();
    });

  const bgUrlInput = document.getElementById("bgUrlInput");
  if (bgUrlInput) {
    const processUrlBackground = async () => {
      const url = bgUrlInput.value.trim();
      if (!url) return;
      try {
        await saveBgToDB(url);
        settings.backgroundImage = "indexeddb";
        autoSaveSettings("background");
        await loadSettings();
        await checkMaterialYouReload();
      } catch (e) {
        console.error("Failed to apply URL background:", e);
      }
    };

    bgUrlInput.addEventListener("change", processUrlBackground);
    bgUrlInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") processUrlBackground();
    });
  }

  const resetBgBtn = document.getElementById("resetBgBtn");
  if (resetBgBtn) {
    resetBgBtn.addEventListener("click", async () => {
      await clearBackground();
      autoSaveSettings("background");
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
  if (restoreDataBtn)
    restoreDataBtn.addEventListener("click", () =>
      document.getElementById("restoreInput").click(),
    );

  const restoreInput = document.getElementById("restoreInput");
  if (restoreInput) restoreInput.addEventListener("change", restoreData);

  // --- UI HELPERS ---
  document.querySelectorAll(".help-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const parent =
        btn.closest(".setting-item") ||
        btn.closest(".setting-header") ||
        btn.parentElement;
      const textEl = parent.nextElementSibling;
      if (textEl && textEl.classList.contains("help-text")) {
        textEl.classList.toggle("show");
        btn.classList.toggle("active");
      }
    });
  });

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
        links = [];
        showToast("App completely reset to factory defaults", "success");
        setTimeout(() => window.location.reload(), 1000);
      }
    });
  }

  const grid = document.getElementById("linkGrid");
  if (grid) {
    grid.addEventListener("click", (e) => {
      const item = e.target.closest(".link-item");
      if (!item) return;
      const id = item.dataset.id;
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
      const link = links.find((l) => l.id === id);
      if (!link) return;

      toggleSettings();

      if (link.isFolder) {
        const detailsPanel = document
          .querySelector("#linkListContainer")
          ?.closest("details");
        if (detailsPanel && !detailsPanel.open) {
          detailsPanel.open = true;
        }

        cancelEdit();

        const managerItem = document.querySelector(
          `.link-manager-item[data-id="${link.id}"]`,
        );
        if (managerItem) {
          // Expand all ancestor folder containers leading up to this item
          let parentSubContainer = managerItem.closest(".folder-sub-container");
          while (parentSubContainer) {
            parentSubContainer.style.display = "block";
            const parentManagerItem = parentSubContainer.previousElementSibling;
            if (
              parentManagerItem &&
              parentManagerItem.classList.contains("link-manager-item")
            ) {
              const parentToggle =
                parentManagerItem.querySelector(".folder-toggle");
              if (parentToggle) parentToggle.innerText = "▼";
            }
            parentSubContainer = parentSubContainer.parentElement
              ? parentSubContainer.parentElement.closest(
                  ".folder-sub-container",
                )
              : null;
          }

          // Expand target folder's own sub-container
          const subContainer = managerItem.nextElementSibling;
          if (
            subContainer &&
            subContainer.classList.contains("folder-sub-container")
          ) {
            subContainer.style.display = "block";
            const toggleBtn = managerItem.querySelector(".folder-toggle");
            if (toggleBtn) toggleBtn.innerText = "▼";
          }

          managerItem.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else {
        editLink(link.id);
      }
    });
  }
}

function applyClockStyle() {
  const clock = document.getElementById("clockDisplay");
  if (clock) {
    clock.className = "clock";
    clock.classList.add(`clock-style-${settings.clockStyle || "default"}`);
  }
}

// --- FOLDER NAVIGATION & CREATION ---
function navigateToFolder(folderId) {
  currentFolderId = folderId;
  const header = document.getElementById("activeFolderHeader");
  if (header) {
    if (folderId) header.classList.remove("hidden");
    else header.classList.add("hidden");
  }
  renderLinks();
}

function addFolder() {
  const linkListContainer = document.getElementById("linkListContainer");
  const linkEditorContainer = document.getElementById("linkEditorContainer");

  if (linkListContainer) linkListContainer.classList.add("hidden");
  if (linkEditorContainer) linkEditorContainer.classList.remove("hidden");

  const titleEl = document.getElementById("editorTitle");
  const nameInput = document.getElementById("editName");
  const urlInput = document.getElementById("editUrl");

  isEditingId = null;
  editorTargetFolderId = currentFolderId;

  if (titleEl) titleEl.innerText = "Add New Folder";
  if (nameInput) nameInput.value = "";
  if (urlInput) {
    urlInput.value = "";
    urlInput.style.display = "none"; // Hide URL field since folders only need a name
  }
}

// --- OPTIMIZATION 3: FAST MASTER TEMPLATES ---
const folderTemplate = document.createElement("div");
folderTemplate.className = "link-item is-folder";
folderTemplate.innerHTML = `
    <div class="link-icon-circle">
        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
        </svg>
    </div>
    <div class="link-name"></div>
`;

const linkTemplate = document.createElement("div");
linkTemplate.className = "link-item";
linkTemplate.innerHTML = `
    <div class="link-icon-circle">
        <span class="link-acronym"></span>
    </div>
    <div class="link-name"></div>
`;

// --- MAIN GRID RENDERING ---
function renderLinks() {
  const grid = document.getElementById("linkGrid");
  if (!grid) return;
  grid.innerHTML = "";
  grid.classList.toggle("show-titles", !!settings.showTitles);

  const visibleLinks = links.filter(
    (l) => (l.parentId || null) === currentFolderId,
  );
  const fragment = document.createDocumentFragment();

  visibleLinks.forEach((link) => {
    let item;

    if (link.isFolder) {
      // Clone master folder template
      item = folderTemplate.cloneNode(true);
      item.dataset.id = link.id;
      item.querySelector(".link-name").textContent = link.name;
    } else {
      // Clone master link template
      item = linkTemplate.cloneNode(true);
      item.dataset.id = link.id;

      const words = link.name.split(" ").filter((w) => w.length > 0);
      let acronym = words.map((word) => word.charAt(0).toUpperCase()).join("");
      if (words.length === 1 && acronym.length === 1 && link.name.length > 1) {
        acronym = link.name.substring(0, 2).toUpperCase();
      }
      const display = acronym.substring(0, 3);
      let fontSize =
        display.length === 1
          ? "2rem"
          : display.length === 2
            ? "1.6rem"
            : "1.2rem";

      const span = item.querySelector(".link-acronym");
      span.textContent = display;
      span.style.fontSize = fontSize;
      item.querySelector(".link-name").textContent = link.name;
    }

    fragment.appendChild(item);
  });

  grid.appendChild(fragment);

  // --- SOLID PILL BACK BUTTON ---
  if (currentFolderId !== null) {
    const exitContainer = document.createElement("div");
    exitContainer.className = "folder-exit-container";
    exitContainer.innerHTML = `
      <div class="back-pill" title="Back to Dashboard">
        <div class="back-icon-circle">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        </div>
        <span class="back-text">DASHBOARD</span>
      </div>
    `;

    const backBtn = exitContainer.querySelector(".back-pill");
    backBtn.addEventListener("click", () => navigateToFolder(null));
    grid.appendChild(exitContainer);
  }
} // End of renderLinks() function

// --- SELECTION TOGGLE ---
function toggleSelection(id) {
  if (selectedLinkIds.includes(id)) {
    selectedLinkIds = selectedLinkIds.filter((itemId) => itemId !== id);
  } else {
    selectedLinkIds.push(id);
  }
  renderLinkManager();
}

// --- NESTED LINK MANAGEMENT ---
function renderLinkManager() {
  const linkManagerContent = document.getElementById("linkManagerContent");
  if (!linkManagerContent) return;
  linkManagerContent.innerHTML = "";

  const standardBtns = document.getElementById("standardActionBtns");
  const selectionToolbar = document.getElementById("selectionToolbar");

  if (isSelectionMode) {
    if (standardBtns) standardBtns.classList.add("hidden");
    if (selectionToolbar) selectionToolbar.classList.remove("hidden");
    const countSpan = document.getElementById("selectionCount");
    if (countSpan) countSpan.innerText = `${selectedLinkIds.length} Selected`;
  } else {
    if (standardBtns) standardBtns.classList.remove("hidden");
    if (selectionToolbar) selectionToolbar.classList.add("hidden");
  }

  if (links.length === 0) {
    linkManagerContent.innerHTML =
      '<div style="color:var(--dim); text-align:center; padding:10px;">No links yet.</div>';
    return;
  }

  // --- ICONS & SETUP ---
  const editIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`;
  const deleteIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
  const moveOutIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--delete)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  const folderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="manager-item-icon"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
  const linkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="manager-item-icon link-type"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;

  // --- ITEM BUILDER ---
  function createManagerItem(link, level = 0, isSelectable = false) {
    const item = document.createElement("div");
    item.className = "link-manager-item";
    item.dataset.id = link.id;

    if (level > 0) {
      item.classList.add("nested-level");
      item.style.marginLeft = `${level * 28}px`;
      item.style.width = `calc(100% - ${level * 28 + 12}px)`;
    }

    const nameSpan = document.createElement("span");
    nameSpan.className = "link-name";

    if (link.isFolder) {
      const toggleSpan = document.createElement("span");
      toggleSpan.className = "folder-toggle";
      toggleSpan.textContent = "▶";
      nameSpan.appendChild(toggleSpan);

      item.classList.add("is-folder-item");
    }

    const iconWrapper = document.createElement("span");
    iconWrapper.innerHTML = link.isFolder ? folderSvg : linkSvg;
    nameSpan.appendChild(iconWrapper);

    const textNode = document.createTextNode(link.name);
    nameSpan.appendChild(textNode);

    if (isSelectable) {
      const leftContainer = document.createElement("div");
      leftContainer.className = "manager-item-left";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = selectedLinkIds.includes(link.id);
      checkbox.className = "manager-checkbox";

      leftContainer.appendChild(checkbox);
      leftContainer.appendChild(nameSpan);

      item.appendChild(leftContainer);
      item.classList.add("is-folder-item");
      item.onclick = (e) => {
        if (e.target.classList.contains("folder-toggle")) return;

        if (e.target !== checkbox) checkbox.checked = !checkbox.checked;
        toggleSelection(link.id);
      };
    } else {
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "link-actions";

      if (level > 0) {
        const moveOutBtn = document.createElement("button");
        moveOutBtn.className = "icon-btn";
        moveOutBtn.title = "Move out of folder";
        moveOutBtn.innerHTML = moveOutIconSVG;

        moveOutBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (
            await customConfirm(
              `Move "${link.name}" back to the main dashboard?`,
              "Move Item?",
            )
          ) {
            const idx = links.findIndex((l) => l.id === link.id);
            if (idx > -1) {
              const [movedItem] = links.splice(idx, 1);
              movedItem.parentId = null;
              links.push(movedItem);
              localStorage.setItem("0fluff_links", JSON.stringify(links));
              renderLinks();
              renderLinkManager();
            }
          }
        });
        actionsDiv.appendChild(moveOutBtn);
      }

      const editBtn = document.createElement("button");
      editBtn.className = "icon-btn secondary";
      editBtn.title = "Edit";
      editBtn.innerHTML = editIconSVG;
      editBtn.addEventListener("click", (e) => editLink(link.id, e));

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "icon-btn delete-btn";
      deleteBtn.title = "Delete";
      deleteBtn.innerHTML = deleteIconSVG;
      deleteBtn.addEventListener("click", (e) => deleteLink(link.id, e));

      actionsDiv.appendChild(editBtn);
      actionsDiv.appendChild(deleteBtn);

      item.appendChild(nameSpan);
      item.appendChild(actionsDiv);
    }

    return item;
  }

  // --- RECURSIVE FOLDER BUILDER ---
  function buildFolderNodes(parentId = null, level = 0) {
    const containerFragment = document.createDocumentFragment();
    const childLinks = links.filter((l) => (l.parentId || null) === parentId);

    childLinks.forEach((link) => {
      if (isSelectionMode && link.id === activeFolderId) return;

      const row = createManagerItem(link, level, isSelectionMode);
      containerFragment.appendChild(row);

      if (link.isFolder) {
        const subContainer = document.createElement("div");
        subContainer.className = "folder-sub-container";
        subContainer.style.display = "none";
        subContainer.style.marginTop = "4px";
        subContainer.style.marginBottom = "10px";

        const toggleBtn = row.querySelector(".folder-toggle");
        if (toggleBtn) {
          row.addEventListener("click", (e) => {
            if (e.target.closest(".link-actions")) return;

            const isHidden = subContainer.style.display === "none";
            subContainer.style.display = isHidden ? "block" : "none";
            toggleBtn.innerText = isHidden ? "▼" : "▶";
          });
        }

        subContainer.appendChild(buildFolderNodes(link.id, level + 1));

        if (!isSelectionMode) {
          const actionRow = document.createElement("div");
          actionRow.className = "folder-action-row";
          actionRow.style.marginLeft = `${(level + 1) * 28}px`;
          actionRow.style.width = `calc(100% - ${(level + 1) * 28}px)`;

          const addNewBtn = document.createElement("button");
          addNewBtn.className = "add-link-btn";
          addNewBtn.innerHTML = `+ New Link`;
          addNewBtn.onclick = () => openEditor(null, link.id);

          const addExistingBtn = document.createElement("button");
          addExistingBtn.className = "add-link-btn btn-secondary-bg";
          addExistingBtn.innerHTML = `+ Existing`;
          addExistingBtn.onclick = () => {
            isSelectionMode = true;
            activeFolderId = link.id;
            selectedLinkIds = [];
            renderLinkManager();
          };

          actionRow.appendChild(addNewBtn);
          actionRow.appendChild(addExistingBtn);
          subContainer.appendChild(actionRow);
        }

        containerFragment.appendChild(subContainer);
      }
    });

    return containerFragment;
  }

  const fragment = buildFolderNodes(null, 0);

  if (isSelectionMode && fragment.children.length === 0) {
    const emptyMsg = document.createElement("div");
    emptyMsg.innerText = "No other links or folders available.";
    emptyMsg.className = "empty-manager-msg";
    fragment.appendChild(emptyMsg);
  }

  linkManagerContent.appendChild(fragment);
}

function openEditor(id = null, parentId = null) {
  const linkListContainer = document.getElementById("linkListContainer");
  const linkEditorContainer = document.getElementById("linkEditorContainer");

  if (linkListContainer) linkListContainer.classList.add("hidden");
  if (linkEditorContainer) linkEditorContainer.classList.remove("hidden");

  const titleEl = document.getElementById("editorTitle");
  const nameInput = document.getElementById("editName");
  const urlInput = document.getElementById("editUrl");

  isEditingId = id;
  // If we clicked "+ New Link" inside a nested folder, save that destination
  editorTargetFolderId = parentId !== null ? parentId : currentFolderId;

  if (id) {
    const link = links.find((l) => l.id === id);
    if (link) {
      titleEl.innerText = link.isFolder ? "Edit Folder" : "Edit Link";
      nameInput.value = link.name;

      if (link.isFolder) {
        urlInput.style.display = "none";
        urlInput.value = "";
      } else {
        urlInput.style.display = "block";
        urlInput.value = link.url || "";
      }
    }
  } else {
    titleEl.innerText = "Add New Link";
    nameInput.value = "";
    urlInput.style.display = "block";
    urlInput.value = "";
  }
}

function cancelEdit() {
  document.getElementById("linkEditorContainer")?.classList.add("hidden");
  document.getElementById("linkListContainer")?.classList.remove("hidden");
  isEditingId = null;
  editorTargetFolderId = null; // Clear the target
}

function saveLink() {
  const nameInput = document.getElementById("editName");
  const urlInput = document.getElementById("editUrl");
  const name = nameInput.value.trim();
  const url = urlInput.value.trim();
  const isFolderCreation = urlInput && urlInput.style.display === "none";

  if (!name) return showToast("Please fill in the name.", "error");

  if (isEditingId) {
    const idx = links.findIndex((l) => l.id === isEditingId);
    if (idx > -1) {
      links[idx].name = name;
      if (!links[idx].isFolder) links[idx].url = url;
    }
    showToast(
      links[idx]?.isFolder ? "Folder updated" : "Link updated",
      "success",
    );
  } else {
    if (isFolderCreation) {
      links.push({
        id: generateId(),
        name,
        isFolder: true,
        parentId:
          editorTargetFolderId !== null
            ? editorTargetFolderId
            : currentFolderId,
      });
      showToast("Folder created successfully", "success");
    } else {
      if (!url) return showToast("Please fill in the URL.", "error");
      links.push({
        id: generateId(),
        name,
        url,
        isFolder: false,
        parentId:
          editorTargetFolderId !== null
            ? editorTargetFolderId
            : currentFolderId,
      });
      showToast("Link added successfully", "success");
    }
  }

  saveLinksState();
  editorTargetFolderId = null;
  renderLinks();
  renderLinkManager();
  cancelEdit();
}

function editLink(id, e) {
  if (e) e.stopPropagation();
  openEditor(id, null);
}

async function deleteLink(id, e) {
  if (e) e.stopPropagation();
  const confirmed = await customConfirm(
    "This item and its contents will be permanently deleted.",
    "Delete Item?",
  );
  if (confirmed) {
    const updatedLinks = store
      .getState()
      .links.filter((l) => l.id !== id && l.parentId !== id);
    store.setState({ links: updatedLinks });
    if (currentFolderId === id) navigateToFolder(null);
    renderLinkManager();
    showToast("Item deleted", "info");
  }
}

// --- SETTINGS HELPERS ---
async function loadSettings() {
  setCustomSelectValue("themeSelect", settings.theme || "dark");
  setCustomSelectValue("clockStyleSelect", settings.clockStyle || "default");

  const userNameInput = document.getElementById("userNameInput");
  if (userNameInput) userNameInput.value = settings.userName || "";

  const radios = document.getElementsByName("clockFormat");
  for (let r of radios)
    if (r.value === (settings.clockFormat || "24h")) r.checked = true;

  const externalSuggestToggle = document.getElementById(
    "externalSuggestToggle",
  );
  if (externalSuggestToggle)
    externalSuggestToggle.checked = !!settings.externalSuggest;

  const cacheSuggestToggle = document.getElementById("cacheSuggestToggle");
  if (cacheSuggestToggle)
    cacheSuggestToggle.checked = settings.cacheSuggestions !== false;

  setCustomSelectValue(
    "suggestProviderSelect",
    settings.suggestProvider || "auto",
  );

  const customProxyInput = document.getElementById("customProxyInput");
  if (customProxyInput) customProxyInput.value = settings.customProxyUrl || "";

  const historyEnabledToggle = document.getElementById("historyEnabledToggle");
  if (historyEnabledToggle)
    historyEnabledToggle.checked = settings.historyEnabled !== false;

  const showTitlesToggle = document.getElementById("showTitlesToggle");
  if (showTitlesToggle) showTitlesToggle.checked = !!settings.showTitles;

  const forceDesktopToggle = document.getElementById("forceDesktopToggle");
  if (forceDesktopToggle) {
    forceDesktopToggle.checked = !!settings.forceDesktop;
    document.body.classList.toggle(
      "force-desktop-mode",
      !!settings.forceDesktop,
    );
  }

  const showSecondsToggle = document.getElementById("showSecondsToggle");
  if (showSecondsToggle)
    showSecondsToggle.checked = settings.showSeconds !== false;

  document.body.className = settings.theme || "dark";
  applyClockStyle();

  const overlay = document.getElementById("bgOverlay");
  const bgVideo = document.getElementById("bgVideo"); // Grab the video element

  if (settings.backgroundImage === "indexeddb") {
    try {
      const bgData = await getBgFromDB();
      if (bgData) {
        if (window.activeBgObjectUrl) {
          URL.revokeObjectURL(window.activeBgObjectUrl);
        }

        const url =
          bgData instanceof Blob || bgData instanceof File
            ? URL.createObjectURL(bgData)
            : bgData;
        if (bgData instanceof Blob || bgData instanceof File) {
          window.activeBgObjectUrl = url;
        }

        const bgImage = document.getElementById("bgImage");
        const isVideo =
          (bgData.type && bgData.type.startsWith("video/")) ||
          (typeof bgData === "string" &&
            bgData.match(/\.(mp4|webm|ogg)($|\?)/i));
        if (isVideo) {
          if (bgImage) {
            bgImage.style.backgroundImage = "";
            bgImage.classList.add("hidden");
            bgImage.classList.remove("active");
          }
          if (bgVideo) {
            bgVideo.src = url;
            bgVideo.classList.remove("hidden");
            bgVideo.classList.add("active");
            bgVideo
              .play()
              .catch((err) => console.warn("Playback prevented:", err));
          }
        } else {
          if (bgVideo) {
            bgVideo.src = "";
            bgVideo.classList.add("hidden");
            bgVideo.classList.remove("active");
          }
          if (bgImage) {
            bgImage.style.backgroundImage = `url('${url}')`;
            bgImage.classList.remove("hidden");
            bgImage.classList.add("active");
          }
        }

        if (overlay) overlay.style.opacity = "1";
      }
    } catch (e) {
      console.error("Background load fail:", e);
    }
  } else {
    if (window.activeBgObjectUrl) {
      URL.revokeObjectURL(window.activeBgObjectUrl);
      window.activeBgObjectUrl = null;
    }
    const bgImage = document.getElementById("bgImage");
    if (bgImage) {
      bgImage.style.backgroundImage = "";
      bgImage.classList.add("hidden");
      bgImage.classList.remove("active");
    }
    if (bgVideo) {
      bgVideo.src = "";
      bgVideo.classList.add("hidden");
      bgVideo.classList.remove("active");
    }
    if (overlay) overlay.style.opacity = "0";
  }
  updateClock();
  renderEngineDropdown();
  materialYouEngine.triggerMaterialYou(settings, getBgFromDB);
}

// --- FIXED AUTO-SAVE WITH SELECTIVE RENDERING ---
function autoSaveSettings(changedSetting = null) {
  // 1. Core State Capture (Safely check if elements exist so we don't overwrite hidden settings)
  const themeVal = getCustomSelectValue("themeSelect");
  if (themeVal) settings.theme = themeVal;

  const clockVal = getCustomSelectValue("clockStyleSelect");
  if (clockVal) settings.clockStyle = clockVal;

  const userNameInput = document.getElementById("userNameInput");
  if (userNameInput) settings.userName = userNameInput.value.trim();

  const showSecondsToggle = document.getElementById("showSecondsToggle");
  if (showSecondsToggle) settings.showSeconds = !!showSecondsToggle.checked;

  const radios = document.getElementsByName("clockFormat");
  if (radios && radios.length > 0) {
    for (let r of radios) {
      if (r.checked) settings.clockFormat = r.value;
    }
  }

  const externalSuggestToggle = document.getElementById(
    "externalSuggestToggle",
  );
  if (externalSuggestToggle)
    settings.externalSuggest = !!externalSuggestToggle.checked;

  const cacheSuggestToggle = document.getElementById("cacheSuggestToggle");
  if (cacheSuggestToggle) {
    const enabled = !!cacheSuggestToggle.checked;
    settings.cacheSuggestions = enabled;
    if (!enabled) {
      clearSuggestionCache();
    }
  }

  const suggestProviderVal = getCustomSelectValue("suggestProviderSelect");
  if (suggestProviderVal) settings.suggestProvider = suggestProviderVal;

  const customProxyInput = document.getElementById("customProxyInput");
  if (customProxyInput) settings.customProxyUrl = customProxyInput.value.trim();

  const historyEnabledToggle = document.getElementById("historyEnabledToggle");
  if (historyEnabledToggle)
    settings.historyEnabled = !!historyEnabledToggle.checked;

  const showTitlesToggle = document.getElementById("showTitlesToggle");
  if (showTitlesToggle) settings.showTitles = !!showTitlesToggle.checked;

  const forceDesktopToggle = document.getElementById("forceDesktopToggle");
  if (forceDesktopToggle) settings.forceDesktop = !!forceDesktopToggle.checked;

  // 2. Synchronize through Centralized Store
  store.setState({ settings: { ...settings } });

  // 3. Isolated UI Updates (Prevents Global Layout Thrashing)
  if (
    !changedSetting ||
    changedSetting === "theme" ||
    changedSetting === "background"
  ) {
    document.body.className = settings.theme || "dark";
    materialYouEngine.triggerMaterialYou(settings, getBgFromDB);
    if (changedSetting === "theme") {
      checkMaterialYouReload();
    }
  }

  if (!changedSetting || changedSetting === "clock") {
    applyClockStyle();
    updateClock();
  }

  if (!changedSetting || changedSetting === "titles") {
    document
      .getElementById("linkGrid")
      ?.classList.toggle("show-titles", !!settings.showTitles);
  }

  if (!changedSetting || changedSetting === "forceDesktop") {
    document.body.classList.toggle(
      "force-desktop-mode",
      !!settings.forceDesktop,
    );
  }
}

function toggleSettings() {
  cancelEdit();
  renderLinkManager();
  const modal = document.getElementById("settingsModal");
  if (modal) {
    modal.classList.add("active");
    document.body.classList.add("modal-open");

    // --- FIXED: Sync Media Label & Reset Button State ---
    const bgLabel = document.getElementById("bgFileName");
    const resetBtn = document.getElementById("resetBgBtn");

    if (bgLabel) {
      if (settings.backgroundImage === "indexeddb") {
        bgLabel.innerText = "Custom Media Active";
        bgLabel.style.color = "var(--dim accent)";
        bgLabel.style.marginTop = "10px";
        if (resetBtn) resetBtn.style.display = "inline-block"; // Unhide button!
      } else {
        bgLabel.innerText = "No media selected.";
        bgLabel.style.color = "var(--dim)";
        if (resetBtn) resetBtn.style.display = "none"; // Hide button
      }
    }
  }
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove("active");
    if (!document.querySelector(".modal.active")) {
      document.body.classList.remove("modal-open");
    }
  }
}

// --- SEARCH LOGIC ---
function renderEngineDropdown() {
  const dropdown = document.getElementById("engineDropdown");
  if (!dropdown) return;
  dropdown.innerHTML = "";

  const current =
    searchEngines.find((s) => s.name === settings.searchEngine) ||
    searchEngines[0];

  // --- CHANGE 1: Update the main icon next to the search bar ---
  const iconEl = document.getElementById("currentEngineIcon");
  if (iconEl) iconEl.innerHTML = current.icon; // Changed from .innerText and .initial

  searchEngines.forEach((e) => {
    const div = document.createElement("div");
    div.className = `engine-option ${e.name === settings.searchEngine ? "selected" : ""}`;

    // --- CHANGE 2: Update the dropdown list to render the SVG ---
    div.innerHTML = `<span class="engine-icon">${e.icon}</span> <span>${e.name}</span>`;

    div.addEventListener("click", () => {
      settings.searchEngine = e.name;
      autoSaveSettings();
      renderEngineDropdown();
      toggleEngineDropdown();
    });
    dropdown.appendChild(div);
  });
}

function toggleEngineDropdown() {
  document.getElementById("engineDropdown")?.classList.toggle("hidden");
}

function handleSearch(e) {
  if (e.key === "Enter" || e.type === "click") {
    const val = document.getElementById("searchInput")?.value.trim();
    if (!val) return;
    logSearch(val, store);
    const engine =
      searchEngines.find((s) => s.name === settings.searchEngine) ||
      searchEngines[0];
    if (val.includes(".") && !val.includes(" ")) {
      const safeUrl = sanitizeUrl(val);
      if (safeUrl !== "#") window.location.href = safeUrl;
    } else {
      window.location.href = `${engine.url}${encodeURIComponent(val)}`;
    }
  }
}

function selectSuggestion(suggestion) {
  document.getElementById("searchInput").value = suggestion.name;
  if (suggestion.type === "Link") {
    const safeUrl = sanitizeUrl(suggestion.url);
    if (safeUrl !== "#") window.location.href = safeUrl;
  } else {
    document.getElementById("suggestionsContainer")?.classList.add("hidden");
    handleSearch({ key: "Enter", type: "synthetic", preventDefault: () => {} });
  }
}

// Backup & Restore
function backupData() {
  const data = { links, settings, history: searchHistory };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `0FluffStart_Backup.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function restoreData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const data = JSON.parse(event.target.result);
      const confirmed = await customConfirm(
        "Restoring from backup will overwrite all current links and settings.",
        "Restore Backup?",
      );
      if (confirmed) {
        store.setState({
          links: data.links || [],
          settings: data.settings || {},
          searchHistory: data.history || [],
        });
        showToast("Backup restored successfully", "success");
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (err) {
      showToast("Restore failed: " + err.message, "error");
    }
  };
  reader.readAsText(file);
}

// --- ASYNC DIALOG ENGINE ---
function customConfirm(message, title = "Are you sure?") {
  return new Promise((resolve) => {
    const modal = document.getElementById("customDialogModal");
    const titleEl = document.getElementById("customDialogTitle");
    const messageEl = document.getElementById("customDialogMessage");
    const cancelBtn = document.getElementById("customDialogCancelBtn");
    const confirmBtn = document.getElementById("customDialogConfirmBtn");

    if (!modal || !titleEl || !messageEl || !cancelBtn || !confirmBtn) {
      return resolve(false);
    }

    titleEl.innerText = title;
    messageEl.innerText = message;
    modal.classList.add("active");
    document.body.classList.add("modal-open");

    const cleanup = () => {
      modal.classList.remove("active");
      if (!document.querySelector(".modal.active")) {
        document.body.classList.remove("modal-open");
      }
      cancelBtn.removeEventListener("click", onCancel);
      confirmBtn.removeEventListener("click", onConfirm);
    };

    const onCancel = () => {
      cleanup();
      resolve(false);
    };

    const onConfirm = () => {
      cleanup();
      resolve(true);
    };

    cancelBtn.addEventListener("click", onCancel);
    confirmBtn.addEventListener("click", onConfirm);
  });
}

window.customConfirm = customConfirm;

// --- TOAST NOTIFICATION ENGINE ---
function showToast(message, type = "info", duration = 3000) {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("show"));

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

window.showToast = showToast;

// Global Exports
window.handleImageUpload = handleImageUpload;
window.clearBackground = clearBackground;
window.renderLinks = renderLinks;
window.renderEngineDropdown = renderEngineDropdown;
window.toggleEngineDropdown = toggleEngineDropdown;
window.openEditor = openEditor;
window.saveLink = saveLink;
window.editLink = editLink;
window.deleteLink = deleteLink;
window.toggleSettings = toggleSettings;
window.closeModal = closeModal;
window.handleSearch = handleSearch;
window.selectSuggestion = selectSuggestion;
window.cancelEdit = cancelEdit;
window.autoSaveSettings = autoSaveSettings;
window.clearHistory = clearHistory;
window.backupData = backupData;
window.restoreData = restoreData;
window.navigateToFolder = navigateToFolder;
window.addFolder = addFolder;
