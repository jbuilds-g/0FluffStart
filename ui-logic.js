/* global links:writable, settings, isEditMode, isEditingId:writable, searchEngines */
/* global renderEngineDropdown, loadSettings, updateClock, autoSaveSettings, logSearch, handleSuggestions, clearHistory */
/* global fetchExternalSuggestions, selectSuggestion, saveBgToDB, getBgFromDB */

// --- STATE ---
let currentFolderId = null;

// --- SELECTION MODE STATE ---
let isSelectionMode = false;
let selectedLinkIds = [];
let editorTargetFolderId = null; // Tracks which folder a NEW link should be saved into

// --- INIT & PWA ---
document.addEventListener("DOMContentLoaded", () => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("./sw.js")
      .catch((err) => console.log("SW Error: ", err));
  }

  bindStaticEvents();
  renderLinks();
  loadSettings();
  renderEngineDropdown();
  updateClock();
  setInterval(updateClock, 1000);

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
  if (searchInput) {
    searchInput.addEventListener("input", handleSuggestions);
    searchInput.addEventListener("keypress", handleSearch);
  }

  const githubBtn = document.getElementById("githubBtn");
  if (githubBtn)
    githubBtn.addEventListener("click", () =>
      window.open("https://github.com/jbuilds-g/0FluffStart", "_blank"),
    );

  // --- MOBILE RESPONSIVE ENGINE ---
  const mobileSearchBtn = document.getElementById("mobileSearchBtn");
  if (mobileSearchBtn && searchInput) {
    mobileSearchBtn.addEventListener("click", (e) => {
      e.preventDefault();
      searchInput.focus();
      searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
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
      links.forEach((link) => {
        if (selectedLinkIds.includes(link.id)) {
          link.parentId = activeFolderId;
        }
      });
      localStorage.setItem("0fluff_links", JSON.stringify(links));
      isSelectionMode = false;
      selectedLinkIds = [];
      activeFolderId = null;
      renderLinkManager();
      renderLinks();
    });

  // --- OPTIMIZATION 2: SELECTIVE SETTINGS TRIGGERS ---
  const userNameInput = document.getElementById("userNameInput");
  if (userNameInput)
    userNameInput.addEventListener("input", () => autoSaveSettings("username"));

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

  const externalSuggestToggle = document.getElementById(
    "externalSuggestToggle",
  );
  if (externalSuggestToggle)
    externalSuggestToggle.addEventListener("change", () =>
      autoSaveSettings("suggestions"),
    );

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

  // --- BACKGROUND & DATA BUTTONS (Safely Preserved) ---
  // --- BACKGROUND & DATA BUTTONS (Safely Preserved) ---
  const bgInput = document.getElementById("bgImageInput");
  if (bgInput)
    bgInput.addEventListener("change", () => handleImageUpload(bgInput));

  const bgUrlInput = document.getElementById("bgUrlInput");
  if (bgUrlInput) {
    const processUrlBackground = async () => {
      const url = bgUrlInput.value.trim();
      if (!url) return;
      try {
        await saveBgToDB(url);
        settings.backgroundImage = "indexeddb";
        autoSaveSettings("background");
        loadSettings();

        const bgLabel = document.getElementById("bgFileName");
        if (bgLabel) {
          bgLabel.innerText = "URL Media Active";
          bgLabel.style.color = "var(--accent)";
        }
        document.getElementById("resetBgBtn").style.display = "inline-block";
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
    resetBgBtn.addEventListener("click", () => {
      clearBackground();
      autoSaveSettings("background");
    });
  }

  const clearHistoryBtn = document.getElementById("clearHistoryBtn");
  if (clearHistoryBtn) clearHistoryBtn.addEventListener("click", clearHistory);

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
    resetSettingsBtn.addEventListener("click", () => {
      if (confirm("Are you sure? This action cannot be undone.")) {
        localStorage.removeItem("0fluff_settings");
        alert("Settings reset to default.");
        window.location.reload();
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
        window.location.href = link.url.startsWith("http")
          ? link.url
          : `https://${link.url}`;
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
  const folderName = prompt("Enter folder name:");
  if (!folderName) return;
  const newFolderId = "folder_" + Date.now().toString();

  links.push({
    id: newFolderId,
    name: folderName,
    isFolder: true,
    parentId: currentFolderId,
  });

  localStorage.setItem("0fluff_links", JSON.stringify(links));
  renderLinks();
  renderLinkManager();
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
        <span class="link-acronym" style="color: var(--accent); font-weight: 800; font-family: var(--font-main);"></span>
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

  const fragment = document.createDocumentFragment();

  // --- ICONS & SETUP ---
  const editIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`;
  const deleteIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
  const moveOutIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  const folderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 5px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
  const linkSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 5px; opacity: 0.5;"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;

  // --- ITEM BUILDER ---
  function createManagerItem(link, isSubItem = false, isSelectable = false) {
    const item = document.createElement("div");
    item.className = "link-manager-item";
    item.dataset.id = link.id;
    item.style.display = "flex";
    item.style.justifyContent = "space-between";
    item.style.alignItems = "center";
    item.style.padding = "6px 0";

    if (isSubItem) {
      item.style.marginLeft = "28px";
      item.style.borderLeft = "2px solid var(--border)";
      item.style.paddingLeft = "12px";
      item.style.marginTop = "6px";
      item.style.marginBottom = "6px";
      item.style.width = "calc(100% - 40px)";
    }

    const nameSpan = document.createElement("span");
    nameSpan.className = "link-name";
    nameSpan.style.display = "flex";
    nameSpan.style.alignItems = "center";

    let prefix = "";
    // ALWAYS show the folder toggle arrow, even in selection mode
    if (link.isFolder) {
      prefix += `<span class="folder-toggle" style="cursor:pointer; margin-right:8px; color:var(--accent); font-size:12px; width:12px; display:inline-block; text-align:center;">▶</span>`;
    }
    nameSpan.innerHTML =
      prefix + (link.isFolder ? folderSvg : linkSvg) + link.name;

    if (isSelectable) {
      const leftContainer = document.createElement("div");
      leftContainer.style.display = "flex";
      leftContainer.style.alignItems = "center";
      leftContainer.style.gap = "10px";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = selectedLinkIds.includes(link.id);
      checkbox.style.cursor = "pointer";
      checkbox.style.accentColor = "var(--accent)";

      leftContainer.appendChild(checkbox);
      leftContainer.appendChild(nameSpan);

      item.appendChild(leftContainer);
      item.style.cursor = "pointer";
      item.onclick = (e) => {
        // Prevent checking the box if they just clicked the expand/collapse arrow
        if (e.target.classList.contains("folder-toggle")) return;

        if (e.target !== checkbox) checkbox.checked = !checkbox.checked;
        toggleSelection(link.id);
      };
    } else {
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "link-actions";
      actionsDiv.style.display = "flex";
      actionsDiv.style.gap = "5px";

      if (isSubItem) {
        const moveOutBtn = document.createElement("button");
        moveOutBtn.className = "icon-btn";
        moveOutBtn.title = "Move out of folder";
        moveOutBtn.innerHTML = moveOutIconSVG;

        moveOutBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (confirm(`Move "${link.name}" back to the main dashboard?`)) {
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

  // --- RENDER LOOP ---
  // We use one unified tree loop for BOTH normal and selection mode!
  links
    .filter((l) => !l.parentId)
    .forEach((rootLink) => {
      // If we are adding items TO a folder, hide that destination folder from the list
      if (isSelectionMode && rootLink.id === activeFolderId) return;

      const row = createManagerItem(rootLink, false, isSelectionMode);
      fragment.appendChild(row);

      if (rootLink.isFolder) {
        const subContainer = document.createElement("div");
        subContainer.className = "folder-sub-container";
        subContainer.style.display = "none";
        subContainer.style.marginTop = "4px";
        subContainer.style.marginBottom = "10px";

        const toggleBtn = row.querySelector(".folder-toggle");
        if (toggleBtn) {
          toggleBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const isHidden = subContainer.style.display === "none";
            subContainer.style.display = isHidden ? "block" : "none";
            toggleBtn.innerText = isHidden ? "▼" : "▶";
          });
        }

        links
          .filter((l) => l.parentId === rootLink.id)
          .forEach((child) => {
            subContainer.appendChild(
              createManagerItem(child, true, isSelectionMode),
            );
          });

        // Only inject the "+ New Link" / "+ Existing" buttons in NORMAL mode
        if (!isSelectionMode) {
          const actionRow = document.createElement("div");
          actionRow.style.display = "flex";
          actionRow.style.gap = "10px"; /* Matched to the top buttons' gap */
          actionRow.style.marginLeft = "0";
          actionRow.style.marginTop = "10px";
          actionRow.style.width = "100%";

          const addNewBtn = document.createElement("button");
          addNewBtn.className = "add-link-btn";
          addNewBtn.style.flex = "1";
          addNewBtn.innerHTML = `+ New Link`;
          addNewBtn.onclick = () => openEditor(null, rootLink.id);

          const addExistingBtn = document.createElement("button");
          addExistingBtn.className = "add-link-btn";
          addExistingBtn.style.flex = "1";
          addExistingBtn.style.background = "var(--card-hover)";
          addExistingBtn.innerHTML = `+ Existing`;
          addExistingBtn.onclick = () => {
            isSelectionMode = true;
            activeFolderId = rootLink.id;
            selectedLinkIds = [];
            renderLinkManager();
          };

          actionRow.appendChild(addNewBtn);
          actionRow.appendChild(addExistingBtn);
          subContainer.appendChild(actionRow);
        }

        fragment.appendChild(subContainer);
      }
    });

  // Failsafe: if the user opens selection mode but there's literally nothing else to select
  if (isSelectionMode && fragment.children.length === 0) {
    const emptyMsg = document.createElement("div");
    emptyMsg.innerText = "No other links or folders available.";
    emptyMsg.style.padding = "15px";
    emptyMsg.style.color = "var(--dim)";
    emptyMsg.style.textAlign = "center";
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

  if (!name) return alert("Please fill in the name.");

  if (isEditingId) {
    const idx = links.findIndex((l) => l.id === isEditingId);
    if (idx > -1) {
      links[idx].name = name;
      if (!links[idx].isFolder) links[idx].url = url;
    }
  } else {
    if (!url) return alert("Please fill in the URL.");
    links.push({
      id: Date.now().toString(),
      name,
      url,
      isFolder: false,
      // Uses the target folder from the settings dropdown, or defaults to the dashboard folder
      parentId:
        editorTargetFolderId !== null ? editorTargetFolderId : currentFolderId,
    });
  }

  localStorage.setItem("0fluff_links", JSON.stringify(links));
  editorTargetFolderId = null; // Reset target after saving
  renderLinks();
  renderLinkManager();
  cancelEdit();
}

function editLink(id, e) {
  if (e) e.stopPropagation();
  openEditor(id, null);
}

function deleteLink(id, e) {
  if (e) e.stopPropagation();
  if (confirm("Delete this item?")) {
    links = links.filter((l) => l.id !== id && l.parentId !== id);
    localStorage.setItem("0fluff_links", JSON.stringify(links));
    if (currentFolderId === id) navigateToFolder(null);
    else renderLinks();
    renderLinkManager();
  }
}

// --- SETTINGS HELPERS ---
async function loadSettings() {
  const themeSelect = document.getElementById("themeSelect");
  if (themeSelect) themeSelect.value = settings.theme || "dark";

  const clockStyleSelect = document.getElementById("clockStyleSelect");
  if (clockStyleSelect)
    clockStyleSelect.value = settings.clockStyle || "default";

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

  const historyEnabledToggle = document.getElementById("historyEnabledToggle");
  if (historyEnabledToggle)
    historyEnabledToggle.checked = settings.historyEnabled !== false;

  const showTitlesToggle = document.getElementById("showTitlesToggle");
  if (showTitlesToggle) showTitlesToggle.checked = !!settings.showTitles;

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

        // --- PHASE 3: Route to Video or Image on page refresh ---
        // --- PHASE 3: Route to Video or Image on page refresh ---
        const isVideo =
          (bgData.type && bgData.type.startsWith("video/")) ||
          (typeof bgData === "string" &&
            bgData.match(/\.(mp4|webm|ogg)($|\?)/i));
        if (isVideo) {
          document.body.style.backgroundImage = "";
          if (bgVideo) {
            bgVideo.src = url;
            bgVideo.classList.remove("hidden");
            bgVideo
              .play()
              .catch((err) => console.warn("Playback prevented:", err));
          }
        } else {
          if (bgVideo) {
            bgVideo.src = "";
            bgVideo.classList.add("hidden");
          }
          document.body.style.backgroundImage = `url('${url}')`;
          document.body.style.backgroundSize = "cover";
          document.body.style.backgroundPosition = "center";
          document.body.style.backgroundAttachment = "fixed";
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
    document.body.style.backgroundImage = "";
    if (bgVideo) {
      bgVideo.src = "";
      bgVideo.classList.add("hidden");
    }
    if (overlay) overlay.style.opacity = "0";
  }
  updateClock();
  renderEngineDropdown();
  triggerMaterialYou();
}

// --- FIXED AUTO-SAVE WITH SELECTIVE RENDERING ---
function autoSaveSettings(changedSetting = null) {
  // 1. Core State Capture (Safely check if elements exist so we don't overwrite hidden settings)
  const themeSelect = document.getElementById("themeSelect");
  if (themeSelect) settings.theme = themeSelect.value;

  const clockStyleSelect = document.getElementById("clockStyleSelect");
  if (clockStyleSelect) settings.clockStyle = clockStyleSelect.value;

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

  const historyEnabledToggle = document.getElementById("historyEnabledToggle");
  if (historyEnabledToggle)
    settings.historyEnabled = !!historyEnabledToggle.checked;

  const showTitlesToggle = document.getElementById("showTitlesToggle");
  if (showTitlesToggle) settings.showTitles = !!showTitlesToggle.checked;

  // 2. Synchronize to LocalStorage
  localStorage.setItem("0fluff_settings", JSON.stringify(settings));

  // 3. Isolated UI Updates (Prevents Global Layout Thrashing)
  if (
    !changedSetting ||
    changedSetting === "theme" ||
    changedSetting === "background"
  ) {
    document.body.className = settings.theme || "dark";
    triggerMaterialYou();
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
}

function toggleSettings() {
  cancelEdit();
  renderLinkManager();
  const modal = document.getElementById("settingsModal");
  if (modal) {
    modal.classList.add("active");

    // --- FIXED: Sync Media Label & Reset Button State ---
    const bgLabel = document.getElementById("bgFileName");
    const resetBtn = document.getElementById("resetBgBtn");

    if (bgLabel) {
      if (settings.backgroundImage === "indexeddb") {
        bgLabel.innerText = "Custom Media Active";
        bgLabel.style.color = "var(--accent)";
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
  if (modal) modal.classList.remove("active");
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
    logSearch(val);
    const engine =
      searchEngines.find((s) => s.name === settings.searchEngine) ||
      searchEngines[0];
    if (val.includes(".") && !val.includes(" ")) {
      window.location.href = val.startsWith("http") ? val : `https://${val}`;
    } else {
      window.location.href = `${engine.url}${encodeURIComponent(val)}`;
    }
  }
}

function selectSuggestion(suggestion) {
  document.getElementById("searchInput").value = suggestion.name;
  if (suggestion.type === "Link") {
    window.location.href = suggestion.url.startsWith("http")
      ? suggestion.url
      : `https://${suggestion.url}`;
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
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (confirm("Restore from backup? This overwrites current data.")) {
        localStorage.setItem("0fluff_links", JSON.stringify(data.links || []));
        localStorage.setItem(
          "0fluff_settings",
          JSON.stringify(data.settings || {}),
        );
        localStorage.setItem(
          "0fluff_history",
          JSON.stringify(data.history || []),
        );
        window.location.reload();
      }
    } catch (err) {
      alert("Restore failed: " + err.message);
    }
  };
  reader.readAsText(file);
}

// ==========================================
// MATERIAL YOU (MONET) ENGINE
// ==========================================

// Extracts the average RGB color from an image using a 1x1 canvas
function getAverageColor(imgElement) {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(imgElement, 0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return { r, g, b };
}

// Converts RGB to HSL and returns the Hue (0-360)
function rgbToHue(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h;
  if (max === min) h = 0;
  else {
    const d = max - min;
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return Math.round(h * 360);
}

// Applies the Material You palette directly to the body
function applyMaterialYouTheme(hue) {
  const target = document.body;

  target.style.setProperty("--bg", `hsl(${hue}, 20%, 10%)`);
  target.style.setProperty("--card", `hsl(${hue}, 25%, 15%)`);
  target.style.setProperty("--card-hover", `hsl(${hue}, 30%, 20%)`);
  target.style.setProperty("--border", `hsl(${hue}, 20%, 25%)`);

  // THE FIX: Pushed saturation to 50% and dropped lightness down to 75%
  // This makes the tint much richer, darker, and more prominent!
  target.style.setProperty("--text", `hsl(${hue}, 50%, 75%)`);

  target.style.setProperty("--accent", `hsl(${hue}, 60%, 65%)`);
}

// The Trigger that starts the Engine
async function triggerMaterialYou() {
  const target = document.body;

  if (settings.theme !== "material-you") {
    target.style.removeProperty("--bg");
    target.style.removeProperty("--card");
    target.style.removeProperty("--card-hover");
    target.style.removeProperty("--border");
    target.style.removeProperty("--text");
    target.style.removeProperty("--accent");
    return;
  }

  if (settings.backgroundImage === "indexeddb") {
    try {
      let url = window.activeBgObjectUrl;
      let bgData = await getBgFromDB(); // Fetch to check file type

      if (!url && bgData) {
        url =
          bgData instanceof Blob || bgData instanceof File
            ? URL.createObjectURL(bgData)
            : bgData;
        if (bgData instanceof Blob || bgData instanceof File) {
          window.activeBgObjectUrl = url;
        }
      }

      if (url && bgData) {
        // --- Video Color Extraction ---
        const isVideo =
          (bgData.type && bgData.type.startsWith("video/")) ||
          (typeof bgData === "string" &&
            bgData.match(/\.(mp4|webm|ogg)($|\?)/i));
        if (isVideo) {
          const vid = document.createElement("video");
          vid.src = url;
          vid.muted = true;
          vid.playsInline = true;
          vid.crossOrigin = "Anonymous";

          // Wait for the video to load enough to know its length
          vid.addEventListener("loadeddata", () => {
            // Fast-forward to 1 second (or halfway if the video is super short)
            // This skips the black keyframes at the very beginning of mp4s
            vid.currentTime = Math.min(1, vid.duration / 2);
          });

          // Wait until the fast-forward is completely finished before taking the picture
          vid.addEventListener("seeked", () => {
            const canvas = document.createElement("canvas");
            canvas.width = 1;
            canvas.height = 1;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            ctx.drawImage(vid, 0, 0, 1, 1);
            const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
            const hue = rgbToHue(r, g, b);
            applyMaterialYouTheme(hue);
          });
        } else {
          // Standard Image Color Extraction
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.src = url;

          img.onload = () => {
            const { r, g, b } = getAverageColor(img);
            const hue = rgbToHue(r, g, b);
            applyMaterialYouTheme(hue);
          };
        }
      }
    } catch (e) {
      console.error("Material You engine failed:", e);
    }
  } else {
    applyMaterialYouTheme(210); // Default blue hue
  }
}

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
