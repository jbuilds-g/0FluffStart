import { customConfirm, loadSettings, showToast } from "./ui.js";
import { CustomCursorEngine } from "./cursor.js";
import { store } from "./store.js";
import { generateId } from "./utils.js";
import { getFolderDepth } from "./links.js";
import { installQuickLinksDragEngine } from "./quick-links-drag.js?v=14";

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
let suppressCardClickUntil = 0;
let dropSlot = null;
let dropSlotKey = null;
let dropSlotAnchorSelector = ".quick-link-add-folder";

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
  const children = links.filter(
    (link) => link.parentId === folderId && link.isFolder,
  );
  if (!children.length) return 1;
  return (
    1 +
    Math.max(
      ...children.map((child) =>
        getSubtreeFolderDepth(child.id, links, nextPath),
      ),
    )
  );
}

function removeDropSlot() {
  if (dropSlot) {
    dropSlot.remove();
    dropSlot = null;
  }
  dropSlotKey = null;
  dropSlotAnchorSelector = ".quick-link-add-folder";
}

function positionDropSlotAtAnchor() {
  if (!dropSlot?.isConnected) return;
  const anchor =
    grid.querySelector(dropSlotAnchorSelector) ||
    grid.querySelector(".quick-link-add-folder");
  if (!anchor) {
    removeDropSlot();
    return;
  }
  const rect = anchor.getBoundingClientRect();
  Object.assign(dropSlot.style, {
    left: rect.left + "px",
    top: rect.top + "px",
    width: rect.width + "px",
    height: rect.height + "px",
  });
}

