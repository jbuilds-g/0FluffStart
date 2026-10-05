import { customConfirm, loadSettings, showToast } from "./ui.js";
import { CustomCursorEngine } from "./cursor.js";
import { store } from "./store.js";
import { generateId } from "./utils.js";
import { getFolderDepth } from "./links.js";

const grid = document.getElementById("quickLinksGrid");
const emptyState = document.getElementById("emptyState");
const breadcrumbs = document.getElementById("breadcrumbs");
const separator = document.getElementById("breadcrumbSeparator");
const editor = document.getElementById("linkEditorModal");
const nameInput = document.getElementById("editName");
const urlInput = document.getElementById("editUrl");
const urlRow = document.getElementById("editUrlRow");

let currentFolderId = null;
let editingId = null;
let creatingFolder = false;
let dragState = null;
let hoverOpenTimer = null;
let hoverFolderId = null;
let dropSlot = null;
let dropSlotKey = null;

function childrenOf(parentId) {
  return (store.getState().links || []).filter(
    (link) => (link.parentId || null) === parentId,
  );
}

function isDescendant(candidateId, ancestorId, links) {
  let current = candidateId;
  const visited = new Set();
  while (current && !visited.has(current)) {
    if (current === ancestorId) return true;
    visited.add(current);
    current = links.find((link) => link.id === current)?.parentId || null;
  }
  return false;
}

function removeDropSlot() {
  if (dropSlot) {
    dropSlot.remove();
    dropSlot = null;
  }
  dropSlotKey = null;
}

function clearDropState({ removeSlot = true } = {}) {
  grid.querySelectorAll(".quick-link-card").forEach((card) => {
    card.classList.remove(
      "drag-over",
      "drag-enter-folder",
      "drop-before",
      "drop-after",
    );
  });
  if (removeSlot) removeDropSlot();
}

function animateGridReflow(beforeRects) {
  if (!beforeRects.size) return;

  grid.querySelectorAll(".quick-link-card").forEach((card) => {
    const before = beforeRects.get(card.dataset.id);
    if (!before) return;

    const after = card.getBoundingClientRect();
    const dx = before.left - after.left;
    const dy = before.top - after.top;

    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

    card.animate(
      [
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: "translate(0, 0)" },
      ],
      { duration: 180, easing: "cubic-bezier(.2,.8,.2,1)" },
    );
  });
}

function renderBreadcrumbs() {
  breadcrumbs.innerHTML = "";
  const state = store.getState();
  const links = state.links || [];
  const chain = [];
  let id = currentFolderId;
  const visited = new Set();

  while (id && !visited.has(id)) {
    visited.add(id);
    const folder = links.find((link) => link.id === id);
    if (!folder) break;
    chain.unshift(folder);
    id = folder.parentId || null;
  }

  separator.classList.toggle("hidden", chain.length === 0);
  chain.forEach((folder, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = folder.name;
    button.disabled = index === chain.length - 1;
    button.addEventListener("click", () => {
      if (!button.disabled) navigate(folder.id);
    });
    breadcrumbs.appendChild(button);
    if (index < chain.length - 1) {
      const slash = document.createElement("span");
      slash.textContent = "/";
      slash.className = "quick-links-breadcrumb-separator";
      breadcrumbs.appendChild(slash);
    }
  });
}

