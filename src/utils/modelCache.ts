/**
 * IndexedDB 3D Model Cache
 * Speichert hochauflösende .glb / .gltf 3D-Modelle dauerhaft im Browser,
 * sodass importierte Modelle nach Seiten-Reloads oder Neustarts sofort verfügbar sind.
 */

const DB_NAME = 'Supertechno3DCache';
const DB_VERSION = 2;
const STORE_NAME = 'custom_models';
const TEXTURES_STORE_NAME = 'custom_textures';

export interface CachedModelRecord {
  key: string;
  data: ArrayBuffer;
  fileName: string;
  timestamp: number;
}

export interface CachedTextureRecord {
  id: string;
  slotKey: string;
  mapType: string;
  targetLayer: string;
  fileName: string;
  dataUrl: string;
  timestamp: number;
}

function openFullDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(TEXTURES_STORE_NAME)) {
        const texStore = db.createObjectStore(TEXTURES_STORE_NAME, { keyPath: 'id' });
        texStore.createIndex('slotKey', 'slotKey', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Speichert ein 3D-Modell (ArrayBuffer) dauerhaft im IndexedDB Cache
 */
export async function saveModelToCache(key: string, data: ArrayBuffer, fileName: string): Promise<void> {
  const db = await openFullDatabase();
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
    const db = await openFullDatabase();
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
  const db = await openFullDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Speichert eine benutzerdefinierte Textur für einen Fahrzeug-Slot
 */
export async function saveTextureToCache(record: CachedTextureRecord): Promise<void> {
  const db = await openFullDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TEXTURES_STORE_NAME, 'readwrite');
    const store = tx.objectStore(TEXTURES_STORE_NAME);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Lädt alle gespeicherten Texturen für einen Fahrzeug-Slot
 */
export async function loadTexturesForSlot(slotKey: string): Promise<CachedTextureRecord[]> {
  try {
    const db = await openFullDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(TEXTURES_STORE_NAME, 'readonly');
      const store = tx.objectStore(TEXTURES_STORE_NAME);
      const index = store.index('slotKey');
      const req = index.getAll(slotKey);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to load textures for slot:', err);
    return [];
  }
}

/**
 * Löscht eine Textur aus dem Cache
 */
export async function deleteTextureFromCache(id: string): Promise<void> {
  const db = await openFullDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TEXTURES_STORE_NAME, 'readwrite');
    const store = tx.objectStore(TEXTURES_STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Löscht alle Texturen eines bestimmten Fahrzeug-Slots
 */
export async function clearAllTexturesForSlot(slotKey: string): Promise<void> {
  try {
    const textures = await loadTexturesForSlot(slotKey);
    const db = await openFullDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(TEXTURES_STORE_NAME, 'readwrite');
      const store = tx.objectStore(TEXTURES_STORE_NAME);
      textures.forEach((t) => store.delete(t.id));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not clear textures for slot:', err);
  }
}
