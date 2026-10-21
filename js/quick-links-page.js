import { customConfirm, loadSettings, showToast } from "./ui.js";
import { CustomCursorEngine } from "./cursor.js";
import { store } from "./store.js";
import { generateId } from "./utils.js";
import { getFolderDepth } from "./links.js";
import { installQuickLinksDragEngine } from "./quick-links-drag.js?v=17";

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
  closeDesktopActionMenus();
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
    icon.title = link.name;
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

    const addDesktopMenuAction = (label, action, iconClass, iconStyle = "") => {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("role", "menuitem");
      button.dataset.action = action;
      const icon = document.createElement("span");
      icon.className = `icon-mask ${iconClass}`;
      icon.setAttribute("aria-hidden", "true");
      if (iconStyle) icon.style.cssText = iconStyle;
      const text = document.createElement("span");
      text.className = "quick-link-action-label";
      text.textContent = label;
      button.append(icon, text);
      button.addEventListener("click", async (event) => {
        event.stopPropagation();
        closeDesktopActionMenus();
        if (action === "edit") openEditor(link.id);
        else if (action === "left") await moveSibling(link.id, -1);
        else if (action === "right") await moveSibling(link.id, 1);
        else if (action === "move") await moveOut(link.id);
        else if (action === "move-to") openMoveToPicker(link.id);
        else if (action === "delete") await deleteItem(link.id);
      });
      desktopActionMenu.appendChild(button);
    };

    addDesktopMenuAction("Edit", "edit", "icon-edit");
    const desktopSiblings = childrenOf(link.parentId || null);
    const desktopSiblingIndex = desktopSiblings.findIndex((item) => item.id === link.id);
    if (desktopSiblingIndex > 0)
      addDesktopMenuAction("Move left", "left", "icon-arrow-up", "transform:rotate(-90deg)");
    if (desktopSiblingIndex >= 0 && desktopSiblingIndex < desktopSiblings.length - 1)
      addDesktopMenuAction("Move right", "right", "icon-arrow-up", "transform:rotate(90deg)");
    if (link.parentId) addDesktopMenuAction("Move to parent", "move", "icon-back");
    addDesktopMenuAction("Move to…", "move-to", "icon-folder");
    addDesktopMenuAction("Delete", "delete", "icon-delete");

    desktopMenuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      const opening = desktopActionMenu.hidden;
      closeDesktopActionMenus();
      closeMobileActionMenus();
      if (opening) {
        // Move the menu out of the card before measuring/positioning it.
        // A transformed ancestor can otherwise become the containing block
        // for position: fixed and make the menu appear in the wrong place.
        desktopActionMenu._ownerCard = card;
        desktopActionMenu._ownerActions = actions;
        desktopActionMenu._triggerButton = desktopMenuButton;
        document.body.appendChild(desktopActionMenu);
        desktopActionMenu.hidden = false;
        card.classList.add("desktop-menu-open");
        desktopMenuButton.setAttribute("aria-expanded", "true");

        desktopActionMenu.style.position = "fixed";
        desktopActionMenu.style.right = "auto";
        desktopActionMenu.style.bottom = "auto";
        desktopActionMenu.style.left = "0px";
        desktopActionMenu.style.top = "0px";
        const triggerRect = desktopMenuButton.getBoundingClientRect();
        const menuRect = desktopActionMenu.getBoundingClientRect();
        const gap = 8;
        const viewportPadding = 8;
        const desiredTop = triggerRect.top - menuRect.height - gap;
        const maxTop = Math.max(
          viewportPadding,
          window.innerHeight - menuRect.height - viewportPadding,
        );
        // Prefer opening upward; clamp to the viewport top if the trigger is
        // too close to the top to fit the full menu above it.
        const top = Math.min(Math.max(viewportPadding, desiredTop), maxTop);
        const left = Math.min(
          Math.max(viewportPadding, triggerRect.right - menuRect.width),
          Math.max(viewportPadding, window.innerWidth - menuRect.width - viewportPadding),
        );
        desktopActionMenu.style.top = top + "px";
        desktopActionMenu.style.left = left + "px";
      }
    });
    desktopActionMenu.addEventListener("click", (event) => event.stopPropagation());
    actions.append(desktopMenuButton, desktopActionMenu);

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
    if (link.isFolder) navigate(link.id);
  });
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && link.isFolder) navigate(link.id);
  });
}

function navigate(folderId) {
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
  function showCreateFolderForm() {
    const form = document.createElement("form");
    form.className = "quick-links-move-create-form";
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 50;
    input.autocomplete = "off";
    input.placeholder = "Folder name";
    input.setAttribute("aria-label", "New folder name");
    const actions = document.createElement("div");
    actions.className = "quick-links-move-create-actions";
    const cancelCreate = document.createElement("button");
    cancelCreate.type = "button";
    cancelCreate.className = "quick-links-move-secondary";
    cancelCreate.textContent = "Cancel";
    cancelCreate.addEventListener("click", showDestinations);
    const create = document.createElement("button");
    create.type = "submit";
    create.className = "quick-links-move-primary";
    create.textContent = "Create folder";
    actions.append(cancelCreate, create);
    form.append(input, actions);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const name = input.value.trim().slice(0, 50);
      if (!name) {
        input.focus();
        return;
      }
      const links = [...(store.getState().links || [])];
      const parentId = item.parentId || null;
      const destinationDepth = parentId ? getFolderDepth(parentId, links) : 0;
      const movingSubtreeDepth = item.isFolder
        ? getSubtreeFolderDepth(itemId, links)
        : 0;
      if (destinationDepth + 1 + movingSubtreeDepth > 3) {
        notice("This folder would exceed the maximum folder depth of 3.");
        return;
      }
      const folder = {
        id: generateId(),
        name,
        isFolder: true,
        parentId,
      };
      links.push(folder);
      await store.setState({ links });
      showDestinations();
      showPositions(folder.id, folder.name);
    });
    list.appendChild(form);
    input.focus();
  }
  function showDestinations() {
    list.replaceChildren();
    description.textContent = "Choose a destination folder or the dashboard.";
    choice("Dashboard", null);
    const createFolder = document.createElement("button");
    createFolder.type = "button";
    createFolder.className = "quick-links-move-create-trigger";
    createFolder.textContent = "+  New folder";
    createFolder.addEventListener("click", showCreateFolderForm);
    list.appendChild(createFolder);
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
    const card = menu._ownerCard || menu.closest(".quick-link-card");
    const trigger = menu._triggerButton ||
      menu.closest(".quick-link-actions")?.querySelector(".quick-link-desktop-menu-button");
    card?.classList.remove("desktop-menu-open");
    trigger?.setAttribute("aria-expanded", "false");
    const ownerActions = menu._ownerActions || card?.querySelector(".quick-link-actions");
    if (ownerActions && menu.parentElement !== ownerActions) ownerActions.appendChild(menu);
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