function showDropSlot(targetCard, position, key, anchorSelector) {
  // Append feedback stays over the actual add tile under the pointer.
  if (position !== "root-end" && position !== "append") return;
  dropSlotAnchorSelector = anchorSelector || ".quick-link-add-folder";
  if (dropSlotKey === key && dropSlot?.isConnected) {
    positionDropSlotAtAnchor();
    return;
  }
  removeDropSlot();
  dropSlotAnchorSelector = anchorSelector || ".quick-link-add-folder";

  const anchor = grid.querySelector(dropSlotAnchorSelector);
  if (!anchor) return;
  const slot = document.createElement("div");
  slot.className = "quick-link-drop-slot quick-link-drop-slot-overlay";
  slot.setAttribute("aria-hidden", "true");
  document.body.appendChild(slot);
  dropSlot = slot;
  dropSlotKey = key;
  positionDropSlotAtAnchor();
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
  addFolder.innerHTML =
    '<span class="quick-link-add-plus" aria-hidden="true">+</span><span class="quick-link-add-label">Folder</span>';
  addFolder.addEventListener("click", () => openEditor(null, true));

  const addLink = document.createElement("button");
  addLink.type = "button";
  addLink.className = "quick-link-add-card quick-link-add-link";
  addLink.title = "Add Link";
  addLink.setAttribute("aria-label", "Add Link");
  addLink.innerHTML =
    '<span class="quick-link-add-plus" aria-hidden="true">+</span><span class="quick-link-add-label">Link</span>';
  addLink.addEventListener("click", () => openEditor());

  links.forEach((link) => {
    const card = document.createElement("article");
    card.className = "link-item quick-link-card";
    card.dataset.id = link.id;
    card.tabIndex = 0;

    const icon = document.createElement("div");
    icon.className = "link-icon-circle";
    if (link.isFolder) {
      icon.innerHTML =
        '<span class="icon-mask icon-folder" style="width:26px;height:26px"></span>';
    } else {
      const words = link.name.split(" ").filter(Boolean);
      let acronym = words.map((word) => word[0].toUpperCase()).join("");
      if (words.length === 1 && acronym.length === 1 && link.name.length > 1) {
        acronym = link.name.slice(0, 2).toUpperCase();
      }
      const acronymEl = document.createElement("span");
      acronymEl.className = "link-acronym";
      acronymEl.textContent = acronym.slice(0, 3);
      acronymEl.style.fontSize =
        acronym.length === 1
          ? "2rem"
          : acronym.length === 2
            ? "1.6rem"
            : "1.2rem";
      icon.appendChild(acronymEl);
    }

    const name = document.createElement("div");
    name.className = "link-name";
    name.textContent = link.name;

    const actions = document.createElement("div");
    actions.className = "quick-link-actions";

    const desktopMenuButton = document.createElement("button");
    desktopMenuButton.type = "button";
    desktopMenuButton.className = "quick-link-desktop-menu-button";
    desktopMenuButton.textContent = "⋯";
    desktopMenuButton.title = "Link actions";
    desktopMenuButton.setAttribute("aria-label", `Actions for ${link.name}`);
    desktopMenuButton.setAttribute("aria-haspopup", "menu");
    desktopMenuButton.setAttribute("aria-expanded", "false");

    const desktopActionMenu = document.createElement("div");
    desktopActionMenu.className = "quick-link-desktop-action-menu";
    desktopActionMenu.setAttribute("role", "menu");
    desktopActionMenu.hidden = true;

    const addDesktopMenuAction = (label, action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("role", "menuitem");
      button.dataset.action = action;
      button.textContent = label;
      button.addEventListener("click", async (event) => {
        event.stopPropagation();
        closeDesktopActionMenus();
        if (action === "edit") openEditor(link.id);
        else if (action === "up") await moveSibling(link.id, -1);
        else if (action === "down") await moveSibling(link.id, 1);
        else if (action === "move") await moveOut(link.id);
        else if (action === "move-to") openMoveToPicker(link.id);
        else if (action === "delete") await deleteItem(link.id);
      });
      desktopActionMenu.appendChild(button);
    };

    addDesktopMenuAction("Edit", "edit");
    const desktopSiblings = childrenOf(link.parentId || null);
    const desktopSiblingIndex = desktopSiblings.findIndex((item) => item.id === link.id);
    if (desktopSiblingIndex > 0) addDesktopMenuAction("Move up", "up");
    if (desktopSiblingIndex >= 0 && desktopSiblingIndex < desktopSiblings.length - 1)
      addDesktopMenuAction("Move down", "down");
    if (link.parentId) addDesktopMenuAction("Move to parent", "move");
    addDesktopMenuAction("Move to…", "move-to");
    addDesktopMenuAction("Delete", "delete");

    desktopMenuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      const opening = desktopActionMenu.hidden;
      closeDesktopActionMenus();
      closeMobileActionMenus();
      if (opening) {
        desktopActionMenu.hidden = false;
        desktopMenuButton.setAttribute("aria-expanded", "true");
      }
    });
    desktopActionMenu.addEventListener("click", (event) => event.stopPropagation());
    actions.append(desktopMenuButton, desktopActionMenu);

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
        else if (action === "move-to") openMoveToPicker(link.id);
        else if (action === "delete") await deleteItem(link.id);
      });
      actionMenu.appendChild(button);
    };
    addMenuAction("Edit", "edit");
    const siblings = childrenOf(link.parentId || null);
    const siblingIndex = siblings.findIndex((item) => item.id === link.id);
    if (siblingIndex > 0) addMenuAction("Move up", "up");
    if (siblingIndex >= 0 && siblingIndex < siblings.length - 1)
      addMenuAction("Move down", "down");
    if (link.parentId) addMenuAction("Move to parent", "move");
    addMenuAction("Move to…", "move-to");
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
        const menuHeight =
          actionMenu.getBoundingClientRect().height ||
          actionMenu.scrollHeight ||
          180;
        const left = Math.max(
          16,
          Math.min(window.innerWidth - menuWidth - 16, rect.right - menuWidth),
        );
        const availableBelow = window.innerHeight - rect.bottom - 16;
        const top =
          availableBelow >= menuHeight + 8
            ? rect.bottom + 8
            : Math.max(16, rect.top - menuHeight - 8);
        actionMenu.style.left = left + "px";
        actionMenu.style.top = top + "px";
      }
      mobileMenu.setAttribute("aria-expanded", String(opening));
    });
    actionMenu.addEventListener("click", (event) => event.stopPropagation());
    card.append(mobileMenu, actionMenu);

    const handle = document.createElement("span");
    handle.className = "quick-link-drag-handle";
    handle.innerHTML =
      '<span class="icon-mask icon-multidirectional-drag-handle" aria-hidden="true"></span>';
    handle.title = "Drag to reorder or move";
    handle.setAttribute("role", "button");
    handle.setAttribute("tabindex", "0");
    handle.setAttribute("aria-label", "Drag to reorder or move");
    card.append(icon, name, actions, handle);
    bindCard(card, link, handle);
    grid.appendChild(card);
  });

  // Keep the add actions at the end of the current folder.
  grid.append(addFolder, addLink);
}

