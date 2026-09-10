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
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function readPoint() {
  const db = await openRestoreDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly")
      .objectStore(STORE_NAME)
      .get(KEY);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function writePoint(point) {
  const db = await openRestoreDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readwrite")
      .objectStore(STORE_NAME)
      .put(point, KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getBackground() {
  const db = await openRestoreDB();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly")
      .objectStore(STORE_NAME)
      .get("backgroundImage");
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function setBackground(background) {
  const db = await openRestoreDB();
  return new Promise((resolve, reject) => {
    const objectStore = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
    const request = background
      ? objectStore.put(background, "backgroundImage")
      : objectStore.delete("backgroundImage");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function captureCurrent() {
  const state = store.getState();
  const background = state.settings?.backgroundImage === "indexeddb"
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
