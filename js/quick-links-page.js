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

function getSubtreeFolderDepth(folderId, links, path = new Set()) {
  if (path.has(folderId)) return 0;
  const root = links.find((link) => link.id === folderId);
  if (!root?.isFolder) return 0;

  const nextPath = new Set(path);
  nextPath.add(folderId);
  const children = links.filter((link) => link.parentId === folderId && link.isFolder);
  if (!children.length) return 1;
  return 1 + Math.max(...children.map((child) => getSubtreeFolderDepth(child.id, links, nextPath)));
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

    const mobileMenu = document.createElement("button");
    mobileMenu.type = "button";
    mobileMenu.className = "quick-link-mobile-menu";
    mobileMenu.textContent = "⋯";
    mobileMenu.title = "Link actions";
    mobileMenu.setAttribute("aria-label", `Actions for ${link.name}`);
    mobileMenu.setAttribute("aria-haspopup", "menu");
    mobileMenu.setAttribute("aria-expanded", "false");

    const actionMenu = document.createElement("div");
    actionMenu.className = "quick-link-action-menu";
    actionMenu.setAttribute("role", "menu");
    actionMenu.hidden = true;

    const addMenuAction = (label, action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("role", "menuitem");
      button.dataset.action = action;
      button.textContent = label;
      button.addEventListener("click", async (event) => {
        event.stopPropagation();
        closeMobileActionMenus();
        if (action === "edit") openEditor(link.id);
        else if (action === "up") await moveSibling(link.id, -1);
        else if (action === "down") await moveSibling(link.id, 1);
        else if (action === "move") await moveOut(link.id);
        else if (action === "delete") await deleteItem(link.id);
      });
      actionMenu.appendChild(button);
    };
    addMenuAction("Edit", "edit");
    const siblings = childrenOf(link.parentId || null);
    const siblingIndex = siblings.findIndex((item) => item.id === link.id);
    if (siblingIndex > 0) addMenuAction("Move up", "up");
    if (siblingIndex >= 0 && siblingIndex < siblings.length - 1) addMenuAction("Move down", "down");
    if (link.parentId) addMenuAction("Move to parent", "move");
    addMenuAction("Delete", "delete");

    mobileMenu.addEventListener("click", (event) => {
      event.stopPropagation();
      const opening = actionMenu.hidden;
      closeMobileActionMenus();
      if (opening) {
        actionMenu._ownerCard = card;
        document.body.appendChild(actionMenu);
        actionMenu.hidden = false;
        card.classList.add("menu-open");
        const rect = mobileMenu.getBoundingClientRect();
        const menuWidth = Math.min(220, window.innerWidth - 32);
        const menuHeight = actionMenu.getBoundingClientRect().height || actionMenu.scrollHeight || 180;
        const left = Math.max(16, Math.min(window.innerWidth - menuWidth - 16, rect.right - menuWidth));
        const availableBelow = window.innerHeight - rect.bottom - 16;
        const top = availableBelow >= menuHeight + 8 ? rect.bottom + 8 : Math.max(16, rect.top - menuHeight - 8);
        actionMenu.style.left = left + "px";
        actionMenu.style.top = top + "px";
      }
      mobileMenu.setAttribute("aria-expanded", String(opening));
    });
    actionMenu.addEventListener("click", (event) => event.stopPropagation());
    card.append(mobileMenu, actionMenu);

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

async function moveSibling(id, direction) {
  const links = [...(store.getState().links || [])];
  const index = links.findIndex((item) => item.id === id);
  if (index < 0) return;
  const item = links[index];
  const siblings = links.filter((candidate) => (candidate.parentId || null) === (item.parentId || null));
  const siblingIndex = siblings.findIndex((candidate) => candidate.id === id);
  const target = siblings[siblingIndex + direction];
  if (!target) return;
  const targetIndex = links.findIndex((candidate) => candidate.id === target.id);
  [links[index], links[targetIndex]] = [links[targetIndex], links[index]];
  await store.setState({ links });
  render();
}

function createDragPreview(card, rect) {
  const preview = card.cloneNode(true);
  preview.classList.remove("is-dragging", "is-drag-source", "drag-over", "drag-enter-folder", "drop-before", "drop-after");
  preview.classList.add("quick-link-drag-preview");
  preview.style.width = rect.width + "px";
  preview.style.height = rect.height + "px";
  preview.style.left = rect.left + "px";
  preview.style.top = rect.top + "px";
  preview.setAttribute("aria-hidden", "true");
  preview.querySelectorAll("button").forEach((button) => { button.tabIndex = -1; });
  document.body.appendChild(preview);
  return preview;
}

function updateDragAutoScroll(event) {
  if (!dragState?.started) return;
  dragState.lastX = event.clientX;
  dragState.lastY = event.clientY;
  if (dragState.autoScrollFrame) return;

  const tick = () => {
    if (!dragState?.started) return;
    const y = dragState.lastY;
    const edge = Math.min(100, Math.max(64, window.innerHeight * 0.14));
    let step = 0;
    if (y < edge) step = -Math.ceil(Math.min(1, (edge - y) / edge) * 12);
    else if (y > window.innerHeight - edge) {
      step = Math.ceil(Math.min(1, (y - (window.innerHeight - edge)) / edge) * 12);
    }
    if (step) {
      window.scrollBy(0, step);
      updateDragTarget({ clientX: dragState.lastX, clientY: dragState.lastY });
      dragState.autoScrollFrame = requestAnimationFrame(tick);
    } else {
      dragState.autoScrollFrame = 0;
    }
  };
  dragState.autoScrollFrame = requestAnimationFrame(tick);
}

function updateDragPreview(event) {
  if (!dragState?.preview) return;
  // Keep the preview under the pointer without making the pointer hunt for it.
  const x = event.clientX - dragState.offsetX;
  const y = event.clientY - dragState.offsetY;
  dragState.preview.style.left = x + "px";
  dragState.preview.style.top = y + "px";
}

function startDrag(event, link, card, handle) {
  if (dragState) return;
  const startX = event.clientX;
  const startY = event.clientY;
  const pointerId = event.pointerId;
  const pointerType = event.pointerType;
  let finished = false;

  dragState = {
    link, card, handle, pointerId, startX, startY, started: false,
    target: null, lastX: startX, lastY: startY,
    offsetX: 0, offsetY: 0, width: 0, height: 0,
    preview: null, autoScrollFrame: 0,
  };
  const session = dragState;
  const suppressClickAfterDrag = (clickEvent) => {
    if (!session.started) return;
    clickEvent.preventDefault();
    clickEvent.stopPropagation();
    card.removeEventListener("click", suppressClickAfterDrag, true);
  };
  card.addEventListener("click", suppressClickAfterDrag, true);
  handle.setPointerCapture?.(pointerId);

  const cleanup = () => {
    if (finished) return;
    finished = true;
    if (session.autoScrollFrame) cancelAnimationFrame(session.autoScrollFrame);
    if (!session.started) {
      card.removeEventListener("click", suppressClickAfterDrag, true);
    } else {
      // pointercancel may not produce a click, so do not leave a stale guard.
      setTimeout(() => card.removeEventListener("click", suppressClickAfterDrag, true), 0);
    }
    try {
      if (handle.hasPointerCapture?.(pointerId)) handle.releasePointerCapture(pointerId);
    } catch {}
    clearDropState();
    statefulRemovePreview(session.preview);
    card.classList.remove("is-drag-source");
    card.style.display = "";
    window.customCursorInstance?.setDragState(false);
    window.customCursorInstance?.updateCursorForElement(document.elementFromPoint(session.lastX, session.lastY));
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    window.removeEventListener("blur", onCancel);
    if (dragState === session) dragState = null;
  };

  const onMove = (moveEvent) => {
    if (finished || moveEvent.pointerId !== pointerId) return;
    const distance = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
    if (!session.started && distance < (pointerType === "touch" ? 10 : 5)) return;

    if (!session.started) {
      session.started = true;
      const rect = card.getBoundingClientRect();
      session.offsetX = pointerType === "touch" ? rect.width / 2 : moveEvent.clientX - rect.left;
      session.offsetY = pointerType === "touch" ? Math.min(24, rect.height / 3) : moveEvent.clientY - rect.top;
      session.width = rect.width;
      session.height = rect.height;
      session.preview = createDragPreview(card, rect);
      card.classList.add("is-drag-source");
      window.customCursorInstance?.setCursorClass("icon-drag-grip-cursor");
      window.customCursorInstance?.setDragState(true);
    }

    moveEvent.preventDefault();
    session.lastX = moveEvent.clientX;
    session.lastY = moveEvent.clientY;
    updateDragAutoScroll(moveEvent);
    updateDragPreview(moveEvent);
    updateDragTarget(moveEvent);
  };

  const onUp = async (upEvent) => {
    if (finished || upEvent.pointerId !== pointerId) return;
    const shouldDrop = session.started && session.target;
    const finalState = { link: session.link, target: session.target };
    cleanup();
    if (shouldDrop) await performDrop(finalState);
  };
  const onCancel = () => cleanup();

  window.addEventListener("pointermove", onMove, { passive: false });
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onCancel);
  window.addEventListener("blur", onCancel);
}

