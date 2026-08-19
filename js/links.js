import { store } from "./store.js";
import { generateId, sanitizeUrl } from "./utils.js";
import { customConfirm, showToast, loadInlineIcons } from "./ui.js";

const folderTemplate = document.createElement("div");
folderTemplate.className = "link-item is-folder";
folderTemplate.innerHTML = `
    <div class="link-icon-circle">
        <span class="inline-icon" data-icon="folder" style="width:26px; height:26px;"></span>
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

export function navigateToFolder(folderId) {
  store.setState({ currentFolderId: folderId });
  const header = document.getElementById("activeFolderHeader");
  if (header) {
    if (folderId) header.classList.remove("hidden");
    else header.classList.add("hidden");
  }
  renderLinks();
}

export function renderLinks() {
  const grid = document.getElementById("linkGrid");
  if (!grid) return;

  const state = store.getState();
  const links = state.links || [];
  const settings = state.settings || {};
  const currentFolderId = state.currentFolderId;

  grid.classList.toggle("show-titles", !!settings.showTitles);

  const visibleLinks = links.filter(
    (l) => (l.parentId || null) === currentFolderId,
  );
  const targetIds = new Set(visibleLinks.map((l) => l.id));
  const existingNodesMap = new Map();

  Array.from(grid.children).forEach((child) => {
    if (child.classList.contains("link-item") && child.dataset.id) {
      if (!targetIds.has(child.dataset.id)) {
        child.remove();
      } else {
        existingNodesMap.set(child.dataset.id, child);
      }
    } else if (!child.classList.contains("folder-exit-container")) {
      child.remove();
    }
  });

  visibleLinks.forEach((link, index) => {
    let item = existingNodesMap.get(link.id);

    if (!item) {
      item = link.isFolder
        ? folderTemplate.cloneNode(true)
        : linkTemplate.cloneNode(true);
      item.dataset.id = link.id;
    }

    const nameEl = item.querySelector(".link-name");
    if (nameEl && nameEl.textContent !== link.name) {
      nameEl.textContent = link.name;
    }

    if (!link.isFolder) {
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
      if (span) {
        if (span.textContent !== display) span.textContent = display;
        if (span.style.fontSize !== fontSize) span.style.fontSize = fontSize;
      }
    }

    const currentChildAtIndex = grid.children[index];
    if (currentChildAtIndex !== item) {
      grid.insertBefore(item, currentChildAtIndex || null);
    }
  });

  let exitContainer = grid.querySelector(".folder-exit-container");
  if (currentFolderId !== null) {
    if (!exitContainer) {
      exitContainer = document.createElement("div");
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
    } else {
      grid.appendChild(exitContainer);
    }
  } else if (exitContainer) {
    exitContainer.remove();
  }

  loadInlineIcons(grid);
}

export function toggleSelection(id) {
  const state = store.getState();
  const selectedLinkIds = [...(state.selectedLinkIds || [])];
  const index = selectedLinkIds.indexOf(id);

  if (index > -1) {
    selectedLinkIds.splice(index, 1);
  } else {
    selectedLinkIds.push(id);
  }

  store.setState({ selectedLinkIds });
  renderLinkManager();
}

/**
 * Renders the link manager UI using targeted DOM updates.
 */
export function renderLinkManager() {
  const linkManagerContent = document.getElementById("linkManagerContent");
  if (!linkManagerContent) return;

  const state = store.getState();
  const links = state.links || [];
  const isSelectionMode = state.isSelectionMode;
  const selectedLinkIds = state.selectedLinkIds || [];
  const activeFolderId = state.activeFolderId;
  const expandedFolderIds = new Set(state.expandedFolderIds || []);

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

  const editIconSVG = `<span class="inline-icon" data-icon="edit"></span>`;
  const deleteIconSVG = `<span class="inline-icon" data-icon="delete"></span>`;
  const moveOutIconSVG = `<span class="inline-icon" data-icon="close" style="color:var(--delete);"></span>`;
  const folderSvg = `<span class="inline-icon manager-item-icon" data-icon="folder" style="width:14px; height:14px;"></span>`;
  const linkSvg = `<span class="inline-icon manager-item-icon link-type" data-icon="link" style="width:14px; height:14px;"></span>`;

  /**
   * Creates a manager item DOM node.
   * @param {import("./store.js").Link} link
   * @param {number} level
   * @param {boolean} isSelectable
   * @returns {HTMLElement}
   */
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
      toggleSpan.innerHTML = `<span class="inline-icon" data-icon="chevron" style="width:12px; height:12px;"></span>`;
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
            const currentLinks = [...store.getState().links];
            const idx = currentLinks.findIndex((l) => l.id === link.id);
            if (idx > -1) {
              const [movedItem] = currentLinks.splice(idx, 1);
              movedItem.parentId = null;
              currentLinks.push(movedItem);
              store.setState({ links: currentLinks });
              renderLinks();
              renderLinkManager();
            }
          }
        });
        actionsDiv.appendChild(moveOutBtn);
      }

      const dragHandle = document.createElement("span");
      dragHandle.className = "drag-handle";
      dragHandle.title = "Drag to reorder";
      dragHandle.textContent = "::";

      dragHandle.onpointerdown = (e) => {
        e.stopPropagation();
        item.classList.add("dragging");
        dragHandle.setPointerCapture(e.pointerId);

        let currentTarget = null;

        dragHandle.onpointermove = (pe) => {
          pe.preventDefault();
          item.style.pointerEvents = "none";
          const targetEl = document
            .elementFromPoint(pe.clientX, pe.clientY)
            ?.closest(".link-manager-item");
          document
            .querySelectorAll(
              ".link-manager-item.drag-over-item, .link-manager-item.drag-over-folder",
            )
            .forEach((el) => {
              el.classList.remove("drag-over-item", "drag-over-folder");
            });

          if (targetEl && targetEl !== item) {
            const targetId = targetEl.dataset.id;
            const targetLink = links.find((l) => l.id === targetId);
            if (targetLink?.isFolder) {
              targetEl.classList.add("drag-over-folder");
            } else {
              targetEl.classList.add("drag-over-item");
            }
            currentTarget = targetEl;
          } else {
            currentTarget = null;
          }
        };

        dragHandle.onpointerup = async (pe) => {
          dragHandle.releasePointerCapture(pe.pointerId);
          dragHandle.onpointermove = null;
          dragHandle.onpointerup = null;
          item.style.pointerEvents = "";
          item.classList.remove("dragging");
          document
            .querySelectorAll(
              ".link-manager-item.drag-over-item, .link-manager-item.drag-over-folder",
            )
            .forEach((el) => {
              el.classList.remove("drag-over-item", "drag-over-folder");
            });

          if (!currentTarget) return;
          const targetId = currentTarget.dataset.id;
          const currentLinks = [...store.getState().links];
          const draggedIdx = currentLinks.findIndex((l) => l.id === link.id);
          const targetIdx = currentLinks.findIndex((l) => l.id === targetId);
          if (draggedIdx === -1 || targetIdx === -1) return;

          const targetLink = currentLinks[targetIdx];
          if (targetLink.isFolder && !link.isFolder) {
            currentLinks[draggedIdx].parentId = targetLink.id;
          } else {
            const [moved] = currentLinks.splice(draggedIdx, 1);
            currentLinks.splice(targetIdx, 0, moved);
          }

          await store.setState({ links: currentLinks });
          renderLinks();
          renderLinkManager();
        };
      };

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

      actionsDiv.appendChild(dragHandle);
      actionsDiv.appendChild(editBtn);
      actionsDiv.appendChild(deleteBtn);

      item.appendChild(nameSpan);
      item.appendChild(actionsDiv);
    }

    return item;
  }

  /**
   * Recursively builds tree nodes for link manager.
   * @param {string|null} parentId
   * @param {number} level
   * @returns {DocumentFragment}
   */
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
        subContainer.dataset.folderId = link.id;
        const isExpanded = expandedFolderIds.has(link.id);
        subContainer.style.display = isExpanded ? "block" : "none";
        subContainer.style.marginTop = "4px";
        subContainer.style.marginBottom = "10px";

        const toggleBtn = row.querySelector(".folder-toggle");
        if (toggleBtn) {
          toggleBtn.classList.toggle("expanded", isExpanded);
          row.addEventListener("click", (e) => {
            if (e.target.closest(".link-actions")) return;
            const currentExp = new Set(
              store.getState().expandedFolderIds || [],
            );
            const isHidden = subContainer.style.display === "none";
            if (isHidden) {
              subContainer.style.display = "block";
              currentExp.add(link.id);
              toggleBtn.classList.add("expanded");
            } else {
              subContainer.style.display = "none";
              currentExp.delete(link.id);
              toggleBtn.classList.remove("expanded");
            }
            store.setState({ expandedFolderIds: Array.from(currentExp) });
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
            store.setState({
              isSelectionMode: true,
              activeFolderId: link.id,
              selectedLinkIds: [],
            });
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

  const newFragment = buildFolderNodes(null, 0);

  if (isSelectionMode && newFragment.children.length === 0) {
    const emptyMsg = document.createElement("div");
    emptyMsg.innerText = "No other links or folders available.";
    emptyMsg.className = "empty-manager-msg";
    newFragment.appendChild(emptyMsg);
  }

  linkManagerContent.innerHTML = "";
  linkManagerContent.appendChild(newFragment);
  loadInlineIcons(linkManagerContent);
}

/**
 * Opens the link or folder editor interface.
 * @param {string|null} id
 * @param {string|null} parentId
 */
export function openEditor(id = null, parentId = null) {
  const linkListContainer = document.getElementById("linkListContainer");
  const linkEditorContainer = document.getElementById("linkEditorContainer");

  if (linkListContainer) linkListContainer.classList.add("hidden");
  if (linkEditorContainer) linkEditorContainer.classList.remove("hidden");

  const titleEl = document.getElementById("editorTitle");
  const nameInput = document.getElementById("editName");
  const urlInput = document.getElementById("editUrl");

  const state = store.getState();
  const links = state.links || [];
  const currentFolderId = state.currentFolderId;

  store.setState({
    isEditingId: id,
    isCreatingFolder: false,
    editorTargetFolderId: parentId !== null ? parentId : currentFolderId,
  });

  if (id) {
    const link = links.find((l) => l.id === id);
    if (link) {
      if (titleEl)
        titleEl.innerText = link.isFolder ? "Edit Folder" : "Edit Link";
      if (nameInput) nameInput.value = link.name;

      if (link.isFolder) {
        if (urlInput) {
          urlInput.classList.add("field-hidden");
          urlInput.value = "";
        }
      } else {
        if (urlInput) {
          urlInput.classList.remove("field-hidden");
          urlInput.value = link.url || "";
        }
      }
    }
  } else {
    if (titleEl) titleEl.innerText = "Add New Link";
    if (nameInput) nameInput.value = "";
    if (urlInput) {
      urlInput.classList.remove("field-hidden");
      urlInput.value = "";
    }
  }
}

export function cancelEdit() {
  document.getElementById("linkEditorContainer")?.classList.add("hidden");
  document.getElementById("linkListContainer")?.classList.remove("hidden");
  store.setState({ isEditingId: null, editorTargetFolderId: null });
}

/**
 * Saves a link or folder entry to store state based on form inputs.
 */
export async function saveLink() {
  const nameInput = document.getElementById("editName");
  const urlInput = document.getElementById("editUrl");
  const name = nameInput ? nameInput.value.trim().slice(0, 50) : "";
  const url = urlInput ? urlInput.value.trim() : "";

  if (!name) return showToast("Please fill in the name.", "error");

  const state = store.getState();
  const currentLinks = [...(state.links || [])];
  const isEditingId = state.isEditingId;
  const isCreatingFolder = state.isCreatingFolder;
  const targetFolderId =
    state.editorTargetFolderId !== null
      ? state.editorTargetFolderId
      : state.currentFolderId;

  if (isEditingId) {
    const idx = currentLinks.findIndex((l) => l.id === isEditingId);
    if (idx > -1) {
      currentLinks[idx].name = name;
      if (!currentLinks[idx].isFolder) currentLinks[idx].url = url;
    }
    await store.setState({ links: currentLinks, isCreatingFolder: false });
    showToast(
      currentLinks[idx]?.isFolder ? "Folder updated" : "Link updated",
      "success",
    );
  } else {
    if (isCreatingFolder) {
      currentLinks.push({
        id: generateId(),
        name,
        isFolder: true,
        parentId: targetFolderId,
      });
      await store.setState({ links: currentLinks, isCreatingFolder: false });
      showToast("Folder created successfully", "success");
    } else {
      if (!url) return showToast("Please fill in the URL.", "error");
      currentLinks.push({
        id: generateId(),
        name,
        url,
        isFolder: false,
        parentId: targetFolderId,
      });
      await store.setState({ links: currentLinks, isCreatingFolder: false });
      showToast("Link added successfully", "success");
    }
  }

  renderLinks();
  renderLinkManager();
  cancelEdit();
}

export function editLink(id, e) {
  if (e) e.stopPropagation();
  openEditor(id, null);
}

export async function deleteLink(id, e) {
  if (e) e.stopPropagation();
  const confirmed = await customConfirm(
    "This item and its contents will be permanently deleted.",
    "Delete Item?",
  );
  if (confirmed) {
    const updatedLinks = store
      .getState()
      .links.filter((l) => l.id !== id && l.parentId !== id);
    await store.setState({ links: updatedLinks });

    if (store.getState().currentFolderId === id) navigateToFolder(null);
    renderLinks();
    renderLinkManager();
    showToast("Item deleted", "info");
  }
}

/**
 * Prepares the editor to create a new folder.
 */
export function addFolder() {
  const linkListContainer = document.getElementById("linkListContainer");
  const linkEditorContainer = document.getElementById("linkEditorContainer");

  if (linkListContainer) linkListContainer.classList.add("hidden");
  if (linkEditorContainer) linkEditorContainer.classList.remove("hidden");

  const titleEl = document.getElementById("editorTitle");
  const nameInput = document.getElementById("editName");
  const urlInput = document.getElementById("editUrl");

  store.setState({
    isEditingId: null,
    isCreatingFolder: true,
    editorTargetFolderId: store.getState().currentFolderId,
  });

  if (titleEl) titleEl.innerText = "Add New Folder";
  if (nameInput) nameInput.value = "";
  if (urlInput) {
    urlInput.value = "";
    urlInput.classList.add("field-hidden");
  }
}
