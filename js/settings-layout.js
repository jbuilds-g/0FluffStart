function setupSettingsLayout() {
  const modal = document.getElementById("settingsModal");
  const modalContent = modal?.querySelector(":scope > .modal-content");
  const header = modalContent?.querySelector(":scope > .modal-header");
  const footer = modalContent?.querySelector(":scope > .modal-footer");
  const scrollAnchor = document.getElementById("settingsModalScrollAnchor");

  if (
    !modal ||
    !modalContent ||
    !header ||
    !footer ||
    modal.querySelector(":scope > .settings-dialog")
  ) {
    return;
  }

  const dialog = document.createElement("div");
  dialog.className = "settings-dialog";

  modal.insertBefore(dialog, modalContent);
  dialog.append(header, modalContent, footer);

  if (scrollAnchor) {
    dialog.appendChild(scrollAnchor);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupSettingsLayout, { once: true });
} else {
  setupSettingsLayout();
}