function statefulRemovePreview(preview) {
  if (preview?.isConnected) preview.remove();
}

function getGridTargetAtPoint(x, y) {
  const point = document.elementFromPoint(x, y);
  const direct = point?.closest(".quick-link-card");
  if (direct && direct !== dragState?.card && direct.style.display !== "none") return direct;

  // Gaps are valid only when they are genuinely close to a card. Never guess
  // across the entire grid; that was a major source of accidental drops.
  const cards = [...grid.querySelectorAll(".quick-link-card")].filter(
    (card) => card !== dragState?.card && card.style.display !== "none",
  );
  let closest = null;
  let closestDistance = Infinity;
  for (const card of cards) {
    const rect = card.getBoundingClientRect();
    const dx = Math.max(rect.left - x, 0, x - rect.right);
    const dy = Math.max(rect.top - y, 0, y - rect.bottom);
    const distance = Math.hypot(dx, dy);
    const maxDistance = Math.min(34, Math.max(18, Math.min(rect.width, rect.height) * 0.22));
    if (distance <= maxDistance && distance < closestDistance) {
      closest = card;
      closestDistance = distance;
    }
  }
  return closest;
}

function updateDragTarget(event) {
  if (!dragState?.started) return;
  const session = dragState;
  session.lastX = event.clientX;
  session.lastY = event.clientY;

  // Only update visual state when the target actually changes. The grid itself
  // remains stationary during the gesture, avoiding feedback-loop jitter.
  const point = document.elementFromPoint(event.clientX, event.clientY);
  const hover = getGridTargetAtPoint(event.clientX, event.clientY);
  const links = store.getState().links || [];
  let nextTarget = null;
  let position = null;

  if (!hover) {
    const insideGrid = point && grid.contains(point);
    if (insideGrid && currentFolderId) nextTarget = { id: currentFolderId, position: "inside" };
    else if (insideGrid) nextTarget = { id: null, position: "root-end" };
  } else {
    const target = links.find((link) => link.id === hover.dataset.id);
    if (target && !isDescendant(target.id, session.link.id, links)) {
      const rect = hover.getBoundingClientRect();
      const rx = (event.clientX - rect.left) / Math.max(1, rect.width);
      const ry = (event.clientY - rect.top) / Math.max(1, rect.height);
      const centralFolderDrop = target.isFolder && target.id !== session.link.id &&
        rx >= 0.28 && rx <= 0.72 && ry >= 0.24 && ry <= 0.76;
      if (centralFolderDrop) {
        position = "inside";
      } else {
        // Use the dominant axis of the grid item to make before/after stable.
        const dx = (event.clientX - (rect.left + rect.width / 2)) / Math.max(1, rect.width);
        const dy = (event.clientY - (rect.top + rect.height / 2)) / Math.max(1, rect.height);
        position = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "before" : "after") : (dy < 0 ? "before" : "after");
      }
      nextTarget = { id: target.id, position };
    }
  }

  const oldKey = session.target ? session.target.id + ":" + session.target.position : "";
  const newKey = nextTarget ? nextTarget.id + ":" + nextTarget.position : "";
  if (oldKey === newKey) return;

  clearDropState();
  session.target = nextTarget;
  if (!hover || !nextTarget || nextTarget.position === "root-end") return;
  if (nextTarget.position === "inside") hover.classList.add("drag-enter-folder");
  else hover.classList.add(nextTarget.position === "before" ? "drop-before" : "drop-after");
}

