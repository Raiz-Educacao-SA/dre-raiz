/**
 * ═══════════════════════════════════════════════════════
 * TRANSACTION CACHE — IndexedDB com TTL
 * ═══════════════════════════════════════════════════════
 *
 * Persiste transações entre F5/reloads do mesmo usuário.
 * Estratégia: stale-while-revalidate
 *   - Retorna dados do cache imediatamente (<100ms)
 *   - Atualiza do Supabase em background
 *   - TTL padrão: 15 minutos
 *   - Limpa automaticamente ao fazer logout
 */

import { Transaction } from '../types';

const DB_NAME = 'dre-raiz-cache';
const DB_VERSION = 1;
const STORE_NAME = 'transactions';
const TTL_MS = 15 * 60 * 1000; // 15 minutos

interface CacheEntry {
  key: string;
  data: Transaction[];
  cachedAt: number; // timestamp
  userId: string;
}

let db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (db) return Promise.resolve(db);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onerror = () => {
      reject(new Error('Falha ao abrir IndexedDB'));
    };
  });
}

/** Gera chave de cache baseada nos filtros + usuário */
export function buildCacheKey(userId: string, filters: Record<string, unknown>): string {
  const normalized = {
    monthFrom: filters.monthFrom,
    monthTo: filters.monthTo,
    marca: filters.marca,
    filial: filters.filial,
    tag01: filters.tag01,
    tag02: filters.tag02,
    tag03: filters.tag03,
    category: filters.category,
  };
  return `${userId}::${JSON.stringify(normalized)}`;
}

/** Busca entrada do cache. Retorna null se não existe ou expirou. */
export async function getCached(key: string, userId: string): Promise<Transaction[] | null> {
  try {
    const database = await openDB();
    return new Promise((resolve) => {
      const tx = database.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry: CacheEntry | undefined = request.result;
        if (!entry) { resolve(null); return; }
        if (entry.userId !== userId) { resolve(null); return; }
        if (Date.now() - entry.cachedAt > TTL_MS) { resolve(null); return; }
        resolve(entry.data);
      };

      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/** Salva transações no cache */
export async function setCached(
  key: string,
  userId: string,
  data: Transaction[]
): Promise<void> {
  try {
    const database = await openDB();
    return new Promise((resolve) => {
      const tx = database.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const entry: CacheEntry = { key, data, cachedAt: Date.now(), userId };
      store.put(entry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve(); // silencioso — cache é best-effort
    });
  } catch {
    // cache falhou? sem problema — app funciona normalmente
  }
}

/** Limpa todo o cache do usuário (chamar no logout) */
export async function clearUserCache(userId: string): Promise<void> {
  try {
    const database = await openDB();
    return new Promise((resolve) => {
      const tx = database.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          const entry: CacheEntry = cursor.value;
          if (entry.userId === userId) cursor.delete();
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // silencioso
  }
}

/** Limpa todo o cache (fallback sem userId) */
export async function clearAllCache(): Promise<void> {
  try {
    const database = await openDB();
    return new Promise((resolve) => {
      const tx = database.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // silencioso
  }
}
