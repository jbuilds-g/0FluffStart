const DB_CONFIG = { name: "0FluffDB", version: 1, store: "assets" };
let dbPromise = null;

export function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_CONFIG.store)) {
        db.createObjectStore(DB_CONFIG.store);
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onclose = () => {
        dbPromise = null;
      };
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };

    request.onblocked = () => {
      dbPromise = null;
      reject(new Error("IndexedDB upgrade is blocked by another open connection."));
    };
  });

  return dbPromise;
}

async function runRequest(mode, createRequest) {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    let result;
    const transaction = db.transaction(DB_CONFIG.store, mode);
    const objectStore = transaction.objectStore(DB_CONFIG.store);
    const request = createRequest(objectStore);

    request.onsuccess = () => {
      result = request.result;
    };
    request.onerror = () => reject(request.error);

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error || new Error("IndexedDB transaction aborted."));
  });
}

export function getDBValue(key) {
  return runRequest("readonly", (objectStore) => objectStore.get(key));
}

export function putDBValue(key, value) {
  return runRequest("readwrite", (objectStore) =>
    objectStore.put(value, key),
  );
}

export function deleteDBValue(key) {
  return runRequest("readwrite", (objectStore) =>
    objectStore.delete(key),
  );
}
