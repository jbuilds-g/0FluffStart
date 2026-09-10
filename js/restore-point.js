import { store } from "./store.js";

const DB_NAME = "0FluffDB";
const DB_VERSION = 1;
const STORE_NAME = "assets";
const KEY = "restorePoint";

let dbPromise;

function openRestoreDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function readPoint() {
  const db = await openRestoreDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function writePoint(point) {
  const db = await openRestoreDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(point, KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getBackground() {
  const db = await openRestoreDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get("backgroundImage");
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function setBackground(background) {
  const db = await openRestoreDB();
  return new Promise((resolve, reject) => {
    const objectStore = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
    const request = background ? objectStore.put(background, "backgroundImage") : objectStore.delete("backgroundImage");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function captureCurrent() {
  const state = store.getState();
  const background = state.settings?.backgroundImage === "indexeddb" ? await getBackground() : null;
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

export async function restorePrevious() {
  const point = await readPoint();
  if (!point) return false;

  const current = await captureCurrent();
  const settings = structuredClone(point.settings || {});

  if (settings.backgroundImage === "indexeddb" && point.background) {
    await setBackground(point.background);
  } else {
    await setBackground(null);
    if (settings.backgroundImage === "indexeddb") settings.backgroundImage = null;
  }

  store.setState({
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

export async function getRestorePointInfo() {
  const point = await readPoint();
  return point ? { createdAt: point.createdAt } : null;
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
    const finish = (value) => { modal.remove(); resolve(value); };
    modal.querySelector("[data-cancel]").addEventListener("click", () => finish(false));
    modal.querySelector("[data-confirm]").addEventListener("click", () => finish(true));
    modal.addEventListener("click", (event) => { if (event.target === modal) finish(false); });
    document.body.appendChild(modal);
    modal.querySelector("[data-cancel]").focus();
  });
}

async function updateButton(button) {
  const point = await readPoint();
  button.disabled = !point;
  button.title = point ? `Saved ${new Date(point.createdAt).toLocaleString()}` : "No restore point available yet";
}

async function init() {
  const restoreButton = document.getElementById("restoreDataBtn");
  if (!restoreButton) return;
  const section = restoreButton.closest(".setting-group");
  if (!section || document.getElementById("restorePreviousBtn")) return;

  const row = document.createElement("div");
  row.className = "action-btn-row restore-point-row";
  row.innerHTML = `<button id="restorePreviousBtn" class="secondary" type="button">Restore Previous</button>`;
  section.appendChild(row);

  const button = row.querySelector("#restorePreviousBtn");
  await updateButton(button);
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
