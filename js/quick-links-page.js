import "./main.js";
import { store } from "./store.js";
import { generateId } from "./utils.js";
import { customConfirm, showToast } from "./ui.js";
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

function clearDropState() {
  grid.querySelectorAll(".quick-link-card").forEach((card) => {
    card.classList.remove("drag-over", "drop-before", "drop-after");
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
  emptyState.classList.toggle("hidden", links.length !== 0);

  links.forEach((link) => {
    const card = document.createElement("article");
    card.className = "quick-link-card";
    card.dataset.id = link.id;
    card.tabIndex = 0;

    const icon = document.createElement("div");
    icon.className = "quick-link-icon";
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
    name.className = "quick-link-name";
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
    remove.className = "remove";
    remove.title = link.parentId ? "Move out of folder" : "Delete";
    remove.innerHTML = '<span class="icon-mask icon-close" aria-hidden="true"></span>';
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
    handle.textContent = "::";
    handle.setAttribute("aria-hidden", "true");

    card.append(icon, name, actions, handle);
    bindCard(card, link);
    grid.appendChild(card);
  });
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
    if (event.button !== 0 || event.target.closest("button")) return;
    startDrag(event, link, card);
  });
}

function navigate(folderId) {
  currentFolderId = folderId;
  clearTimeout(hoverOpenTimer);
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
  item.parentId = null;
  links.splice(index, 1);
  links.push(item);
  await store.setState({ links });
  render();
  showToast("Moved to dashboard", "success");
}

function startDrag(event, link, card) {
  const startX = event.clientX;
  const startY = event.clientY;
  const pointerId = event.pointerId;
  dragState = { link, card, pointerId, startX, startY, started: false, target: null, position: "after" };

  const onMove = (moveEvent) => {
    if (!dragState || moveEvent.pointerId !== pointerId) return;
    const distance = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
    if (!dragState.started && distance < 8) return;

    if (!dragState.started) {
      dragState.started = true;
      card.classList.add("is-dragging");
      window.customCursorInstance?.setDragState(true);
    }

    moveEvent.preventDefault();
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
    clearDropState();
    card.classList.remove("is-dragging");
    window.customCursorInstance?.setDragState(false);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", cleanup);
    dragState = null;
  };

  window.addEventListener("pointermove", onMove, { passive: false });
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", cleanup);
}

function updateDragTarget(event) {
  clearDropState();
  const hover = document.elementFromPoint(event.clientX, event.clientY)?.closest(".quick-link-card");
  if (!hover || hover === dragState.card) {
    dragState.target = null;
    return;
  }

  const links = store.getState().links || [];
  const targetId = hover.dataset.id;
  if (isDescendant(targetId, dragState.link.id, links)) {
    dragState.target = null;
    return;
  }

  const target = links.find((link) => link.id === targetId);
  if (!target) return;

  const rect = hover.getBoundingClientRect();
  const ratio = (event.clientX - rect.left) / Math.max(rect.width, 1);

  if (target.isFolder && currentFolderId !== target.id) {
    dragState.target = { id: target.id, position: "inside" };
    hover.classList.add("drag-over");

    clearTimeout(hoverOpenTimer);
    hoverOpenTimer = setTimeout(() => {
      if (!dragState?.started || dragState.target?.id !== target.id) return;
      navigate(target.id);
      dragState.target = { id: target.id, position: "inside" };
    }, 500);
    return;
  }

  dragState.target = {
    id: target.id,
    position: ratio < 0.5 ? "before" : "after",
  };
  hover.classList.add(ratio < 0.5 ? "drop-before" : "drop-after");
}

async function performDrop(state) {
  const links = [...(store.getState().links || [])];
  const draggedIndex = links.findIndex((link) => link.id === state.link.id);
  const targetIndex = links.findIndex((link) => link.id === state.target.id);
  if (draggedIndex < 0 || targetIndex < 0) return;

  const dragged = links[draggedIndex];
  const target = links[targetIndex];

  if (state.target.position === "inside") {
    const depth = getFolderDepth(target.id, links);
    const potentialDepth = depth + (dragged.isFolder ? 1 : 0);
    if (potentialDepth > 3) {
      return showToast("Folder depth limit reached (max 3 levels).", "error");
    }
    dragged.parentId = target.id;
    links.splice(draggedIndex, 1);
    links.push(dragged);
  } else {
    dragged.parentId = target.parentId || null;
    links.splice(draggedIndex, 1);
    const newTargetIndex = links.findIndex((link) => link.id === target.id);
    links.splice(state.target.position === "before" ? newTargetIndex : newTargetIndex + 1, 0, dragged);
  }

  await store.setState({ links });
  render();
}

document.getElementById("rootBtn").addEventListener("click", () => navigate(null));
document.getElementById("addLinkBtn").addEventListener("click", () => openEditor());
document.getElementById("addFolderBtn").addEventListener("click", () => openEditor(null, true));
document.getElementById("cancelEditBtn").addEventListener("click", closeEditor);
document.getElementById("saveLinkBtn").addEventListener("click", saveEditor);
editor.addEventListener("click", (event) => {
  if (event.target === editor) closeEditor();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !editor.classList.contains("hidden")) closeEditor();
});

await store.init();
await new Promise((resolve) => requestAnimationFrame(resolve));
render();
