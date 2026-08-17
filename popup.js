document.addEventListener("DOMContentLoaded", async () => {
  const nameInput = document.getElementById("linkName");
  const urlInput = document.getElementById("linkUrl");
  const folderSelect = document.getElementById("folderSelect");
  const newFolderInput = document.getElementById("newFolderName");
  const saveBtn = document.getElementById("saveBtn");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    const rawTitle = tab.title || "";
    nameInput.value = rawTitle.slice(0, 25);
    urlInput.value = tab.url || "";
  }

  let links = [];
  try {
    const raw = localStorage.getItem("0fluff_links");
    if (raw) links = JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load links:", e);
  }

  const folders = links.filter((l) => l.isFolder);
  folders.forEach((f) => {
    const opt = document.createElement("option");
    opt.value = f.id;
    opt.textContent = f.name;
    folderSelect.insertBefore(opt, folderSelect.lastElementChild);
  });

  folderSelect.addEventListener("change", () => {
    if (folderSelect.value === "__NEW__") {
      newFolderInput.classList.remove("hidden");
      newFolderInput.focus();
    } else {
      newFolderInput.classList.add("hidden");
    }
  });

  saveBtn.addEventListener("click", () => {
    const name = nameInput.value.trim().slice(0, 50);
    const url = urlInput.value.trim();
    if (!name || !url) return;

    let parentId = folderSelect.value;

    if (parentId === "__NEW__") {
      const newFolderName = newFolderInput.value.trim();
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

    localStorage.setItem("0fluff_links", JSON.stringify(links));
    window.close();
  });
});
