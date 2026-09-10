function setupSettingsLayout() {
  const modal = document.getElementById("settingsModal");
  const modalContent = modal?.querySelector(".modal-content");
  const footer = modalContent?.querySelector(":scope > .modal-footer");
  const scrollAnchor = document.getElementById("settingsModalScrollAnchor");

  if (!modal || !modalContent || !footer || modalContent.parentElement?.classList.contains("settings-dialog")) {
    return;
  }

  const dialog = document.createElement("div");
  dialog.className = "settings-dialog";

  modal.insertBefore(dialog, modalContent);
  dialog.append(modalContent, footer);

  if (scrollAnchor) {
    dialog.appendChild(scrollAnchor);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupSettingsLayout, { once: true });
} else {
  setupSettingsLayout();
}