async function performDrop(state) {
  const links = [...(store.getState().links || [])];
  const draggedIndex = links.findIndex((link) => link.id === state.link.id);
  if (draggedIndex < 0 || !state.target) return;
  const dragged = links[draggedIndex];

  let target = null;
  let destinationParentId = null;
  if (state.target.position === "root-end") {
    destinationParentId = null;
  } else {
    target = links.find((link) => link.id === state.target.id);
    if (!target) return;
    destinationParentId = state.target.position === "inside"
      ? (target.isFolder ? target.id : currentFolderId)
      : (target.parentId || null);
  }

  if (destinationParentId && isDescendant(destinationParentId, dragged.id, links)) {
    showToast("A folder cannot be moved into itself or one of its descendants.", "error");
    return;
  }

  // Validate the whole folder subtree, not just the folder being dragged.
  const destinationDepth = destinationParentId ? getFolderDepth(destinationParentId, links) : 0;
  const subtreeDepth = dragged.isFolder ? getSubtreeFolderDepth(dragged.id, links) : 0;
  if (destinationDepth + subtreeDepth > 3) {
    showToast("Folder depth limit reached (max 3 levels).", "error");
    return;
  }

  if (state.target.position === "root-end") {
    dragged.parentId = null;
    links.splice(draggedIndex, 1);
    links.push(dragged);
  } else if (state.target.position === "inside") {
    if (!destinationParentId) return;
    dragged.parentId = destinationParentId;
    links.splice(draggedIndex, 1);
    const folderChildren = links.filter((link) => (link.parentId || null) === destinationParentId);
    const lastChild = folderChildren[folderChildren.length - 1];
    const insertIndex = lastChild ? links.indexOf(lastChild) + 1 : links.length;
    links.splice(insertIndex, 0, dragged);
  } else {
    dragged.parentId = destinationParentId;
    links.splice(draggedIndex, 1);
    const newTargetIndex = links.findIndex((link) => link.id === target.id);
    if (newTargetIndex < 0) return;
    links.splice(state.target.position === "before" ? newTargetIndex : newTargetIndex + 1, 0, dragged);
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
function closeMobileActionMenus() {
  document.querySelectorAll(".quick-link-action-menu").forEach((menu) => {
    menu.hidden = true;
    const card = menu._ownerCard || menu.closest(".quick-link-card");
    card?.classList.remove("menu-open");
    card?.querySelector(".quick-link-mobile-menu")?.setAttribute("aria-expanded", "false");
    if (card && menu.parentElement !== card) card.appendChild(menu);
  });
}
document.addEventListener("click", (event) => {
  if (!event.target.closest(".quick-link-mobile-menu, .quick-link-action-menu")) closeMobileActionMenus();
});
window.addEventListener("resize", closeMobileActionMenus);
window.addEventListener("scroll", closeMobileActionMenus, true);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!editor.classList.contains("hidden")) closeEditor();
    closeMobileActionMenus();
  }
});

await store.init();
await loadSettings();
document.body.classList.add("quick-links-body");
new CustomCursorEngine();
await new Promise((resolve) => requestAnimationFrame(resolve));
render();
