// ui-logic.js

/* global links:writable, settings, isEditMode, isEditingId:writable, searchEngines */
/* global renderEngineDropdown, loadSettings, updateClock, autoSaveSettings, logSearch, handleSuggestions, clearHistory */
/* global fetchExternalSuggestions, selectSuggestion, saveBgToDB, getBgFromDB */

// --- STATE ---
let currentFolderId = null;
let draggedItemId = null; // NEW: Tracks the ID of the item being moved

// --- INIT ---
document.addEventListener("DOMContentLoaded", () => {
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

// --- CSP EVENT BINDING ---
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

  document
    .getElementById("addLinkBtn")
    .addEventListener("click", () => openEditor());
  const addFolderBtn = document.getElementById("addFolderBtn");
  if (addFolderBtn) addFolderBtn.addEventListener("click", addFolder);

  const activeFolderHeader = document.getElementById("activeFolderHeader");
  if (activeFolderHeader)
    activeFolderHeader.addEventListener("click", () => navigateToFolder(null));

  document.getElementById("saveLinkBtn").addEventListener("click", saveLink);
  document
    .getElementById("cancelEditBtn")
    .addEventListener("click", cancelEdit);

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
      const textEl = btn.parentElement.nextElementSibling;
      if (textEl && textEl.classList.contains("help-text")) {
        textEl.classList.toggle("show");
        btn.classList.toggle("active");
      }
    });
  });

  document.getElementById("resetSettingsBtn").addEventListener("click", () => {
    const warning =
      "Are you sure? This is going to delete all your preferences in settings. This action cannot be undone.";
    if (confirm(warning)) {
      localStorage.removeItem("0fluff_settings");
      alert("Settings have been reset to default.");
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

// --- LINKS RENDERING & DRAG EVENTS ---
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

    // NEW: Make items draggable
    item.draggable = true;
    setupDragEvents(item);

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

  // Add "+" tile inside folders
  if (currentFolderId) {
    const addBtnItem = document.createElement("div");
    addBtnItem.className = "link-item add-btn-item";
    addBtnItem.innerHTML = `
            <div class="link-icon-circle" style="border: 2px dashed var(--dim);">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--dim)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </div>
            <div class="link-name" style="color: var(--dim);">Add Link</div>
        `;
    addBtnItem.addEventListener("click", () => {
      toggleSettings();
      openEditor();
    });
    fragment.appendChild(addBtnItem);
  }

  grid.appendChild(fragment);
}

// --- NEW: DRAG AND DROP ENGINE ---
function setupDragEvents(el) {
  el.addEventListener("dragstart", (e) => {
    draggedItemId = el.dataset.id;
    el.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
  });

  el.addEventListener("dragend", () => {
    el.classList.remove("dragging");
    document
      .querySelectorAll(".drag-over")
      .forEach((item) => item.classList.remove("drag-over"));
    draggedItemId = null;
  });

  el.addEventListener("dragover", (e) => {
    e.preventDefault(); // Required to allow drop
    const target = e.target.closest(".link-item");

    // Only show "glow" if we are hovering a folder that ISN'T the thing we are dragging
    if (
      target &&
      target.classList.contains("is-folder") &&
      target.dataset.id !== draggedItemId
    ) {
      target.classList.add("drag-over");
    }
  });

  el.addEventListener("dragleave", (e) => {
    const target = e.target.closest(".link-item");
    if (target) target.classList.remove("drag-over");
  });

  el.addEventListener("drop", (e) => {
    e.preventDefault();
    const target = e.target.closest(".link-item");
    if (target && target.classList.contains("is-folder") && draggedItemId) {
      moveItemToFolder(draggedItemId, target.dataset.id);
    }
  });
}

function moveItemToFolder(itemId, folderId) {
  if (itemId === folderId) return;

  const itemIndex = links.findIndex((l) => l.id === itemId);
  if (itemIndex > -1) {
    links[itemIndex].parentId = folderId; // Update parent reference
    localStorage.setItem("0fluff_links", JSON.stringify(links));
    renderLinks();
  }
}

// --- LINK MANAGEMENT ---
function renderLinkManager() {
  const linkManagerContent = document.getElementById("linkManagerContent");
  if (!linkManagerContent) return;
  linkManagerContent.innerHTML = "";

  if (links.length === 0) {
    linkManagerContent.innerHTML =
      '<div style="color:var(--dim); text-align:center; padding:10px;">No links yet.</div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  const editIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`;
  const deleteIconSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

  links.forEach((link) => {
    const item = document.createElement("div");
    item.className = "link-manager-item";

    const nameSpan = document.createElement("span");
    nameSpan.className = "link-name";
    const folderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 5px;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
    nameSpan.innerHTML = (link.isFolder ? folderSvg : "") + link.name;

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "link-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "icon-btn secondary";
    editBtn.innerHTML = editIconSVG;
    editBtn.addEventListener("click", (e) => editLink(link.id, e));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "icon-btn delete-btn";
    deleteBtn.innerHTML = deleteIconSVG;
    deleteBtn.addEventListener("click", (e) => deleteLink(link.id, e));

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(deleteBtn);
    item.appendChild(nameSpan);
    item.appendChild(actionsDiv);
    fragment.appendChild(item);
  });
  linkManagerContent.appendChild(fragment);
}

function openEditor(id = null) {
  const linkListContainer = document.getElementById("linkListContainer");
  const linkEditorContainer = document.getElementById("linkEditorContainer");
  if (linkListContainer) linkListContainer.classList.add("hidden");
  if (linkEditorContainer) linkEditorContainer.classList.remove("hidden");

  const titleEl = document.getElementById("editorTitle");
  const nameInput = document.getElementById("editName");
  const urlInput = document.getElementById("editUrl");

  isEditingId = id;
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
      parentId: currentFolderId,
    });
  }
  localStorage.setItem("0fluff_links", JSON.stringify(links));
  renderLinks();
  renderLinkManager();
  cancelEdit();
}

function editLink(id, e) {
  if (e) e.stopPropagation();
  openEditor(id);
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
}

function toggleSettings() {
  cancelEdit();
  renderLinkManager();
  const modal = document.getElementById("settingsModal");
  if (modal) modal.classList.add("active");
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
  const iconEl = document.getElementById("currentEngineIcon");
  if (iconEl) iconEl.innerText = current.initial;

  searchEngines.forEach((e) => {
    const div = document.createElement("div");
    div.className = `engine-option ${e.name === settings.searchEngine ? "selected" : ""}`;
    div.innerHTML = `<span>${e.name}</span> <span>${e.initial}</span>`;
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
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .catch((err) => console.log("SW Registration failed: ", err));
  });
}