function bindCard(card, link, handle) {
  card.addEventListener("click", () => {
    if (card.dataset.suppressNextClick === "true") {
      delete card.dataset.suppressNextClick;
      return;
    }
    if (dragState?.started) return;
    if (link.isFolder) navigate(link.id);
  });
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && link.isFolder) navigate(link.id);
  });
  card.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch" || event.button !== 0) return;
    if (
      event.target.closest(
        "button, .quick-link-action-menu, .quick-link-drag-handle",
      )
    )
      return;
    card.classList.add("is-long-pressing");
    startDrag(event, link, card, handle, { longPress: true });
  });
}

function navigate(folderId) {
  if (dragState?.started && dragState.card?.parentElement === grid) {
    document.body.appendChild(dragState.card);
  }
  currentFolderId = folderId;
  render();
}

function openEditor(id = null, folderMode = false) {
  editingId = id;
  creatingFolder = folderMode;
  const link = id
    ? (store.getState().links || []).find((item) => item.id === id)
    : null;
  document.getElementById("editorTitle").textContent = id
    ? link?.isFolder
      ? "Edit Folder"
      : "Edit Link"
    : folderMode
      ? "Add Folder"
      : "Add Link";
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
    links.push({
      id: generateId(),
      name,
      isFolder: true,
      parentId: currentFolderId,
    });
  } else {
    if (!url) return showToast("Please fill in the URL.", "error");
    links.push({
      id: generateId(),
      name,
      url,
      isFolder: false,
      parentId: currentFolderId,
    });
  }

  await store.setState({ links });
  closeEditor();
  render();
  showToast(
    editingId
      ? "Quick link updated"
      : creatingFolder
        ? "Folder created"
        : "Link added",
    "success",
  );
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
      if (
        link.parentId &&
        idsToDelete.has(link.parentId) &&
        !idsToDelete.has(link.id)
      ) {
        idsToDelete.add(link.id);
        changed = true;
      }
    });
  }

  await store.setState({
    links: links.filter((link) => !idsToDelete.has(link.id)),
  });
  if (currentFolderId && idsToDelete.has(currentFolderId))
    currentFolderId = null;
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
  const siblings = links.filter(
    (candidate) => (candidate.parentId || null) === (item.parentId || null),
  );
  const siblingIndex = siblings.findIndex((candidate) => candidate.id === id);
  const target = siblings[siblingIndex + direction];
  if (!target) return;
  const targetIndex = links.findIndex(
    (candidate) => candidate.id === target.id,
  );
  [links[index], links[targetIndex]] = [links[targetIndex], links[index]];
  await store.setState({ links });
  render();
}