function render() {
  const links = childrenOf(currentFolderId);
  grid.innerHTML = "";
  renderBreadcrumbs();
  emptyState.classList.add("hidden");

  const addFolder = document.createElement("button");
  addFolder.type = "button";
  addFolder.className = "quick-link-add-card quick-link-add-folder";
  addFolder.title = "Add Folder";
  addFolder.setAttribute("aria-label", "Add Folder");
  addFolder.innerHTML = '<span class="quick-link-add-plus" aria-hidden="true">+</span><span class="quick-link-add-label">Folder</span>';
  addFolder.addEventListener("click", () => openEditor(null, true));

  const addLink = document.createElement("button");
  addLink.type = "button";
  addLink.className = "quick-link-add-card quick-link-add-link";
  addLink.title = "Add Link";
  addLink.setAttribute("aria-label", "Add Link");
  addLink.innerHTML = '<span class="quick-link-add-plus" aria-hidden="true">+</span><span class="quick-link-add-label">Link</span>';
  addLink.addEventListener("click", () => openEditor());

  links.forEach((link) => {
    const card = document.createElement("article");
    card.className = "link-item quick-link-card";
    card.dataset.id = link.id;
    card.tabIndex = 0;

    const icon = document.createElement("div");
    icon.className = "link-icon-circle";
    if (link.isFolder) {
      icon.innerHTML = '<span class="icon-mask icon-folder" style="width:26px;height:26px"></span>';
    } else {
      const words = link.name.split(" ").filter(Boolean);
      let acronym = words.map((word) => word[0].toUpperCase()).join("");
      if (words.length === 1 && acronym.length === 1 && link.name.length > 1) {
        acronym = link.name.slice(0, 2).toUpperCase();
      }
      const acronymEl = document.createElement("span");
      acronymEl.className = "link-acronym";
      acronymEl.textContent = acronym.slice(0, 3);
      acronymEl.style.fontSize = acronym.length === 1 ? "2rem" : acronym.length === 2 ? "1.6rem" : "1.2rem";
      icon.appendChild(acronymEl);
    }

    const name = document.createElement("div");
    name.className = "link-name";
    name.textContent = link.name;

    const actions = document.createElement("div");
    actions.className = "quick-link-actions";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.title = "Edit";
    edit.innerHTML = '<span class="icon-mask icon-edit" aria-hidden="true"></span>';
    edit.addEventListener("click", (event) => {
      event.stopPropagation();
      openEditor(link.id);
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = link.parentId ? "move-out" : "remove";
    remove.title = link.parentId ? "Move to parent folder" : "Delete";
    remove.setAttribute("aria-label", link.parentId ? "Move to parent folder" : "Delete");
    remove.innerHTML = link.parentId
      ? '<span class="icon-mask icon-back" style="transform:rotate(90deg)" aria-hidden="true"></span>'
      : '<span class="icon-mask icon-close" aria-hidden="true"></span>';
    remove.addEventListener("click", async (event) => {
      event.stopPropagation();
      if (link.parentId) {
        await moveOut(link.id);
      } else {
        await deleteItem(link.id);
      }
    });

    actions.append(edit, remove);

    const handle = document.createElement("span");
    handle.className = "quick-link-drag-handle";
    handle.innerHTML = '<span class="icon-mask icon-multidirectional-drag-handle" aria-hidden="true"></span>';
    handle.title = "Drag to reorder or move";
    handle.setAttribute("role", "button");
    handle.setAttribute("tabindex", "0");
    handle.setAttribute("aria-label", "Drag to reorder or move");
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      startDrag(event, link, card, handle);
    });

    card.append(icon, name, actions, handle);
    bindCard(card, link);
    grid.appendChild(card);
  });

  // Keep the add actions at the end of the current folder.
  grid.append(addFolder, addLink);
}

function bindCard(card, link) {
  card.addEventListener("click", () => {
    if (dragState?.started) return;
    if (link.isFolder) navigate(link.id);
  });

  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && link.isFolder) navigate(link.id);
  });

  card.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("button, .quick-link-drag-handle")) return;
  });
}

function navigate(folderId) {
  if (dragState?.started && dragState.card?.parentElement === grid) {
    document.body.appendChild(dragState.card);
  }
  currentFolderId = folderId;
  clearTimeout(hoverOpenTimer);
  hoverOpenTimer = null;
  hoverFolderId = null;
  render();
}

function openEditor(id = null, folderMode = false) {
  editingId = id;
  creatingFolder = folderMode;
  const link = id ? (store.getState().links || []).find((item) => item.id === id) : null;
  document.getElementById("editorTitle").textContent =
    id ? (link?.isFolder ? "Edit Folder" : "Edit Link") : folderMode ? "Add Folder" : "Add Link";
  nameInput.value = link?.name || "";
  urlInput.value = link?.url || "";
  urlRow.classList.toggle("hidden", !!(id && link?.isFolder) || folderMode);
  editor.classList.remove("hidden");
  nameInput.focus();
}

function closeEditor() {
  editor.classList.add("hidden");
  editingId = null;
  creatingFolder = false;
}

