const root = document.getElementById("settingsPageRoot");

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

  await import("./main.js");
  document.dispatchEvent(new Event("DOMContentLoaded"));

  document.getElementById("closeSettingsBtn")?.addEventListener("click", () => {
    window.location.href = "./index.html";
  });
}

loadSettingsSurface().catch((error) => {
  console.error("Settings page initialization failed:", error);
  if (root) root.textContent = "Unable to load Settings.";
});
