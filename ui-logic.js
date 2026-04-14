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
  searchInput.addEventListener("input", handleSuggestions);
  searchInput.addEventListener("keypress", handleSearch);

  document
    .getElementById("githubBtn")
    .addEventListener("click", () =>
      window.open("https://github.com/jbuilds-g/0FluffStart", "_blank"),
    );

  // Default "Add Link" button on main settings screen uses the current dashboard folder
  document
    .getElementById("addLinkBtn")
    .addEventListener("click", () => openEditor(null, currentFolderId));
  const addFolderBtn = document.getElementById("addFolderBtn");
  if (addFolderBtn) addFolderBtn.addEventListener("click", addFolder);

  const activeFolderHeader = document.getElementById("activeFolderHeader");
  if (activeFolderHeader)
    activeFolderHeader.addEventListener("click", () => navigateToFolder(null));

  document.getElementById("saveLinkBtn").addEventListener("click", saveLink);
  document
    .getElementById("cancelEditBtn")
    .addEventListener("click", cancelEdit);

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

  document
    .getElementById("userNameInput")
    .addEventListener("input", autoSaveSettings);
  document
    .getElementById("themeSelect")
    .addEventListener("change", autoSaveSettings);
  document
    .getElementById("clockStyleSelect")
    .addEventListener("change", autoSaveSettings);

  const showTitlesToggle = document.getElementById("showTitlesToggle");
  if (showTitlesToggle)
    showTitlesToggle.addEventListener("change", autoSaveSettings);

  const bgInput = document.getElementById("bgImageInput");
  bgInput.addEventListener("change", () => handleImageUpload(bgInput));
  document
    .getElementById("resetBgBtn")
    .addEventListener("click", clearBackground);

  document
    .getElementById("externalSuggestToggle")
    .addEventListener("change", autoSaveSettings);
  document
    .getElementById("historyEnabledToggle")
    .addEventListener("change", autoSaveSettings);
  document
    .getElementById("clearHistoryBtn")
    .addEventListener("click", clearHistory);

  document
    .getElementById("backupDataBtn")
    .addEventListener("click", backupData);
  document
    .getElementById("restoreDataBtn")
    .addEventListener("click", () =>
      document.getElementById("restoreInput").click(),
    );
  document
    .getElementById("restoreInput")
    .addEventListener("change", restoreData);

  document.querySelectorAll(".clock-radio").forEach((radio) => {
    radio.addEventListener("change", autoSaveSettings);
  });

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

  document.getElementById("resetSettingsBtn").addEventListener("click", () => {
    const warning = "Are you sure? This action cannot be undone.";
    if (confirm(warning)) {
      localStorage.removeItem("0fluff_settings");
      alert("Settings reset to default.");
      window.location.reload();
    }
  });
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
    const item = document.createElement("div");
    item.className = "link-item";
    item.dataset.id = link.id;

    if (link.isFolder) {
      item.classList.add("is-folder");
      item.innerHTML = `
                <div class="link-icon-circle">
                    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    </svg>
                </div>
                <div class="link-name">${link.name}</div>
            `;
      item.addEventListener("click", () => navigateToFolder(link.id));
    } else {
      const words = link.name.split(" ").filter((w) => w.length > 0);
      let acronym = words.map((word) => word.charAt(0).toUpperCase()).join("");
      if (words.length === 1 && acronym.length === 1 && link.name.length > 1)
        acronym = link.name.substring(0, 2).toUpperCase();
      const display = acronym.substring(0, 3);

      let fontSize =
        display.length === 1
          ? "2rem"
          : display.length === 2
            ? "1.6rem"
            : "1.2rem";

      item.innerHTML = `
                <div class="link-icon-circle">
                    <span style="font-size: ${fontSize}; color: var(--accent); font-weight: 800; font-family: var(--font-main);">${display}</span>
                </div>
                <div class="link-name">${link.name}</div>
            `;
      item.addEventListener("click", () => {
        window.location.href = link.url.startsWith("http")
          ? link.url
          : `https://${link.url}`;
      });
    }

    item.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      toggleSettings();
      editLink(link.id);
    });

    fragment.appendChild(item);
  });

  grid.appendChild(fragment);
}

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
          actionRow.style.gap = "8px";
          actionRow.style.marginLeft = "28px";
          actionRow.style.marginTop = "5px";
          actionRow.style.width = "calc(100% - 40px)";

          const addNewBtn = document.createElement("button");
          addNewBtn.className = "add-link-btn";
          addNewBtn.style.flex = "1";
          addNewBtn.style.background = "var(--card-hover)";
          addNewBtn.style.border = "1px solid var(--border)";
          addNewBtn.style.padding = "8px";
          addNewBtn.style.color = "var(--text)";
          addNewBtn.style.fontSize = "0.85rem";
          addNewBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right:4px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> New Link`;
          addNewBtn.onclick = () => openEditor(null, rootLink.id);

          const addExistingBtn = document.createElement("button");
          addExistingBtn.className = "add-link-btn";
          addExistingBtn.style.flex = "1";
          addExistingBtn.style.background = "var(--card-hover)";
          addExistingBtn.style.border = "1px dashed var(--border)";
          addExistingBtn.style.padding = "8px";
          addExistingBtn.style.color = "var(--accent)";
          addExistingBtn.style.fontSize = "0.85rem";
          addExistingBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right:4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> Existing`;
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

  document.body.className = settings.theme || "dark";
  applyClockStyle();

  const overlay = document.getElementById("bgOverlay");
  if (settings.backgroundImage === "indexeddb") {
    try {
      const bgData = await getBgFromDB();
      if (bgData) {
        const url =
          bgData instanceof Blob || bgData instanceof File
            ? URL.createObjectURL(bgData)
            : bgData;
        document.body.style.backgroundImage = `url('${url}')`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundAttachment = "fixed";
        if (overlay) overlay.style.opacity = "1";
      }
    } catch (e) {
      console.error("Background load fail:", e);
    }
  } else {
    document.body.style.backgroundImage = "";
    if (overlay) overlay.style.opacity = "0";
  }
  updateClock();
  renderEngineDropdown();
}

function autoSaveSettings() {
  settings.theme = document.getElementById("themeSelect")?.value || "dark";
  settings.clockStyle =
    document.getElementById("clockStyleSelect")?.value || "default";
  settings.userName =
    document.getElementById("userNameInput")?.value.trim() || "";

  const radios = document.getElementsByName("clockFormat");
  for (let r of radios) if (r.checked) settings.clockFormat = r.value;

  settings.externalSuggest = !!document.getElementById("externalSuggestToggle")
    ?.checked;
  settings.historyEnabled = !!document.getElementById("historyEnabledToggle")
    ?.checked;
  settings.showTitles = !!document.getElementById("showTitlesToggle")?.checked;

  localStorage.setItem("0fluff_settings", JSON.stringify(settings));
  document.body.className = settings.theme;
  applyClockStyle();
  document
    .getElementById("linkGrid")
    ?.classList.toggle("show-titles", settings.showTitles);
}

function toggleSettings() {
  cancelEdit();
  renderLinkManager();
  const modal = document.getElementById("settingsModal");
  if (modal) {
    modal.classList.add("active");

    // --- NEW: Sync Wallpaper Label State ---
    const bgLabel = document.getElementById("bgFileName");
    if (bgLabel) {
      if (settings.backgroundImage === "indexeddb") {
        bgLabel.innerText = "Custom Image Active";
        bgLabel.style.color = "var(--accent)";
      } else {
        bgLabel.innerText = "No image selected.";
        bgLabel.style.color = "var(--dim)";
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