async function saveEditor() {
  const name = nameInput.value.trim().slice(0, 50);
  const url = urlInput.value.trim();
  if (!name) return showToast("Please fill in the name.", "error");

  const links = [...(store.getState().links || [])];

  if (editingId) {
    const index = links.findIndex((link) => link.id === editingId);
    if (index < 0) return closeEditor();
    links[index].name = name;
    if (!links[index].isFolder) {
      if (!url) return showToast("Please fill in the URL.", "error");
      links[index].url = url;
    }
  } else if (creatingFolder) {
    if (currentFolderId && getFolderDepth(currentFolderId, links) >= 3) {
      return showToast("Folder depth limit reached (max 3 levels).", "error");
    }
    links.push({ id: generateId(), name, isFolder: true, parentId: currentFolderId });
  } else {
    if (!url) return showToast("Please fill in the URL.", "error");
    links.push({ id: generateId(), name, url, isFolder: false, parentId: currentFolderId });
  }

  await store.setState({ links });
  closeEditor();
  render();
  showToast(editingId ? "Quick link updated" : creatingFolder ? "Folder created" : "Link added", "success");
}

async function deleteItem(id) {
  const links = store.getState().links || [];
  const item = links.find((link) => link.id === id);
  if (!item) return;
  const confirmed = await customConfirm(
    "This item and its contents will be permanently deleted.",
    "Delete Item?",
  );
  if (!confirmed) return;

  const idsToDelete = new Set([id]);
  let changed = true;
  while (changed) {
    changed = false;
    links.forEach((link) => {
      if (link.parentId && idsToDelete.has(link.parentId) && !idsToDelete.has(link.id)) {
        idsToDelete.add(link.id);
        changed = true;
      }
    });
  }

  await store.setState({ links: links.filter((link) => !idsToDelete.has(link.id)) });
  if (currentFolderId && idsToDelete.has(currentFolderId)) currentFolderId = null;
  render();
  showToast("Item deleted", "info");
}

async function moveOut(id) {
  const links = [...(store.getState().links || [])];
  const index = links.findIndex((link) => link.id === id);
  if (index < 0) return;
  const item = links[index];
  const currentParent = item.parentId || null;
  const parentFolder = currentParent
    ? links.find((link) => link.id === currentParent)
    : null;
  const destinationParentId = parentFolder?.parentId || null;

  item.parentId = destinationParentId;
  links.splice(index, 1);

  const siblings = links.filter(
    (link) => (link.parentId || null) === destinationParentId,
  );
  const lastSiblingIndex = siblings.length
    ? links.lastIndexOf(siblings[siblings.length - 1])
    : -1;
  links.splice(lastSiblingIndex + 1, 0, item);

  await store.setState({ links });
  render();
  showToast(
    destinationParentId ? "Moved to parent folder" : "Moved to dashboard",
    "success",
  );
}

function createDragPreview(card, rect) {
  const preview = card.cloneNode(true);
  preview.classList.remove("is-dragging");
  preview.classList.add("quick-link-drag-preview");
  preview.style.width = rect.width + "px";
  preview.style.height = rect.height + "px";
  preview.style.left = rect.left + "px";
  preview.style.top = rect.top + "px";
  preview.setAttribute("aria-hidden", "true");
  document.body.appendChild(preview);
  return preview;
}

function placeInitialDropSlot(card, rect) {
  if (!dropSlot) {
    dropSlot = document.createElement("div");
    dropSlot.className = "quick-link-drop-slot";
    dropSlot.setAttribute("aria-hidden", "true");
  }
  dropSlot.style.height = rect.height + "px";
  dropSlot.style.width = "";
  grid.insertBefore(dropSlot, card);
  card.style.display = "none";
  dropSlotKey = "source:" + card.dataset.id;
}

