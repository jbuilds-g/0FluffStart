import { store } from "./store.js";
import { saveRestorePoint } from "./restore-point.js";

const DB_CONFIG = { name: "0FluffDB", version: 1, store: "assets" };
let cachedDBPromise = null;
let cachedBgData = null;

export function openDB() {
  if (cachedDBPromise) return cachedDBPromise;
  cachedDBPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(DB_CONFIG.store)) db.createObjectStore(DB_CONFIG.store);
    };
    req.onsuccess = (e) => {
      const db = e.target.result;
      db.onclose = () => { cachedDBPromise = null; };
      db.onerror = () => { cachedDBPromise = null; };
      resolve(db);
    };
    req.onerror = (e) => { cachedDBPromise = null; reject(e.target.error); };
  });
  return cachedDBPromise;
}

export async function saveBgToDB(data) {
  cachedBgData = data;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_CONFIG.store, "readwrite");
    const req = tx.objectStore(DB_CONFIG.store).put(data, "backgroundImage");
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getBgFromDB() {
  if (cachedBgData) return cachedBgData;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(DB_CONFIG.store, "readonly").objectStore(DB_CONFIG.store).get("backgroundImage");
    req.onsuccess = () => { cachedBgData = req.result; resolve(req.result); };
    req.onerror = () => reject(req.error);
  });
}

export async function clearBgFromDB() {
  cachedBgData = null;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_CONFIG.store, "readwrite");
    tx.objectStore(DB_CONFIG.store).delete("backgroundImage");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function removeParentheticalUiText() {
  const replacements = new Map([
    ["Backup (Save)", "Backup"],
    ["Restore (Load)", "Restore"],
    ["Vibe (Theme)", "Vibe"],
    ["OLED Dark (Default)", "OLED Dark"],
    ["True Black (AMOLED)", "True Black"],
    ["Automatic (Smart Match & Fallback)", "Automatic"],
    ["Name (e.g. YouTube)", "Name, e.g. YouTube"],
    ["URL (e.g. youtube.com)", "URL, e.g. youtube.com"],
    ["Custom Proxy (e.g., https://my-proxy.com/?)", "Custom Proxy, e.g. https://my-proxy.com/?"],
    ["Title (e.g. Phind)", "Title, e.g. Phind"],
    ["Tag (e.g. ?pd)", "Tag, e.g. ?pd"],
    ["Search URL (e.g. https://phind.com/search?q=)", "Search URL, e.g. https://phind.com/search?q="],
  ]);
  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const value = node.nodeValue.trim();
      const replacement = replacements.get(value);
      if (replacement) node.nodeValue = node.nodeValue.replace(value, replacement);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || ["SCRIPT", "STYLE"].includes(node.tagName)) return;
    for (const child of node.childNodes) walk(child);
    for (const attr of ["placeholder", "title"]) {
      const value = node.getAttribute(attr);
      if (value && replacements.has(value)) node.setAttribute(attr, replacements.get(value));
    }
  };
  if (document.body) walk(document.body);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", removeParentheticalUiText, { once: true });
} else {
  removeParentheticalUiText();
}

async function captureCurrentSnapshot() {
  const { links, settings, searchHistory } = store.getState();
  let background = null;
  if (settings?.backgroundImage === "indexeddb") {
    try {
      const rawBg = await getBgFromDB();
      if (rawBg instanceof Blob || rawBg instanceof File) background = rawBg;
    } catch (e) {
      console.warn("Failed capturing background for restore point:", e);
    }
  }
  return {
    links: structuredClone(Array.isArray(links) ? links : []),
    settings: structuredClone(settings && typeof settings === "object" ? settings : {}),
    history: structuredClone(Array.isArray(searchHistory) ? searchHistory : []),
    background,
    createdAt: Date.now(),
  };
}

async function normalizeImportedData(data) {
  return {
    links: Array.isArray(data?.links) ? data.links : [],
    settings: data?.settings && typeof data.settings === "object" && !Array.isArray(data.settings) ? data.settings : {},
    history: Array.isArray(data?.history) ? data.history : [],
    bgMediaData: data?.bgMediaData || null,
  };
}

function mergeLinks(currentLinks, importedLinks) {
  const merged = Array.isArray(currentLinks) ? [...currentLinks] : [];
  const existingIds = new Set(merged.map((item) => item?.id).filter(Boolean));
  for (const item of importedLinks) {
    if (!item || typeof item !== "object") continue;
    if (item.id && existingIds.has(item.id)) continue;
    merged.push(item);
    if (item.id) existingIds.add(item.id);
  }
  return merged;
}

function mergeSettings(currentSettings, importedSettings, hasImportedBackground) {
  const imported = { ...importedSettings };
  if (!hasImportedBackground) delete imported.backgroundImage;
  return { ...(currentSettings || {}), ...imported };
}