function openMoveToPicker(itemId) {
  const initialLinks = store.getState().links || [];
  const item = initialLinks.find((link) => link.id === itemId);
  if (!item) return;
  const overlay = document.createElement("div");
  overlay.className = "quick-links-move-overlay";
  const panel = document.createElement("section");
  panel.className = "quick-links-move-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  const title = document.createElement("h2");
  title.textContent = "Move “" + item.name + "”";
  panel.appendChild(title);
  const description = document.createElement("p");
  description.className = "quick-links-move-description";
  description.textContent =
    "Choose a destination, then choose where to place it.";
  panel.appendChild(description);
  const list = document.createElement("div");
  list.className = "quick-links-move-list";
  panel.appendChild(list);
  const footer = document.createElement("div");
  footer.className = "quick-links-move-footer";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", close);
  footer.appendChild(cancel);
  panel.appendChild(footer);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  function close() {
    overlay.remove();
  }
  function choice(label, parentId) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quick-links-move-choice";
    button.textContent = label;
    button.addEventListener("click", () => showPositions(parentId, label));
    list.appendChild(button);
  }
  function notice(message) {
    const p = document.createElement("p");
    p.className = "quick-links-move-notice";
    p.textContent = message;
    list.appendChild(p);
  }
  function showDestinations() {
    list.replaceChildren();
    description.textContent = "Choose a destination folder or the dashboard.";
    choice("Dashboard", null);
    const links = store.getState().links || [];
    links
      .filter(
        (link) =>
          link.isFolder &&
          link.id !== itemId &&
          !isDescendant(link.id, itemId, links),
      )
      .forEach((folder) => choice(folder.name, folder.id));
  }
  function showPositions(parentId, destinationName) {
    list.replaceChildren();
    description.textContent =
      "Choose where to place it in " + destinationName + ".";
    const back = document.createElement("button");
    back.type = "button";
    back.className = "quick-links-move-back";
    back.textContent = "← Choose another destination";
    back.addEventListener("click", showDestinations);
    list.appendChild(back);
    const links = store.getState().links || [];
    if (parentId && isDescendant(parentId, itemId, links))
      return notice(
        "A folder cannot be moved into itself or one of its subfolders.",
      );
    const destinationDepth = parentId ? getFolderDepth(parentId, links) : 0;
    const subtreeDepth = item.isFolder
      ? getSubtreeFolderDepth(itemId, links)
      : 0;
    if (destinationDepth + subtreeDepth > 3)
      return notice(
        "This destination would exceed the maximum folder depth of 3.",
      );
    const siblings = links.filter(
      (link) => (link.parentId || null) === parentId && link.id !== itemId,
    );
    const end = document.createElement("button");
    end.type = "button";
    end.className = "quick-links-move-choice";
    end.textContent = "Move to end";
    end.addEventListener("click", () => commitMove(parentId, null, "end"));
    list.appendChild(end);
    siblings.forEach((sibling) => {
      const before = document.createElement("button");
      before.type = "button";
      before.className = "quick-links-move-choice";
      before.textContent = "Place before “" + sibling.name + "”";
      before.addEventListener("click", () =>
        commitMove(parentId, sibling.id, "before"),
      );
      list.appendChild(before);
      const after = document.createElement("button");
      after.type = "button";
      after.className = "quick-links-move-choice";
      after.textContent = "Place after “" + sibling.name + "”";
      after.addEventListener("click", () =>
        commitMove(parentId, sibling.id, "after"),
      );
      list.appendChild(after);
    });
  }
  async function commitMove(parentId, anchorId, placement) {
    const links = [...(store.getState().links || [])];
    const index = links.findIndex((link) => link.id === itemId);
    if (index < 0) return close();
    const moving = links[index];
    if (parentId && isDescendant(parentId, moving.id, links))
      return showToast(
        "A folder cannot be moved into itself or one of its subfolders.",
        "error",
      );
    const depth = parentId ? getFolderDepth(parentId, links) : 0;
    const subtree = moving.isFolder
      ? getSubtreeFolderDepth(moving.id, links)
      : 0;
    if (depth + subtree > 3)
      return showToast("Folder depth limit reached (max 3 levels).", "error");
    moving.parentId = parentId;
    links.splice(index, 1);
    let insertIndex = links.length;
    if (anchorId) {
      const anchorIndex = links.findIndex((link) => link.id === anchorId);
      if (anchorIndex >= 0)
        insertIndex = anchorIndex + (placement === "after" ? 1 : 0);
    } else {
      let last = -1;
      links.forEach((link, i) => {
        if ((link.parentId || null) === parentId) last = i;
      });
      insertIndex = last >= 0 ? last + 1 : links.length;
    }
    links.splice(insertIndex, 0, moving);
    await store.setState({ links });
    currentFolderId = parentId;
    close();
    render();
    showToast("Moved successfully", "success");
  }
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  showDestinations();
  list.querySelector("button")?.focus();
}
function createDragPreview(card, rect) {
  const preview = card.cloneNode(true);
  preview.classList.remove(
    "is-dragging",
    "is-drag-source",
    "drag-over",
    "drag-enter-folder",
    "drop-before",
    "drop-after",
  );
  preview.classList.add("quick-link-drag-preview");
  preview.style.width = rect.width + "px";
  preview.style.height = rect.height + "px";
  preview.style.left = rect.left + "px";
  preview.style.top = rect.top + "px";
  preview.setAttribute("aria-hidden", "true");
  preview.querySelectorAll("button").forEach((button) => {
    button.tabIndex = -1;
  });
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
      step = Math.ceil(
        Math.min(1, (y - (window.innerHeight - edge)) / edge) * 12,
      );
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

function startDrag(event, link, card, handle, { longPress = false } = {}) {
  if (dragState) return;
  const startX = event.clientX;
  const startY = event.clientY;
  const pointerId = event.pointerId;
  const pointerType = event.pointerType;
  let finished = false;
  let longPressTimer = 0;

  dragState = {
    link,
    card,
    handle,
    pointerId,
    startX,
    startY,
    started: false,
    target: null,
    lastX: startX,
    lastY: startY,
    offsetX: 0,
    offsetY: 0,
    width: 0,
    height: 0,
    preview: null,
    autoScrollFrame: 0,
    scrolling: false,
  };
  const session = dragState;
  const captureTarget = event.currentTarget || handle;
  try {
    captureTarget.setPointerCapture?.(pointerId);
  } catch {}

  const suppressClickAfterDrag = (clickEvent) => {
    if (!session.started) return;
    clickEvent.preventDefault();
    clickEvent.stopPropagation();
    clickEvent.stopImmediatePropagation();
    delete card.dataset.suppressNextClick;
    card.removeEventListener("click", suppressClickAfterDrag, true);
  };
  card.addEventListener("click", suppressClickAfterDrag, true);

  const beginDrag = (startEvent) => {
    if (finished || session.started) return;
    session.started = true;
    session.startScrollY = window.scrollY;
    const rect = card.getBoundingClientRect();
    session.offsetX =
      pointerType === "touch" ? rect.width / 2 : startEvent.clientX - rect.left;
    session.offsetY =
      pointerType === "touch"
        ? Math.min(24, rect.height / 3)
        : startEvent.clientY - rect.top;
    session.width = rect.width;
    session.height = rect.height;
    // Freeze the layout geometry once, before the source is lifted or a drop
    // slot is inserted. Targeting must never read geometry that our own
    // placeholder has just changed.
    const snapshotRect = (item) => {
      const rect = item.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    };
    session.targetRects = [...grid.querySelectorAll(".quick-link-card")]
      .filter((item) => item !== card && item.style.display !== "none")
      .map((item) => ({
        kind: "item",
        id: item.dataset.id,
        card: item,
        rect: snapshotRect(item),
      }));
    session.addTargetRects = [
      ...grid.querySelectorAll(".quick-link-add-card"),
    ].map((item) => ({
      kind: "append",
      card: item,
      anchorSelector: item.classList.contains("quick-link-add-link")
        ? ".quick-link-add-link"
        : ".quick-link-add-folder",
      rect: snapshotRect(item),
    }));
    grid.classList.add("quick-links-grid-drag-active");
    session.preview = createDragPreview(card, rect);
    card.classList.add("is-drag-source");
    card.classList.remove("is-long-pressing");
    window.customCursorInstance?.setCursorClass("icon-drag-grip-cursor");
    window.customCursorInstance?.setDragState(true);
    updateDragPreview(startEvent);
  };

  if (longPress) {
    longPressTimer = window.setTimeout(() => {
      longPressTimer = 0;
      if (finished) return;
      beginDrag({ clientX: session.lastX, clientY: session.lastY });
      card.dataset.suppressNextClick = "true";
    }, 420);
  }

  const cleanup = () => {
    if (finished) return;
    finished = true;
    if (session.autoScrollFrame) cancelAnimationFrame(session.autoScrollFrame);
    if (longPressTimer) window.clearTimeout(longPressTimer);
    card.classList.remove("is-long-pressing");
    if (session.started) {
      suppressCardClickUntil = Date.now() + 800;
      card.dataset.suppressNextClick = "true";
      window.setTimeout(() => {
        card.removeEventListener("click", suppressClickAfterDrag, true);
        delete card.dataset.suppressNextClick;
      }, 800);
    } else {
      card.removeEventListener("click", suppressClickAfterDrag, true);
    }
    try {
      if (captureTarget.hasPointerCapture?.(pointerId))
        captureTarget.releasePointerCapture(pointerId);
    } catch {}
    clearDropState();
    statefulRemovePreview(session.preview);
    card.classList.remove("is-drag-source");
    grid.classList.remove("quick-links-grid-drag-active");
    window.customCursorInstance?.setDragState(false);
    window.customCursorInstance?.setDragState(false);
    window.customCursorInstance?.updateCursorForElement(
      document.elementFromPoint(session.lastX, session.lastY),
    );
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("blur", onCancel);
    if (dragState === session) dragState = null;
  };

  const onMove = (moveEvent) => {
    if (finished || moveEvent.pointerId !== pointerId) return;
    const distance = Math.hypot(
      moveEvent.clientX - startX,
      moveEvent.clientY - startY,
    );
    if (longPress && !session.started && distance > 10) {
      // Movement before the hold threshold is a scroll gesture, not a drag.
      if (longPressTimer) window.clearTimeout(longPressTimer);
      longPressTimer = 0;
      session.scrolling = true;
      suppressCardClickUntil = Date.now() + 500;
      const deltaY = session.lastY - moveEvent.clientY;
      if (Math.abs(deltaY)) window.scrollBy(0, deltaY);
      session.lastX = moveEvent.clientX;
      session.lastY = moveEvent.clientY;
      moveEvent.preventDefault();
      return;
    }
    if (session.scrolling) {
      const deltaY = session.lastY - moveEvent.clientY;
      if (Math.abs(deltaY)) window.scrollBy(0, deltaY);
      session.lastX = moveEvent.clientX;
      session.lastY = moveEvent.clientY;
      moveEvent.preventDefault();
      return;
    }
    if (!session.started && distance < (pointerType === "touch" ? 10 : 5))
      return;
    if (!session.started) beginDrag(moveEvent);
    if (session.started) moveEvent.preventDefault();
    session.lastX = moveEvent.clientX;
    session.lastY = moveEvent.clientY;
    updateDragAutoScroll(moveEvent);
    updateDragPreview(moveEvent);
    updateDragTarget(moveEvent);
  };

  const onUp = async (upEvent) => {
    if (finished || upEvent.pointerId !== pointerId) return;
    if (session.started) updateDragTarget(upEvent);
    const shouldDrop = session.started && session.target;
    const finalState = { link: session.link, target: session.target };
    cleanup();
    if (shouldDrop) await performDrop(finalState);
  };
  const onCancel = () => cleanup();
  const onScroll = () => {
    if (finished || !session.started) return;
    updateDragTarget({ clientX: session.lastX, clientY: session.lastY });
  };

  window.addEventListener("pointermove", onMove, { passive: false });
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onCancel);
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("blur", onCancel);
}