function moveDropSlot(card, position) {
  const key = card.dataset.id + ":" + position;
  if (dropSlotKey === key && dropSlot?.isConnected) return;

  const beforeRects = new Map();
  grid.querySelectorAll(".quick-link-card").forEach((item) => {
    if (item !== dragState?.card && item.style.display !== "none") {
      beforeRects.set(item.dataset.id, item.getBoundingClientRect());
    }
  });

  if (!dropSlot) {
    dropSlot = document.createElement("div");
    dropSlot.className = "quick-link-drop-slot";
    dropSlot.setAttribute("aria-hidden", "true");
  }

  dropSlot.style.height = (dragState?.height || card.getBoundingClientRect().height) + "px";
  dropSlot.style.width = "";

  if (position === "before") grid.insertBefore(dropSlot, card);
  else grid.insertBefore(dropSlot, card.nextSibling);

  dropSlotKey = key;
  animateGridReflow(beforeRects);
}

function updateDragPreview(event) {
  if (!dragState?.preview) return;
  dragState.preview.style.left = (event.clientX - dragState.offsetX) + "px";
  dragState.preview.style.top = (event.clientY - dragState.offsetY) + "px";
}

function statefulRemovePreview(preview) {
  if (preview?.isConnected) preview.remove();
}

function startDrag(event, link, card, handle) {
  const startX = event.clientX;
  const startY = event.clientY;
  const pointerId = event.pointerId;

  dragState = {
    link, card, handle, pointerId, startX, startY, started: false,
    target: null, position: "after", lastX: startX, lastY: startY,
    offsetX: 0, offsetY: 0, width: 0, height: 0, preview: null,
  };

  handle.setPointerCapture?.(pointerId);

  const onMove = (moveEvent) => {
    if (!dragState || moveEvent.pointerId !== pointerId) return;
    const distance = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
    if (!dragState.started && distance < 8) return;

    if (!dragState.started) {
      dragState.started = true;
      const rect = card.getBoundingClientRect();
      dragState.offsetX = moveEvent.clientX - rect.left;
      dragState.offsetY = moveEvent.clientY - rect.top;
      dragState.width = rect.width;
      dragState.height = rect.height;
      dragState.preview = createDragPreview(card, rect);
      placeInitialDropSlot(card, rect);
      window.customCursorInstance?.setCursorClass("icon-drag-grip-cursor");
      window.customCursorInstance?.setDragState(true);
    }

    moveEvent.preventDefault();
    updateDragPreview(moveEvent);
    updateDragTarget(moveEvent);
  };

  const onUp = async (upEvent) => {
    if (!dragState || upEvent.pointerId !== pointerId) return;
    const state = dragState;
    cleanup();
    if (state.started && state.target) await performDrop(state);
  };

  const cleanup = () => {
    clearTimeout(hoverOpenTimer);
    hoverOpenTimer = null;
    hoverFolderId = null;
    clearDropState();
    handle.releasePointerCapture?.(pointerId);
    statefulRemovePreview(dragState?.preview);
    if (card.parentElement === grid) card.style.display = "";
    else card.remove();
    window.customCursorInstance?.setDragState(false);
    const pointerTarget = document.elementFromPoint(dragState?.lastX ?? startX, dragState?.lastY ?? startY);
    if (pointerTarget) window.customCursorInstance?.updateCursorForElement(pointerTarget);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", cleanup);
    dragState = null;
  };

  window.addEventListener("pointermove", onMove, { passive: false });
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", cleanup);
}

function getGridTargetAtPoint(x, y) {
  const point = document.elementFromPoint(x, y);
  const hover = point?.closest(".quick-link-card");
  if (hover && hover !== dragState?.card && hover.style.display !== "none") return hover;

  const cards = [...grid.querySelectorAll(".quick-link-card")].filter(
    (card) => card !== dragState?.card && card.style.display !== "none",
  );
  if (!cards.length) return null;

  let closest = null;
  let closestDistance = Infinity;
  cards.forEach((card) => {
    const rect = card.getBoundingClientRect();
    const distance = Math.hypot(x - (rect.left + rect.width / 2), y - (rect.top + rect.height / 2));
    if (distance < closestDistance) { closestDistance = distance; closest = card; }
  });
  return closest;
}

