import { stateSchema, type AppState } from './model';
export type Cache = {
  state: AppState;
  revision: number;
  pending: boolean;
};
const open = () => new Promise<IDBDatabase>((resolve, reject) => {
  const req = indexedDB.open('keep-healthy-v4', 1);
  req.onupgradeneeded = () => req.result.createObjectStore('snapshots');
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});
export async function writeCache(value: Cache) {
  const db = await open();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('snapshots', 'readwrite');
      tx.objectStore('snapshots').put(value, 'current');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
export async function readCache(): Promise<Cache | null> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction('snapshots', 'readonly').objectStore('snapshots').get('current');
      req.onsuccess = () => {
        const c = req.result;
        const p = stateSchema.safeParse(c?.state);
        resolve(p.success ? {
          ...c,
          state: p.data
        } : null);
      };
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}
export function download(data: unknown, name: string, type = 'application/json') {
  const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], {
    type
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
