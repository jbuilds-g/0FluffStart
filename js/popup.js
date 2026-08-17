document.addEventListener("DOMContentLoaded", async () => {
  try {
    const settingsRes = await chrome.storage.local.get(["0fluff_settings"]);
    let settingsRaw =
      settingsRes["0fluff_settings"] || localStorage.getItem("0fluff_settings");
    if (settingsRaw) {
      const settings =
        typeof settingsRaw === "string" ? JSON.parse(settingsRaw) : settingsRaw;
      if (settings?.theme) {
        document.body.className = settings.theme;
        if (settings.theme === "material-you" && settings.materialYouPalette) {
          Object.entries(settings.materialYouPalette).forEach(([prop, val]) => {
            document.body.style.setProperty(prop, val);
          });
        }
      }
    }
  } catch (e) {
    console.error("Failed to load popup theme:", e);
  }

  const nameInput = document.getElementById("linkName");
  const urlInput = document.getElementById("linkUrl");
  const folderSelect = document.getElementById("folderSelect");
  const newFolderInput = document.getElementById("newFolderName");
  const saveBtn = document.getElementById("saveBtn");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    const rawTitle = tab.title || "";
    nameInput.value = rawTitle.slice(0, 50);
    urlInput.value = tab.url || "";
  }

  let links = [];
  try {
    const res = await chrome.storage.local.get(["0fluff_links"]);
    let raw = res["0fluff_links"];
    if (!raw) {
      raw = localStorage.getItem("0fluff_links");
    }
    if (raw) {
      links = typeof raw === "string" ? JSON.parse(raw) : raw;
    }
  } catch (e) {
    console.error("Failed to load links:", e);
  }

  const checkDuplicate = (urlToCheck) => {
    if (!urlToCheck) return false;
    const cleanTarget = urlToCheck
      .trim()
      .toLowerCase()
      .replace(/\/+$|^https?:\/\//, "");
    return links.some((l) => {
      if (l.isFolder || !l.url) return false;
      const cleanExisting = l.url
        .trim()
        .toLowerCase()
        .replace(/\/+$|^https?:\/\//, "");
      return cleanExisting === cleanTarget;
    });
  };

  const updateDuplicateStatus = () => {
    const isDup = checkDuplicate(urlInput.value);
    let noticeEl = document.getElementById("dupNotice");
    if (isDup) {
      if (!noticeEl) {
        noticeEl = document.createElement("div");
        noticeEl.id = "dupNotice";
        noticeEl.style.cssText =
          "color: #ff4d4d; font-size: 0.75rem; margin-top: 4px; text-align: center;";
        saveBtn.parentNode.insertBefore(noticeEl, saveBtn);
      }
      noticeEl.textContent = "⚠️ This link is already saved in your dashboard.";
    } else if (noticeEl) {
      noticeEl.remove();
    }
  };

  urlInput.addEventListener("input", updateDuplicateStatus);
  updateDuplicateStatus();

  const folderDropdown = document.getElementById("folderDropdown");
  const selectedText = folderSelect.querySelector(".selected-text");

  const buildFolderOptions = () => {
    folderDropdown.innerHTML = "";

    const rootOpt = document.createElement("div");
    rootOpt.className = "select-option selected";
    rootOpt.dataset.value = "";
    rootOpt.textContent = "Dashboard (Root)";
    folderDropdown.appendChild(rootOpt);

    const folders = links.filter((l) => l.isFolder);
    folders.forEach((f) => {
      const opt = document.createElement("div");
      opt.className = "select-option";
      opt.dataset.value = f.id;
      opt.textContent = f.name;
      folderDropdown.appendChild(opt);
    });

    const newOpt = document.createElement("div");
    newOpt.className = "select-option";
    newOpt.dataset.value = "__NEW__";
    newOpt.textContent = "+ Create New Folder";
    folderDropdown.appendChild(newOpt);
  };

  buildFolderOptions();

  folderSelect
    .querySelector(".select-trigger")
    .addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = folderSelect.classList.contains("open");
      folderSelect.classList.toggle("open", !isOpen);
      folderDropdown.classList.toggle("hidden", isOpen);
    });

  document.addEventListener("click", () => {
    folderSelect.classList.remove("open");
    folderDropdown.classList.add("hidden");
  });

  folderDropdown.addEventListener("click", (e) => {
    const option = e.target.closest(".select-option");
    if (!option) return;

    const val = option.dataset.value;
    folderSelect.dataset.value = val;
    selectedText.textContent = option.textContent;

    folderDropdown.querySelectorAll(".select-option").forEach((opt) => {
      opt.classList.toggle("selected", opt === option);
    });

    folderSelect.classList.remove("open");
    folderDropdown.classList.add("hidden");

    if (val === "__NEW__") {
      newFolderInput.classList.remove("hidden");
      newFolderInput.focus();
    } else {
      newFolderInput.classList.add("hidden");
    }
  });

  saveBtn.addEventListener("click", async () => {
    const name = nameInput.value.trim().slice(0, 50);
    const url = urlInput.value.trim();
    if (!name || !url) return;

    let parentId = folderSelect.dataset.value || null;

    if (parentId === "__NEW__") {
      const newFolderName = newFolderInput.value.trim().slice(0, 50);
      if (!newFolderName) return;
      const newFolderId = "f_" + Date.now();
      links.push({
        id: newFolderId,
        name: newFolderName,
        isFolder: true,
        parentId: null,
      });
      parentId = newFolderId;
    } else if (!parentId) {
      parentId = null;
    }

    links.push({
      id: "l_" + Date.now(),
      name,
      url,
      isFolder: false,
      parentId,
    });

    const serialized = JSON.stringify(links);
    try {
      await chrome.storage.local.set({ "0fluff_links": serialized });
    } catch (e) {
      console.warn(
        "Chrome storage set failed, falling back to localStorage:",
        e,
      );
    }
    try {
      localStorage.setItem("0fluff_links", serialized);
    } catch (e) {
      console.warn("LocalStorage set failed:", e);
    }
    window.close();
  });
});
