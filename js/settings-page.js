const root = document.getElementById("settingsPageRoot");

function createCategoryGrid(sourceModal) {
  const content = sourceModal.querySelector(".modal-content");
  if (!content) return;

  const footer = content.querySelector(":scope > .modal-footer");
  const panels = Array.from(
    content.querySelectorAll(":scope > details.category-panel"),
  );

  if (!panels.length) return;

  const grid = document.createElement("div");
  grid.className = "settings-category-grid";

  panels.forEach((panel) => grid.appendChild(panel));

  if (footer) {
    content.insertBefore(grid, footer);
  } else {
    content.appendChild(grid);
  }
}

async function loadSettingsSurface() {
  if (!root) return;

  const response = await fetch("./index.html", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load settings source: ${response.status}`);
  }

  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  const sourceModal = doc.getElementById("settingsModal");

  if (!sourceModal) {
    throw new Error("Settings modal was not found in index.html");
  }

  root.appendChild(sourceModal);
  sourceModal.classList.add("active");
  createCategoryGrid(sourceModal);
}

await loadSettingsSurface();
await import("./main.js");

document.getElementById("closeSettingsBtn")?.addEventListener("click", () => {
  window.location.href = "./index.html";
});
