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
  // Prefer localStorage if small enough and allowed
  const ok = tryLocalSet(LS_KEY, json);
  if (ok) {
    try { localStorage.removeItem(LS_USE_IDB_FLAG); } catch {}
    return;
  }
  // Fall back to IndexedDB
  await idbSet(IDB_BOOKMARKS_KEY, json);
  try {
    localStorage.setItem(LS_USE_IDB_FLAG, "true");
    // Keep a tiny marker in LS to avoid future QuotaExceeded loops
    localStorage.removeItem(LS_KEY);
  } catch {}
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
