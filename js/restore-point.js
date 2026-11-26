import { store } from "./store.js";
import { getDBValue, putDBValue, deleteDBValue } from "./indexed-db.js";

const KEY = "restorePoint";

async function readPoint() {
  return (await getDBValue(KEY)) || null;
}

async function writePoint(point) {
  await putDBValue(KEY, point);
}

async function getBackground() {
  return (await getDBValue("backgroundImage")) || null;
}

async function setBackground(background) {
  if (background) {
    await putDBValue("backgroundImage", background);
  } else {
    await deleteDBValue("backgroundImage");
  }
}

async function captureCurrent() {
  const state = store.getState();
  const background =
    state.settings?.backgroundImage === "indexeddb"
      ? await getBackground()
      : null;
  return {
    links: structuredClone(state.links || []),
    settings: structuredClone(state.settings || {}),
    history: structuredClone(state.searchHistory || []),
    background,
    createdAt: Date.now(),
  };
}

export async function saveRestorePoint() {
  await writePoint(await captureCurrent());
}

if (typeof window !== "undefined") {
  window.saveRestorePointBeforeReset = saveRestorePoint;
}

export async function restorePrevious() {
  const point = await readPoint();
  if (!point) return false;
  const current = await captureCurrent();
  const settings = structuredClone(point.settings || {});
  if (settings.backgroundImage === "indexeddb" && point.background) {
    await setBackground(point.background);
  } else {
    await setBackground(null);
    if (settings.backgroundImage === "indexeddb")
      settings.backgroundImage = null;
  }
  await store.setState({
    links: structuredClone(point.links || []),
    settings,
    searchHistory: structuredClone(point.history || []),
  });
  await writePoint(current);
  window.location.reload();
  return true;
}

export async function hasRestorePoint() {
  return Boolean(await readPoint());
}

async function updateButton(button, status) {
  const point = await readPoint();
  button.disabled = !point;
  if (point) {
    const savedAt = new Date(point.createdAt).toLocaleString();
    button.title = `Saved ${savedAt}`;
    if (status)
      status.textContent = `Revert to your last restore point. Saved ${savedAt}.`;
  } else {
    button.title = "No restore point available yet";
    if (status) status.textContent = "No previous restore point available yet.";
  }
}

function showConfirm() {
  return new Promise((resolve) => {
    const modal = document.createElement("div");
    modal.className = "modal active";
    modal.innerHTML = `
      <div class="modal-content custom-dialog-content">
        <h3 class="custom-dialog-title">Restore Previous Configuration?</h3>
        <p class="custom-dialog-message">Your current configuration will be saved as the new restore point.</p>
        <div class="custom-dialog-actions">
          <button type="button" class="secondary" data-cancel>Cancel</button>
          <button type="button" class="save-btn" data-confirm>Restore Previous</button>
        </div>
      </div>`;
    const finish = (value) => {
      modal.remove();
      resolve(value);
    };
    modal
      .querySelector("[data-cancel]")
      .addEventListener("click", () => finish(false));
    modal
      .querySelector("[data-confirm]")
      .addEventListener("click", () => finish(true));
    modal.addEventListener("click", (event) => {
      if (event.target === modal) finish(false);
    });
    document.body.appendChild(modal);
    modal.querySelector("[data-cancel]").focus();
  });
}

async function init() {
  const button = document.getElementById("restorePreviousBtn");
  const status = document.getElementById("restorePointStatus");
  const resetButton = document.getElementById("resetSettingsBtn");

  if (!button) return;
  await updateButton(button, status);
  button.addEventListener("click", async () => {
    if (!(await showConfirm())) return;
    try {
      await restorePrevious();
    } catch (error) {
      console.error("Failed restoring previous configuration:", error);
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