function updateDragTarget(event) {
  if (!dragState?.started) return;
  dragState.lastX = event.clientX;
  dragState.lastY = event.clientY;
  clearDropState({ removeSlot: false });

  const point = document.elementFromPoint(event.clientX, event.clientY);
  const hover = getGridTargetAtPoint(event.clientX, event.clientY);
  const links = store.getState().links || [];

  if (!hover) {
    const insideGrid = point && grid.contains(point);
    if (insideGrid && currentFolderId) dragState.target = { id: currentFolderId, position: "inside" };
    else if (insideGrid) dragState.target = { id: null, position: "root-end" };
    else dragState.target = null;
    clearTimeout(hoverOpenTimer);
    hoverOpenTimer = null;
    hoverFolderId = null;
    removeDropSlot();
    return;
  }

  const targetId = hover.dataset.id;
  if (isDescendant(targetId, dragState.link.id, links)) {
    dragState.target = null;
    clearTimeout(hoverOpenTimer);
    hoverOpenTimer = null;
    hoverFolderId = null;
    removeDropSlot();
    return;
  }

  const target = links.find((link) => link.id === targetId);
  if (!target) return;
  const rect = hover.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  let position;
  if (target.isFolder && currentFolderId !== target.id) {
    if (ratio < 0.3) position = "before";
    else if (ratio > 0.7) position = "after";
    else position = "inside";
  } else {
    position = ratio < 0.5 ? "before" : "after";
  }
  dragState.target = { id: target.id, position };

  if (position === "inside" && target.isFolder) {
    removeDropSlot();
    hover.classList.add("drag-enter-folder");
    if (hoverFolderId !== target.id) {
      clearTimeout(hoverOpenTimer);
      hoverFolderId = target.id;
      hoverOpenTimer = setTimeout(() => {
        if (!dragState?.started || hoverFolderId !== target.id || dragState.target?.position !== "inside") return;
        navigate(target.id);
        requestAnimationFrame(() => {
          if (dragState?.started) updateDragTarget({ clientX: dragState.lastX, clientY: dragState.lastY });
        });
      }, 650);
    }
    return;
  }

  clearTimeout(hoverOpenTimer);
  hoverOpenTimer = null;
  hoverFolderId = null;
  if (position === "inside") {
    hover.classList.add("drag-over");
    removeDropSlot();
    return;
  }
  hover.classList.add(position === "before" ? "drop-before" : "drop-after");
  moveDropSlot(hover, position);
}

async function performDrop(state) {
  const links = [...(store.getState().links || [])];
  const draggedIndex = links.findIndex((link) => link.id === state.link.id);
  if (draggedIndex < 0) return;
  const dragged = links[draggedIndex];

  if (state.target.position === "root-end") {
    dragged.parentId = null;
    links.splice(draggedIndex, 1);
    links.push(dragged);
  } else {
    const targetIndex = links.findIndex((link) => link.id === state.target.id);
    if (targetIndex < 0) return;
    const target = links[targetIndex];
    if (state.target.position === "inside") {
      const destinationParentId = target.isFolder ? target.id : currentFolderId;
      if (!destinationParentId) return;
      const destinationDepth = getFolderDepth(destinationParentId, links);
      const potentialDepth = destinationDepth + (dragged.isFolder ? 1 : 0);
      if (potentialDepth > 3) return showToast("Folder depth limit reached (max 3 levels).", "error");
      dragged.parentId = destinationParentId;
      links.splice(draggedIndex, 1);
      const folderChildren = links.filter((link) => (link.parentId || null) === destinationParentId);
      const lastChild = folderChildren[folderChildren.length - 1];
      const insertIndex = lastChild ? links.indexOf(lastChild) + 1 : links.length;
      links.splice(insertIndex, 0, dragged);
    } else {
      dragged.parentId = target.parentId || null;
      links.splice(draggedIndex, 1);
      const newTargetIndex = links.findIndex((link) => link.id === target.id);
      links.splice(state.target.position === "before" ? newTargetIndex : newTargetIndex + 1, 0, dragged);
    }
  }

  await store.setState({ links });
  render();
}
document.getElementById("rootBtn").addEventListener("click", () => navigate(null));
document.getElementById("cancelEditBtn").addEventListener("click", closeEditor);
document.getElementById("saveLinkBtn").addEventListener("click", saveEditor);
editor.addEventListener("click", (event) => {
  if (event.target === editor) closeEditor();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !editor.classList.contains("hidden")) closeEditor();
});

await store.init();
await loadSettings();
new CustomCursorEngine();
await new Promise((resolve) => requestAnimationFrame(resolve));
render();
