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

export function getFolderDepth(folderId, links) {
  let depth = 0;
  let currId = folderId;
  while (currId) {
    depth++;
    const parent = links.find((l) => l.id === currId);
    currId = parent ? parent.parentId : null;
  }
  return depth;
}

export function navigateToFolder(folderId) {
  const state = store.getState();
  const links = state.links || [];
  let currentStack = state.folderStack || [];

  if (folderId === null) {
    currentStack = [];
  } else {
    const existingIndex = currentStack.findIndex(
      (step) => step.id === folderId,
    );
    if (existingIndex !== -1) {
      currentStack = currentStack.slice(0, existingIndex + 1);
    } else {
      const folderNode = links.find((l) => l.id === folderId);
      const name = folderNode ? folderNode.name : "Folder";
      currentStack = [...currentStack, { id: folderId, name }];
    }
  }

  store.setState({
    currentFolderId: folderId,
    folderStack: currentStack,
    currentPage: 0,
  });

  const header = document.getElementById("activeFolderHeader");
  if (header) {
    if (folderId) header.classList.remove("hidden");
    else header.classList.add("hidden");
  }

  const folderExitBtn = document.getElementById("folderExitBtn");
  if (folderExitBtn) {
    if (currentStack.length > 0) {
      folderExitBtn.classList.remove("hidden");
    } else {
      folderExitBtn.classList.add("hidden");
    }
  }

  renderLinks();
}

export function navigateUp() {
  const state = store.getState();
  const stack = state.folderStack || [];
  if (stack.length <= 1) {
    navigateToFolder(null);
  } else {
    const parentFolder = stack[stack.length - 2];
    navigateToFolder(parentFolder.id);
  }
}

window.exitFolder = () => navigateToFolder(null);

