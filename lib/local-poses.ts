const dbName = 'keep-healthy-exercise-images';
const table = 'images';
let opening: Promise<IDBDatabase> | undefined;
function open() {
  return opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(table);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { opening = undefined; reject(req.error); };
  });
}
const urls = new Map<string, string>();
const listeners = new Set<() => void>();
let initialized: Promise<void> | undefined;
export function initPoses() {
  return initialized ??= (async () => {
    const db = await open();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(table);
      const cursor = transaction.objectStore(table).openCursor();
      cursor.onsuccess = () => {
        const row = cursor.result;
        if (row) {
          if (typeof row.key === 'string' && row.value instanceof Blob) assign(row.key, row.value);
          row.continue();
        }
      };
      transaction.oncomplete = () => { listeners.forEach(fn => fn()); resolve(); };
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
  })();
}
function assign(key: string, value: Blob) {
  const old = urls.get(key);
  if (old) URL.revokeObjectURL(old);
  urls.set(key, URL.createObjectURL(value));
}
export function getPose(key: string) { return urls.get(key); }
export function subscribePoses(fn: () => void) {
  listeners.add(fn);
  void initPoses().catch(() => {});
  return () => { listeners.delete(fn); };
}
export async function storePoses(poses: Map<string, Blob>) {
  await initPoses();
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(table, 'readwrite'), store = tx.objectStore(table);
    for (const [key, blob] of poses) store.put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => reject(tx.error);
  });
  for (const [key, blob] of poses) assign(key, blob);
  listeners.forEach(fn => fn());
}
