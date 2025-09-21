// Persistence utilities for bookmarks with QuotaExceeded-safe fallback to IndexedDB
// API: loadBookmarks() -> Promise<array|null>, storeBookmarks(array) -> Promise<void>

const LS_KEY = "onlyseries-bookmarks";
const IDB_DB = "onlyseries-db";
const IDB_STORE = "kv";
const IDB_BOOKMARKS_KEY = "bookmarks";
const LS_USE_IDB_FLAG = "onlyseries-use-idb";

const textSize = (s) => new Blob([s]).size; // more accurate than length*2

function tryLocalSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    return false;
  }
}

function openIdb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB is not available'));
    const req = indexedDB.open(IDB_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key, value) {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.objectStore(IDB_STORE).put(value, key);
  });
}

async function idbGet(key) {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    tx.onerror = () => reject(tx.error);
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function storeBookmarks(arr) {
  const json = JSON.stringify(arr || []);

  // If payload is large, prefer IndexedDB directly to avoid quota issues
  try {
    const size = textSize(json);
    const MAX_LS_BYTES = 800 * 1024; // 800KB
    if (size <= MAX_LS_BYTES) {
      const ok = tryLocalSet(LS_KEY, json);
      if (ok) {
        try { localStorage.removeItem(LS_USE_IDB_FLAG); } catch {}
        return;
      }
    }
  } catch (e) {
    // ignore and fall back to IDB
  }

  // Fall back to IndexedDB
  try {
    await idbSet(IDB_BOOKMARKS_KEY, json);
    try {
      localStorage.setItem(LS_USE_IDB_FLAG, "true");
      localStorage.removeItem(LS_KEY);
    } catch {}
  } catch (err) {
    // Last resort: try localStorage again if IDB failed
    try { localStorage.setItem(LS_KEY, json); } catch (e) {}
  }
}

export async function loadBookmarks() {
  try {
    const useIdb = localStorage.getItem(LS_USE_IDB_FLAG) === "true";
    if (!useIdb) {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  try {
    const raw = await idbGet(IDB_BOOKMARKS_KEY);
    if (typeof raw === "string" && raw) return JSON.parse(raw);
  } catch {}
  return null;
}