export function renderLinks() {
  const grid = document.getElementById("linkGrid");
  if (!grid) return;

  const state = store.getState();
  let links = [...(state.links || [])];
  let migrated = false;

  links = links.map((item) => {
    if (item.parentId && getFolderDepth(item.id, links) > 3) {
      let targetId = item.parentId;
      while (targetId && getFolderDepth(targetId, links) >= 3) {
        const parentNode = links.find((l) => l.id === targetId);
        targetId = parentNode ? parentNode.parentId : null;
      }
      migrated = true;
      return { ...item, parentId: targetId };
    }
    return item;
  });

  if (migrated) {
    store.setState({ links });
    showToast("Nested folders clamped to 3 levels max.", "info");
  }

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

  // Remove any legacy exit containers left inside the scroll grid
  grid.querySelector(".folder-exit-container")?.remove();

  // Cleanup obsolete body elements & duplicate footer nav containers
  document.getElementById("sideExitContainer")?.remove();
  document.querySelectorAll(".side-page-arrow").forEach((el) => el.remove());
  document
    .querySelectorAll(".dashboard-footer-nav")
    .forEach((el) => el.remove());

  let footerNav = document.createElement("div");
  footerNav.id = "dashboardFooterNav";
  footerNav.className = "dashboard-footer-nav";
  document.body.appendChild(footerNav);

  footerNav.innerHTML = "";

  // Render Pinned Floating Exit Controls (Direct Body Child)
  if (currentFolderId !== null) {
    const isNested = (state.folderStack || []).length > 1;
    const exitContainer = document.createElement("div");
    exitContainer.className = "folder-exit-container";
    exitContainer.innerHTML = `
      <div class="back-pill" title="Return to Main Dashboard">
        <div class="back-icon-circle">
          <span class="inline-icon" data-icon="back" style="width:16px; height:16px;"></span>
        </div>
        <span class="back-text">Dashboard</span>
      </div>
      ${
        isNested
          ? `<button class="back-pill-sub" title="Back to Previous Folder">
              <span class="inline-icon icon-chevron" data-icon="chevron" style="width:18px; height:18px; transform: rotate(180deg);"></span>
            </button>`
          : ""
      }
    `;

    const homeBtn = exitContainer.querySelector(".back-pill");
    homeBtn.addEventListener("click", () => navigateToFolder(null));

    const subBtn = exitContainer.querySelector(".back-pill-sub");
    if (subBtn) {
      subBtn.addEventListener("click", () => navigateUp());
    }

    footerNav.appendChild(exitContainer);
    loadInlineIcons(footerNav);
  }

  if (!grid.dataset.scrollBound) {
    grid.dataset.scrollBound = "true";
    grid.addEventListener("wheel", (e) => {
      const stateNow = store.getState();
      const allLinks = (stateNow.links || []).filter(
        (l) => (l.parentId || null) === stateNow.currentFolderId,
      );
      const total = Math.ceil(allLinks.length / 12) || 1;
      if (total <= 1) return;

      if (e.deltaY > 0 || e.deltaX > 0) {
        const nextPage = Math.min((stateNow.currentPage || 0) + 1, total - 1);
        if (nextPage !== stateNow.currentPage) {
          store.setState({ currentPage: nextPage });
          renderLinks();
        }
      } else if (e.deltaY < 0 || e.deltaX < 0) {
        const prevPage = Math.max((stateNow.currentPage || 0) - 1, 0);
        if (prevPage !== stateNow.currentPage) {
          store.setState({ currentPage: prevPage });
          renderLinks();
        }
      }
    });
  }

  loadInlineIcons(grid);
  loadInlineIcons(footerNav);
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

      checkbox.onclick = (e) => {
        e.stopPropagation();
      };

      checkbox.onchange = () => {
        toggleSelection(link.id);
      };

      leftContainer.appendChild(checkbox);
      leftContainer.appendChild(nameSpan);

      item.appendChild(leftContainer);
      item.classList.add("is-folder-item");
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
      dragHandle.title = "Drag to reorder or move into folder";
      dragHandle.textContent = "::";

      dragHandle.onpointerdown = (pointerEvent) => {
        if (pointerEvent.button !== 0) return;
        pointerEvent.stopPropagation();

        const activePointerId = pointerEvent.pointerId;
        const startX = pointerEvent.clientX;
        const startY = pointerEvent.clientY;
        let isDraggingStarted = false;
        let ghostEl = null;
        let activeTarget = null;
        let dropPosition = "below";
        let animFrameId = null;

        const container =
          document
            .getElementById("linkManagerContent")
            ?.closest(".modal-content") ||
          document.getElementById("linkManagerContent");

        const isDescendantOf = (candidateId, parentCheckId) => {
          let curr = candidateId;
          while (curr) {
            if (curr === parentCheckId) return true;
            const node = links.find((l) => l.id === curr);
            curr = node ? node.parentId : null;
          }
          return false;
        };

        const startDragSession = () => {
          isDraggingStarted = true;
          item.classList.add("is-dragging");
          if (window.customCursorInstance) {
            window.customCursorInstance.setDragState(true);
          }
          ghostEl = item.cloneNode(true);
          ghostEl.className = "drag-ghost";
          ghostEl.style.width = `${item.offsetWidth}px`;
          ghostEl.style.left = `${startX}px`;
          ghostEl.style.top = `${startY}px`;
          document.body.appendChild(ghostEl);
        };

        const scrollContainer = document.getElementById("linkManagerContent");
        let lastClientY = startY;

        const runAutoScrollLoop = () => {
          if (!isDraggingStarted || !scrollContainer) return;
          const rect = scrollContainer.getBoundingClientRect();
          const threshold = 50;
          const speed = 10;

          if (lastClientY < rect.top + threshold) {
            scrollContainer.scrollTop -= speed;
          } else if (lastClientY > rect.bottom - threshold) {
            scrollContainer.scrollTop += speed;
          }

          animFrameId = requestAnimationFrame(runAutoScrollLoop);
        };

        const updateDragVisuals = (pe) => {
          const touchOffsetY = pe.pointerType === "touch" ? 40 : 0;
          const targetY = pe.clientY - touchOffsetY;
          lastClientY = targetY;

          if (!animFrameId) {
            animFrameId = requestAnimationFrame(runAutoScrollLoop);
          }

          if (ghostEl) {
            ghostEl.style.left = `${pe.clientX}px`;
            ghostEl.style.top = `${targetY}px`;
          }

          document.querySelectorAll(".link-manager-item").forEach((el) => {
            el.classList.remove("shift-down", "shift-up", "drag-over-folder");
          });

          const hoverEl = document
            .elementFromPoint(pe.clientX, targetY)
            ?.closest(".link-manager-item");

          if (hoverEl && hoverEl !== item) {
            const targetId = hoverEl.dataset.id;
            if (isDescendantOf(targetId, link.id)) {
              activeTarget = null;
              return;
            }

            activeTarget = hoverEl;
            const targetLink = links.find((l) => l.id === targetId);
            const rect = hoverEl.getBoundingClientRect();
            const ratio = Math.max(
              0,
              Math.min(1, (pe.clientY - rect.top) / rect.height),
            );

            const subContainer = hoverEl.nextElementSibling;
            const isFolderExpanded =
              subContainer &&
              subContainer.classList.contains("folder-sub-container") &&
              subContainer.style.display !== "none";

            if (targetLink?.isFolder && isFolderExpanded) {
              if (ratio < 0.25) {
                dropPosition = "above";
                hoverEl.classList.add("shift-down");
              } else if (ratio > 0.75) {
                dropPosition = "below";
                hoverEl.classList.add("shift-up");
              } else {
                dropPosition = "inside";
                hoverEl.classList.add("drag-over-folder");
              }
            } else {
              if (ratio < 0.5) {
                dropPosition = "above";
                hoverEl.classList.add("shift-down");
              } else {
                dropPosition = "below";
                hoverEl.classList.add("shift-up");
              }
            }
          } else {
            activeTarget = null;
          }
        };

        const handleDrop = async () => {
          if (!isDraggingStarted || !activeTarget) return;

          const targetId = activeTarget.dataset.id;
          const currentLinks = [...store.getState().links];
          const draggedIdx = currentLinks.findIndex((l) => l.id === link.id);
          const targetIdx = currentLinks.findIndex((l) => l.id === targetId);

          if (draggedIdx === -1 || targetIdx === -1) return;

          const targetLink = currentLinks[targetIdx];
          const [movedItem] = currentLinks.splice(draggedIdx, 1);

          if (dropPosition === "inside" && targetLink.isFolder) {
            movedItem.parentId = targetLink.id;
            currentLinks.push(movedItem);
          } else {
            movedItem.parentId = targetLink.parentId || null;
            const newTargetIdx = currentLinks.findIndex(
              (l) => l.id === targetId,
            );
            const insertIdx =
              dropPosition === "above" ? newTargetIdx : newTargetIdx + 1;
            currentLinks.splice(insertIdx, 0, movedItem);
          }

          await store.setState({ links: currentLinks });
          renderLinks();
          renderLinkManager();
        };

        const cleanupDragSession = () => {
          if (animFrameId) cancelAnimationFrame(animFrameId);
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerup", onPointerUp);
          window.removeEventListener("pointercancel", cleanupDragSession);

          if (window.customCursorInstance) {
            window.customCursorInstance.setDragState(false);
          }

          if (ghostEl) {
            ghostEl.remove();
            ghostEl = null;
          }

          item.classList.remove("is-dragging");
          document.querySelectorAll(".link-manager-item").forEach((el) => {
            el.classList.remove("shift-down", "shift-up", "drag-over-folder");
          });
        };

        const onPointerMove = (pe) => {
          if (pe.pointerId !== activePointerId) return;
          pe.preventDefault();

          if (!isDraggingStarted) {
            const dist = Math.hypot(pe.clientX - startX, pe.clientY - startY);
            if (dist < 8) return;
            startDragSession();
          }

          updateDragVisuals(pe);
        };

        const onPointerUp = async (pe) => {
          if (pe.pointerId !== activePointerId) return;
          const shouldDrop = isDraggingStarted && activeTarget;
          cleanupDragSession();
          if (shouldDrop) {
            await handleDrop();
          }
        };

        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointercancel", cleanupDragSession);
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
          const handleToggle = (e) => {
            e.stopPropagation();
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
          };

          row.onclick = (e) => {
            if (
              e.target.closest(".link-actions") ||
              e.target.closest(".manager-checkbox")
            )
              return;
            handleToggle(e);
          };
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
export function addFolder(triggerElement = null) {
  const state = store.getState();
  const links = state.links || [];
  const targetFolderId = state.currentFolderId;

  if (targetFolderId && getFolderDepth(targetFolderId, links) >= 3) {
    if (triggerElement && triggerElement instanceof HTMLElement) {
      triggerElement.classList.add("limit-shake");
      setTimeout(() => triggerElement.classList.remove("limit-shake"), 400);
    }
    return showToast("Folder depth limit reached (max 3 levels).", "error");
  }

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
    editorTargetFolderId: targetFolderId,
  });

  if (titleEl) titleEl.innerText = "Add New Folder";
  if (nameInput) nameInput.value = "";
  if (urlInput) {
    urlInput.value = "";
    urlInput.classList.add("field-hidden");
  }
}
