/** localStorage con JSON y a prueba de fallos (modo privado, cuota llena…). Las claves son las mismas que usaba la v1. */
export const ls = {
  get<T>(k: string, fallback: T): T {
    try {
      const v = localStorage.getItem(k);
      return v == null ? fallback : (JSON.parse(v) as T);
    } catch { return fallback; }
  },
  set(k: string, v: unknown): void {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin espacio o modo privado */ }
  },
  str(k: string): string | null {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  setStr(k: string, v: string): void {
    try { localStorage.setItem(k, v); } catch { /* sin espacio o modo privado */ }
  },
  del(k: string): void {
    try { localStorage.removeItem(k); } catch { /* ignorar */ }
  },
};

/* ---------- IndexedDB: canciones importadas en el dispositivo ---------- */
const db: Promise<IDBDatabase> = new Promise((res, rej) => {
  const r = indexedDB.open('player', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('t', { keyPath: 'id', autoIncrement: true });
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db;
  return new Promise<T>((res, rej) => {
    const t = d.transaction('t', mode);
    const r = fn(t.objectStore('t'));
    t.oncomplete = () => res(r.result);
    t.onerror = () => rej(t.error);
  });
}

export const localDb = {
  all: <T>() => tx<T[]>('readonly', (s) => s.getAll()),
  add: (rec: object) => tx<IDBValidKey>('readwrite', (s) => s.add(rec)),
  del: (id: IDBValidKey) => tx<undefined>('readwrite', (s) => s.delete(id)),
  clear: () => tx<undefined>('readwrite', (s) => s.clear()),
};
