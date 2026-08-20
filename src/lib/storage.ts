// --- High-Capacity, High-Durability System/Device Storage Wrapper ---
// Bypasses the 5MB localStorage threshold by utilizing IndexedDB on Mobile devices (WebView).
// Acts as a SQLite-backed storage layer on Android.

const DB_NAME = "SlingshotDeviceStorage";
const STORE_NAME = "scoring_ledger";

function getDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined" || !indexedDB) {
    return Promise.reject(new Error("IndexedDB is not supported or is blocked in this environment."));
  }
  return new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } catch (err) {
      reject(err);
    }
  });
}

export const deviceStorage = {
  async get(key: string): Promise<any> {
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => {
          resolve(request.result !== undefined ? request.result : null);
        };
        request.onerror = () => {
          console.warn(`IndexedDB get failed for ${key}, trying localStorage fallback.`);
          resolve(null);
        };
      });
    } catch (e) {
      console.warn(`IndexedDB not supported or accessible for get key: ${key}. Falling back to localStorage.`);
      const val = localStorage.getItem(key);
      if (!val) return null;
      try {
        return JSON.parse(val);
      } catch {
        return val;
      }
    }
  },

  async set(key: string, value: any): Promise<void> {
    try {
      // Always store to IndexedDB as primary high-capacity phone storage
      const db = await getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(value, key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn(`IndexedDB write failed for key ${key}:`, e);
    }

    // Secondary backup storage via localStorage where possible for maximum compatibility
    try {
      const serialized = typeof value === "string" ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (e) {
      console.warn(`localStorage quota exceeded or blocked for key ${key}:`, e);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      const db = await getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.warn(`IndexedDB delete failed for key ${key}:`, e);
    }

    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`localStorage remove failed for key ${key}:`, e);
    }
  }
};