function statefulRemovePreview(preview) {
  if (preview?.isConnected) preview.remove();
}

function getRectAtCurrentScroll(rect, session = dragState) {
  const startScrollY = session?.startScrollY ?? window.scrollY;
  const scrollDelta = window.scrollY - startScrollY;
  return {
    ...rect,
    top: rect.top - scrollDelta,
    bottom: rect.bottom - scrollDelta,
  };
}

function getGridTargetAtPoint(x, y) {
  const session = dragState;
  if (!session) return null;

  // Use frozen geometry so indicators and hover styles cannot move hit targets.
  // Gaps are intentionally invalid rather than being captured by nearby cards.
  for (const entry of session.targetRects || []) {
    const rect = getRectAtCurrentScroll(entry.rect, session);
    if (
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom
    ) {
      return entry;
    }
  }

  // Add tiles are explicit append targets, not approximate neighbors of cards.
  for (const entry of session.addTargetRects || []) {
    const rect = getRectAtCurrentScroll(entry.rect, session);
    if (
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom
    ) {
      return entry;
    }
  }

  return null;
}

function updateDragTarget(event) {
  if (!dragState?.started) return;
  const session = dragState;
  session.lastX = event.clientX;
  session.lastY = event.clientY;

  const hit = getGridTargetAtPoint(event.clientX, event.clientY);
  const hover = hit?.kind === "item" ? hit.card : null;
  const links = store.getState().links || [];
  let nextTarget = null;

  if (hit?.kind === "append") {
    nextTarget = currentFolderId
      ? {
          id: currentFolderId,
          position: "append",
          anchorSelector: hit.anchorSelector,
        }
      : {
          id: null,
          position: "root-end",
          anchorSelector: hit.anchorSelector,
        };
  } else if (hover) {
    const target = links.find((link) => link.id === hover.dataset.id);
    if (target && !isDescendant(target.id, session.link.id, links)) {
      const rect = getRectAtCurrentScroll(hit.rect, session);
      const rx = (event.clientX - rect.left) / Math.max(1, rect.width);
      const ry = (event.clientY - rect.top) / Math.max(1, rect.height);
      const centralFolderDrop =
        target.isFolder &&
        target.id !== session.link.id &&
        rx >= 0.16 &&
        rx <= 0.84 &&
        ry >= 0.16 &&
        ry <= 0.84;
      let position;
      if (centralFolderDrop) {
        position = "inside";
      } else {
        const dx =
          (event.clientX - (rect.left + rect.width / 2)) /
          Math.max(1, rect.width);
        const dy =
          (event.clientY - (rect.top + rect.height / 2)) /
          Math.max(1, rect.height);
        position =
          Math.abs(dx) > Math.abs(dy)
            ? dx < 0
              ? "before"
              : "after"
            : dy < 0
              ? "before"
              : "after";
      }
      nextTarget = { id: target.id, position };
    }
  }

  const targetKey = (target) =>
    target
      ? String(target.id ?? "root") +
        ":" +
        target.position +
        ":" +
        (target.anchorSelector || "")
      : "";
  const oldKey = targetKey(session.target);
  const newKey = targetKey(nextTarget);
  if (oldKey === newKey) {
    if (
      nextTarget?.position === "root-end" ||
      nextTarget?.position === "append"
    ) {
      positionDropSlotAtAnchor();
    }
    return;
  }

  clearDropState();
  session.target = nextTarget;
  if (!nextTarget) return;

  if (nextTarget.position === "inside") {
    hover?.classList.add("drag-enter-folder");
  } else if (
    nextTarget.position === "root-end" ||
    nextTarget.position === "append"
  ) {
    showDropSlot(null, nextTarget.position, newKey, nextTarget.anchorSelector);
  } else if (hover) {
    hover.classList.add(
      nextTarget.position === "before" ? "drop-before" : "drop-after",
    );
  }
  // Avoid transforms during a drag: they can feed back into hit-testing.
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
  } else if (state.target.position === "append") {
    target = links.find((link) => link.id === state.target.id);
    if (!target?.isFolder) return;
    destinationParentId = target.id;
  } else {
    target = links.find((link) => link.id === state.target.id);
    if (!target) return;
    destinationParentId =
      state.target.position === "inside"
        ? target.isFolder
          ? target.id
          : currentFolderId
        : target.parentId || null;
  }

  if (
    destinationParentId &&
    isDescendant(destinationParentId, dragged.id, links)
  ) {
    showToast(
      "A folder cannot be moved into itself or one of its descendants.",
      "error",
    );
    return;
  }

  // Validate the whole folder subtree, not just the folder being dragged.
  const destinationDepth = destinationParentId
    ? getFolderDepth(destinationParentId, links)
    : 0;
  const subtreeDepth = dragged.isFolder
    ? getSubtreeFolderDepth(dragged.id, links)
    : 0;
  if (destinationDepth + subtreeDepth > 3) {
    showToast("Folder depth limit reached (max 3 levels).", "error");
    return;
  }

  if (state.target.position === "root-end") {
    dragged.parentId = null;
    links.splice(draggedIndex, 1);
    links.push(dragged);
  } else if (
    state.target.position === "inside" ||
    state.target.position === "append"
  ) {
    if (!destinationParentId) return;
    dragged.parentId = destinationParentId;
    links.splice(draggedIndex, 1);
    const folderChildren = links.filter(
      (link) => (link.parentId || null) === destinationParentId,
    );
    const lastChild = folderChildren[folderChildren.length - 1];
    const insertIndex = lastChild ? links.indexOf(lastChild) + 1 : links.length;
    links.splice(insertIndex, 0, dragged);
  } else {
    dragged.parentId = destinationParentId;
    links.splice(draggedIndex, 1);
    const newTargetIndex = links.findIndex((link) => link.id === target.id);
    if (newTargetIndex < 0) return;
    links.splice(
      state.target.position === "before" ? newTargetIndex : newTargetIndex + 1,
      0,
      dragged,
    );
  }

  await store.setState({ links });
  // Make a successful folder drop immediately visible instead of leaving the
  // moved item hidden inside a folder that is still closed.
  if (state.target.position === "inside" && destinationParentId) {
    currentFolderId = destinationParentId;
  }
  render();
}
document
  .getElementById("rootBtn")
  .addEventListener("click", () => navigate(null));
