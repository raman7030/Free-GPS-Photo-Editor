import { CapturedPhoto } from '../types/gps';

const DB_NAME = 'gps_map_camera_db';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open photo database'));
    request.onblocked = () => reject(new Error('Photo database upgrade is blocked by another open tab'));
  });
}

function getPhotosFromLocalStorage(): CapturedPhoto[] {
  try {
    if (typeof window === 'undefined') return [];
    const item = window.localStorage.getItem('gps_captured_photos');
    if (!item) return [];
    const parsed: unknown = JSON.parse(item);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((photo): photo is CapturedPhoto =>
      !!photo &&
      typeof photo === 'object' &&
      typeof (photo as CapturedPhoto).id === 'string' &&
      typeof (photo as CapturedPhoto).timestamp === 'number' &&
      typeof (photo as CapturedPhoto).dataUrl === 'string'
    );
  } catch {
    return [];
  }
}

function sortPhotos(photos: CapturedPhoto[]): CapturedPhoto[] {
  return photos.sort((a, b) => b.timestamp - a.timestamp);
}

export async function savePhotoToStorage(photo: CapturedPhoto): Promise<void> {
  let db: IDBDatabase | undefined;
  try {
    db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db!.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(photo);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Photo save transaction failed'));
      tx.onabort = () => reject(tx.error ?? new Error('Photo save transaction was aborted'));
    });
    // Clear a legacy duplicate only after IndexedDB confirms the write.
    try {
      const legacy = getPhotosFromLocalStorage().filter((item) => item.id !== photo.id);
      if (legacy.length) window.localStorage.setItem('gps_captured_photos', JSON.stringify(legacy));
      else window.localStorage.removeItem('gps_captured_photos');
    } catch {
      // IndexedDB remains the primary store; a quota/security error in legacy cleanup is non-fatal.
    }
  } catch (err) {
    console.warn('IndexedDB photo save failed; using localStorage fallback:', err);
    try {
      const existing = getPhotosFromLocalStorage();
      const updated = sortPhotos([photo, ...existing.filter((p) => p.id !== photo.id)]).slice(0, 10);
      window.localStorage.setItem('gps_captured_photos', JSON.stringify(updated));
    } catch (fallbackError) {
      throw new Error('Photo could not be saved to IndexedDB or localStorage', { cause: fallbackError });
    }
  } finally {
    db?.close();
  }
}

export async function loadPhotosFromStorage(): Promise<CapturedPhoto[]> {
  let db: IDBDatabase | undefined;
  try {
    db = await openDatabase();
    const indexedPhotos = await new Promise<CapturedPhoto[]>((resolve, reject) => {
      const tx = db!.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).getAll();
      let result: CapturedPhoto[] = [];
      request.onsuccess = () => {
        result = Array.isArray(request.result) ? request.result as CapturedPhoto[] : [];
      };
      request.onerror = () => reject(request.error ?? new Error('Could not read saved photos'));
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error ?? new Error('Photo read transaction failed'));
      tx.onabort = () => reject(tx.error ?? new Error('Photo read transaction was aborted'));
    });

    // Older app versions stored photos in localStorage. Do not hide those photos
    // merely because IndexedDB exists but is empty (or only partially migrated).
    const legacyPhotos = getPhotosFromLocalStorage();
    const ids = new Set(indexedPhotos.map((photo) => photo.id));
    const missingLegacy = legacyPhotos.filter((photo) => !ids.has(photo.id));

    let migrationSucceeded = true;
    if (missingLegacy.length) {
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db!.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          missingLegacy.forEach((photo) => store.put(photo));
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error ?? new Error('Legacy photo migration failed'));
          tx.onabort = () => reject(tx.error ?? new Error('Legacy photo migration was aborted'));
        });
      } catch (migrationError) {
        // Keep the legacy copy until migration succeeds; otherwise a reload could lose these photos.
        migrationSucceeded = false;
        console.warn('Could not migrate legacy photos into IndexedDB:', migrationError);
      }
    }

    const merged = new Map<string, CapturedPhoto>();
    [...indexedPhotos, ...missingLegacy].forEach((photo) => merged.set(photo.id, photo));
    const photos = sortPhotos(Array.from(merged.values()));

    if (photos.length && legacyPhotos.length && migrationSucceeded) {
      try {
        window.localStorage.removeItem('gps_captured_photos');
      } catch {
        // Keep legacy data if storage cleanup is blocked.
      }
    }
    return photos;
  } catch (err) {
    console.warn('IndexedDB photo read failed; using localStorage fallback:', err);
    return sortPhotos(getPhotosFromLocalStorage());
  } finally {
    db?.close();
  }
}

export async function deletePhotoFromStorage(id: string): Promise<void> {
  let db: IDBDatabase | undefined;
  try {
    db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db!.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Photo deletion failed'));
      tx.onabort = () => reject(tx.error ?? new Error('Photo deletion was aborted'));
    });
  } catch (err) {
    console.warn('IndexedDB photo deletion failed:', err);
  } finally {
    db?.close();
  }

  try {
    const filtered = getPhotosFromLocalStorage().filter((photo) => photo.id !== id);
    if (filtered.length) window.localStorage.setItem('gps_captured_photos', JSON.stringify(filtered));
    else window.localStorage.removeItem('gps_captured_photos');
  } catch (err) {
    console.warn('Could not remove legacy photo copy:', err);
  }
}

export async function clearAllPhotosFromStorage(): Promise<void> {
  let db: IDBDatabase | undefined;
  try {
    db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db!.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Clearing photos failed'));
      tx.onabort = () => reject(tx.error ?? new Error('Clearing photos was aborted'));
    });
  } catch (err) {
    console.warn('IndexedDB clear failed:', err);
  } finally {
    db?.close();
  }

  try {
    window.localStorage.removeItem('gps_captured_photos');
  } catch (err) {
    console.warn('Could not clear legacy photo storage:', err);
  }
}