async function restoreBackground(bgMediaData, overwrite) {
  if (bgMediaData?.base64) {
    const binary = atob(bgMediaData.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    await saveBgToDB(new File([bytes], bgMediaData.name || "background", { type: bgMediaData.type || "application/octet-stream" }));
  } else if (overwrite) {
    await clearBgFromDB();
  }
}

function showRestoreChoice(data) {
  return new Promise((resolve) => {
    document.getElementById("restoreChoiceModal")?.remove();
    const links = Array.isArray(data?.links) ? data.links : [];
    const folders = links.filter((item) => item?.isFolder).length;
    const settingsCount = data?.settings && typeof data.settings === "object" ? Object.keys(data.settings).length : 0;
    const historyCount = Array.isArray(data?.history) ? data.history.length : 0;
    const modal = document.createElement("div");
    modal.className = "modal active";
    modal.id = "restoreChoiceModal";
    modal.innerHTML = `
      <div class="modal-content custom-dialog-content restore-choice-content">
        <h3 class="custom-dialog-title">Restore Backup</h3>
        <p class="custom-dialog-message">Choose how to apply this backup.</p>
        <div class="restore-choice-summary">
          <span>• ${links.length - folders} quick links</span>
          <span>• ${folders} folders</span>
          <span>• ${settingsCount} settings</span>
          <span>• ${historyCount} history entries</span>
        </div>
        <div class="restore-choice-actions">
          <button type="button" class="secondary restore-choice-btn-overwrite">Overwrite</button>
          <button type="button" class="save-btn restore-choice-btn-merge">Merge</button>
        </div>
        <button type="button" class="secondary restore-choice-cancel">Cancel</button>
      </div>`;
    const finish = (choice) => { modal.remove(); resolve(choice); };
    modal.addEventListener("click", (event) => { if (event.target === modal) finish("cancel"); });
    modal.querySelector(".restore-choice-btn-overwrite")?.addEventListener("click", () => finish("overwrite"));
    modal.querySelector(".restore-choice-btn-merge")?.addEventListener("click", () => finish("merge"));
    modal.querySelector(".restore-choice-cancel")?.addEventListener("click", () => finish("cancel"));
    document.body.appendChild(modal);
    modal.querySelector(".restore-choice-btn-merge")?.focus();
  });
}

function ensureRestoreChoiceStyles() {
  if (document.getElementById("restoreChoiceStyles")) return;
  const style = document.createElement("style");
  style.id = "restoreChoiceStyles";
  style.textContent = `
    .restore-choice-content { width: min(520px, 92vw); }
    .restore-choice-summary { display: grid; gap: 8px; margin: 0 0 20px; color: var(--text); font-size: .95rem; }
    .restore-choice-summary span { display: block; }
    .restore-choice-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .restore-choice-actions button, .restore-choice-cancel { margin: 0; }
    .restore-choice-btn-overwrite { background: var(--delete); color: var(--text); }
    .restore-choice-btn-merge { background: var(--accent); color: var(--bg); }
    .restore-choice-cancel { width: 100%; margin-top: 10px; }
  `;
  document.head.appendChild(style);
}

ensureRestoreChoiceStyles();

export async function backupData() {
  const data = await captureCurrentSnapshot();
  const exportData = { links: data.links, settings: data.settings, history: data.history, bgMediaData: null };
  if (data.background) {
    try {
      const bytes = new Uint8Array(await data.background.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      exportData.bgMediaData = { type: data.background.type, name: data.background.name || "background", base64: btoa(binary) };
    } catch (e) {
      console.warn("Failed exporting background media from DB:", e);
    }
  }
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "0FluffStart_Backup.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function restoreData(e, chooseRestoreModeFn, showToastFn) {
  const file = e.target?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const data = await normalizeImportedData(JSON.parse(event.target.result));
      const toast = typeof showToastFn === "function" ? showToastFn : (msg) => alert(msg);
      const mode = await showRestoreChoice(data);
      if (mode !== "overwrite" && mode !== "merge") return;

      await saveRestorePoint();
      const current = store.getState();
      const hasImportedBackground = Boolean(data.bgMediaData?.base64);

      if (mode === "overwrite") {
        const settings = { ...data.settings };
        if (settings.backgroundImage === "indexeddb" && !hasImportedBackground) settings.backgroundImage = null;
        await restoreBackground(data.bgMediaData, true);
        store.setState({ links: data.links, settings, searchHistory: data.history });
      } else {
        await restoreBackground(data.bgMediaData, false);
        store.setState({
          links: mergeLinks(current.links, data.links),
          settings: mergeSettings(current.settings, data.settings, hasImportedBackground),
          searchHistory: [...new Set([...(current.searchHistory || []), ...data.history])],
        });
      }

      toast(mode === "overwrite" ? "Backup restored successfully" : "Backup merged successfully", "success");
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      const toast = typeof showToastFn === "function" ? showToastFn : (msg) => alert(msg);
      toast("Restore failed: " + err.message, "error");
    } finally {
      if (e.target) e.target.value = "";
    }
  };
  reader.readAsText(file);
}
