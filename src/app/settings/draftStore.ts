/** Imágenes sin publicar guardadas en IndexedDB para que sobrevivan a una recarga. */

const DB_NAME = "pcinbox-admin-settings";
const STORE = "drafts";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

type StoredDraft = { key: string; file: File; savedAt: number };

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB no disponible"));
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch((error) => {
    dbPromise = null;
    throw error;
  });
  return dbPromise;
}

async function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await openDb();
  return new Promise<T | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = action(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(request ? request.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function loadDrafts(): Promise<Record<string, File>> {
  const rows = ((await run("readonly", (store) => store.getAll())) ?? []) as StoredDraft[];
  const now = Date.now();
  const expired = rows.filter((row) => now - row.savedAt > MAX_AGE_MS).map((row) => row.key);
  if (expired.length) void deleteDrafts(expired).catch(() => undefined);
  return Object.fromEntries(
    rows.filter((row) => !expired.includes(row.key) && row.file).map((row) => [row.key, row.file]),
  );
}

export async function saveDraft(key: string, file: File) {
  await run("readwrite", (store) => store.put({ key, file, savedAt: Date.now() } satisfies StoredDraft));
}

export async function deleteDrafts(keys: string[]) {
  if (!keys.length) return;
  await run("readwrite", (store) => {
    keys.forEach((key) => store.delete(key));
  });
}
