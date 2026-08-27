/**
 * IndexedDB 3D Model Cache
 * Speichert hochauflösende .glb / .gltf 3D-Modelle dauerhaft im Browser,
 * sodass importierte Modelle nach Seiten-Reloads oder Neustarts sofort verfügbar sind.
 */

const DB_NAME = 'Supertechno3DCache';
const DB_VERSION = 1;
const STORE_NAME = 'custom_models';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface CachedModelRecord {
  key: string;
  data: ArrayBuffer;
  fileName: string;
  timestamp: number;
}

/**
 * Speichert ein 3D-Modell (ArrayBuffer) dauerhaft im IndexedDB Cache
 */
export async function saveModelToCache(key: string, data: ArrayBuffer, fileName: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const record: CachedModelRecord = {
      key,
      data,
      fileName,
      timestamp: Date.now(),
    };
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Lädt ein gespeichertes 3D-Modell aus dem IndexedDB Cache
 */
export async function loadModelFromCache(key: string): Promise<CachedModelRecord | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB Load Warning:', err);
    return null;
  }
}

/**
 * Löscht ein gespeichertes 3D-Modell aus dem Cache
 */
export async function clearModelCache(key: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