document.getElementById("cancelEditBtn").addEventListener("click", closeEditor);
document.getElementById("saveLinkBtn").addEventListener("click", saveEditor);
editor.addEventListener("click", (event) => {
  if (event.target === editor) closeEditor();
});
function closeDesktopActionMenus() {
  document.querySelectorAll(".quick-link-desktop-action-menu").forEach((menu) => {
    menu.hidden = true;
    menu.closest(".quick-link-actions")
      ?.querySelector(".quick-link-desktop-menu-button")
      ?.setAttribute("aria-expanded", "false");
  });
}
function closeMobileActionMenus() {
  document.querySelectorAll(".quick-link-action-menu").forEach((menu) => {
    menu.hidden = true;
    const card = menu._ownerCard || menu.closest(".quick-link-card");
    card?.classList.remove("menu-open");
    card
      ?.querySelector(".quick-link-mobile-menu")
      ?.setAttribute("aria-expanded", "false");
    if (card && menu.parentElement !== card) card.appendChild(menu);
  });
}
document.addEventListener(
  "click",
  (event) => {
    if (
      Date.now() < suppressCardClickUntil &&
      event.target.closest(".quick-link-card")
    ) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return;
    }
    if (
      !event.target.closest(".quick-link-mobile-menu, .quick-link-action-menu")
    )
      closeMobileActionMenus();
    if (!event.target.closest(".quick-link-desktop-menu-button, .quick-link-desktop-action-menu"))
      closeDesktopActionMenus();
  },
  true,
);
window.addEventListener("resize", closeMobileActionMenus);
window.addEventListener("resize", closeDesktopActionMenus);
window.addEventListener("scroll", closeMobileActionMenus, true);
window.addEventListener("scroll", closeDesktopActionMenus, true);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!editor.classList.contains("hidden")) closeEditor();
    closeMobileActionMenus();
    closeDesktopActionMenus();
  }
});

installQuickLinksDragEngine({
  grid,
  getCurrentFolderId: () => currentFolderId,
  getLinks: () => store.getState().links || [],
  onDrop: performDrop,
});

await store.init();
await loadSettings();
document.body.classList.add("quick-links-body");
new CustomCursorEngine();
await new Promise((resolve) => requestAnimationFrame(resolve));
render();
