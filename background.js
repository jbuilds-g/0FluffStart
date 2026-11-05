/* External capture bridge for the 0FluffStart companion. */
const ALLOWED_COMPANION_IDS = new Set([
  // Add the verified companion extension IDs here before enabling capture.
]);

const LINKS_KEY = "0fluff_links";
const SETTINGS_KEY = "0fluff_settings";
let writeQueue = Promise.resolve();

function parseStoredValue(value, fallback) {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function createId() {
  return typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : "id_" + Date.now() + "_" + Math.random().toString(36).slice(2);
}

function folderDepth(folderId, links) {
  let depth = 0;
  let currentId = folderId;
  const visited = new Set();

  while (currentId) {
    if (visited.has(currentId)) return Infinity;
    visited.add(currentId);

    const folder = links.find(
      (item) => item.id === currentId && item.isFolder === true,
    );
    if (!folder) return Infinity;

    depth++;
    currentId = folder.parentId || null;
  }

  return depth;
}

async function readData() {
  const stored = await chrome.storage.local.get([
    LINKS_KEY,
    SETTINGS_KEY,
  ]);
  const links = parseStoredValue(stored[LINKS_KEY], null);
  const settings = parseStoredValue(stored[SETTINGS_KEY], {});

  if (!Array.isArray(links)) {
    throw new Error("STORE_NOT_INITIALIZED");
  }

  return { links, settings };
}

async function getCaptureData() {
  const { links, settings } = await readData();
  return {
    ok: true,
    folders: links
      .filter((item) => item && item.isFolder === true && typeof item.id === "string")
      .map((folder) => ({
        id: folder.id,
        name: String(folder.name || "").slice(0, 50),
        parentId: folder.parentId || null,
        depth: folderDepth(folder.id, links),
      }))
      .filter((folder) => Number.isFinite(folder.depth) && folder.depth <= 3),
    theme: typeof settings.theme === "string" ? settings.theme : "dark",
  };
}

async function saveCapture(message) {
  const name = typeof message.name === "string" ? message.name.trim() : "";
  const url = typeof message.url === "string" ? message.url.trim() : "";
  const parentId = message.parentId || null;
  const createFolderName =
    typeof message.createFolderName === "string"
      ? message.createFolderName.trim()
      : "";

  if (!name || name.length > 50) throw new Error("INVALID_NAME");
  if (!url || url.length > 2048) throw new Error("INVALID_URL");

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("INVALID_URL");
  }
  if (
    !["http:", "https:"].includes(parsedUrl.protocol) ||
    parsedUrl.username ||
    parsedUrl.password
  ) {
    throw new Error("INVALID_URL");
  }

  const { links } = await readData();
  let destinationId = parentId;

  if (parentId !== null) {
    const parent = links.find(
      (item) => item.id === parentId && item.isFolder === true,
    );
    if (!parent) throw new Error("INVALID_DESTINATION");
    if (folderDepth(parentId, links) > 3) {
      throw new Error("FOLDER_DEPTH_LIMIT");
    }
  }

  if (createFolderName) {
    if (createFolderName.length > 50) throw new Error("INVALID_FOLDER_NAME");
    if (parentId !== null && folderDepth(parentId, links) >= 3) {
      throw new Error("FOLDER_DEPTH_LIMIT");
    }

    destinationId = createId();
    links.push({
      id: destinationId,
      name: createFolderName,
      isFolder: true,
      parentId,
    });
  }

  const linkId = createId();
  links.push({
    id: linkId,
    name,
    url: parsedUrl.href,
    isFolder: false,
    parentId: destinationId,
  });

  await chrome.storage.local.set({
    [LINKS_KEY]: JSON.stringify(links),
  });

  return {
    ok: true,
    linkId,
    folderId: createFolderName ? destinationId : null,
  };
}

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (!sender || !ALLOWED_COMPANION_IDS.has(sender.id)) {
    sendResponse({ ok: false, error: "UNAUTHORIZED_SENDER" });
    return false;
  }

  if (!message || typeof message !== "object") {
    sendResponse({ ok: false, error: "INVALID_REQUEST" });
    return false;
  }

  if (message.type === "0FLUFF_CAPTURE_GET_DATA") {
    getCaptureData()
      .then(sendResponse)
      .catch((error) =>
        sendResponse({ ok: false, error: error.message || "READ_FAILED" }),
      );
    return true;
  }

  if (message.type === "0FLUFF_CAPTURE_SAVE") {
    writeQueue = writeQueue
      .catch(() => {})
      .then(() => saveCapture(message));

    writeQueue
      .then(sendResponse)
      .catch((error) =>
        sendResponse({ ok: false, error: error.message || "SAVE_FAILED" }),
      );
    return true;
  }

  sendResponse({ ok: false, error: "UNKNOWN_REQUEST" });
  return false;
});
