import { store } from "./store.js";

const DB_CONFIG = { name: "0FluffDB", version: 1, store: "assets" };
let cachedDBPromise = null;
let cachedBgData = null;

export function openDB() {
  if (cachedDBPromise) return cachedDBPromise;

  cachedDBPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(DB_CONFIG.store)) {
        db.createObjectStore(DB_CONFIG.store);
      }
    };
    req.onsuccess = (e) => {
      const db = e.target.result;
      db.onclose = () => {
        cachedDBPromise = null;
      };
      db.onerror = () => {
        cachedDBPromise = null;
      };
      resolve(db);
    };
    req.onerror = (e) => {
      cachedDBPromise = null;
      reject(e.target.error);
    };
  });

  return cachedDBPromise;
}

export async function saveBgToDB(data) {
  cachedBgData = data;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_CONFIG.store, "readwrite");
    const storeObj = tx.objectStore(DB_CONFIG.store);
    const req = storeObj.put(data, "backgroundImage");
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getBgFromDB() {
  if (cachedBgData) return cachedBgData;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_CONFIG.store, "readonly");
    const storeObj = tx.objectStore(DB_CONFIG.store);
    const req = storeObj.get("backgroundImage");
    req.onsuccess = () => {
      cachedBgData = req.result;
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function clearBgFromDB() {
  cachedBgData = null;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_CONFIG.store, "readwrite");
    const storeObj = tx.objectStore(DB_CONFIG.store);
    storeObj.delete("backgroundImage");
    tx.oncomplete = () => resolve();
  });
}

export async function backupData() {
  const { links, settings, searchHistory } = store.getState();
  let bgMediaData = null;

  if (settings?.backgroundImage === "indexeddb") {
    try {
      const rawBg = await getBgFromDB();
      if (rawBg && (rawBg instanceof Blob || rawBg instanceof File)) {
        const buffer = await rawBg.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        bgMediaData = {
          type: rawBg.type,
          name: rawBg.name || "background",
          base64: btoa(binary),
        };
      }
    } catch (e) {
      console.warn("Failed exporting background media from DB:", e);
    }
  }

  const data = {
    links: links || [],
    settings: settings || {},
    history: searchHistory || [],
    bgMediaData,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "0FluffStart_Backup.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function restoreData(e, customConfirmFn, showToastFn) {
  const file = e.target?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const data = JSON.parse(event.target.result);
      const confirm =
        typeof customConfirmFn === "function"
          ? customConfirmFn
          : (msg, title) => Promise.resolve(window.confirm(`${title}\n${msg}`));
      const toast =
        typeof showToastFn === "function" ? showToastFn : (msg) => alert(msg);

      const confirmed = await confirm(
        "Restoring from backup will overwrite all current links and settings.",
        "Restore Backup?",
      );
      if (confirmed) {
        if (data.bgMediaData) {
          try {
            let bgBlob = data.bgMediaData;
            if (data.bgMediaData.base64) {
              const binary = atob(data.bgMediaData.base64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
              }
              bgBlob = new File(
                [bytes],
                data.bgMediaData.name || "background",
                {
                  type: data.bgMediaData.type,
                },
              );
            }
            await saveBgToDB(bgBlob);
          } catch (e) {
            console.warn("Failed restoring background payload to DB:", e);
          }
        }

        await store.setState({
          links: data.links || [],
          settings: data.settings || {},
          searchHistory: data.history || [],
        });

        toast("Backup restored successfully", "success");
        setTimeout(() => window.location.reload(), 500);
      }
    } catch (err) {
      const toast =
        typeof showToastFn === "function" ? showToastFn : (msg) => alert(msg);
      toast("Restore failed: " + err.message, "error");
    }
  };
  reader.readAsText(file);
}
