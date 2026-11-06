"use client";

// Encrypted photos and voice notes (IndexedDB). Each is sealed with AES-GCM using the session key
// that lib/crypto.ts derives from "My code"; the key is kept only in memory and dropped on exit.
// The saved state itself lives in lib/crypto.ts ("pf_save"). Names are neutral on purpose.

const DB_NAME = "pf";
const STORE = "kv";
const mediaKey = (id: string) => `m:${id}`;

type Sealed = { iv: Uint8Array; data: ArrayBuffer; mime?: string };

// --- tiny IndexedDB key-value wrapper ---------------------------------------------------------

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).finally(() => db.close()) as Promise<T>;
}

const get = <T>(key: string) => tx<T | undefined>("readonly", (s) => s.get(key) as IDBRequest<T | undefined>);
const put = (key: string, value: unknown) => tx("readwrite", (s) => s.put(value, key));
const del = (key: string) => tx("readwrite", (s) => s.delete(key));

// --- crypto ----------------------------------------------------------------------------------

async function seal(key: CryptoKey, bytes: ArrayBuffer | Uint8Array, mime?: string): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, bytes as BufferSource);
  return { iv, data, mime };
}

const open = (key: CryptoKey, s: Sealed) =>
  crypto.subtle.decrypt({ name: "AES-GCM", iv: s.iv as BufferSource }, key, s.data);

// --- public API ------------------------------------------------------------------------------

/** Anything holding the unlocked key (lib/crypto.ts Session fits). */
export type Session = { key: CryptoKey };

/** Encrypt and store a photo or voice note. */
export async function saveMedia(session: Session, id: string, blob: Blob): Promise<void> {
  await put(mediaKey(id), await seal(session.key, await blob.arrayBuffer(), blob.type));
}

export async function loadMedia(session: Session, id: string): Promise<Blob | null> {
  const sealed = await get<Sealed>(mediaKey(id));
  if (!sealed) return null;
  try {
    return new Blob([await open(session.key, sealed)], { type: sealed.mime });
  } catch {
    return null;
  }
}

export async function deleteMedia(id: string): Promise<void> {
  try {
    await del(mediaKey(id));
  } catch {
    /* ignore */
  }
}

/** Part of the Clear-code wipe: deletes every stored photo and voice note. Never throws. */
export function wipeMedia(): void {
  try {
    indexedDB.deleteDatabase(DB_NAME);
  } catch {
    /* storage unavailable */
  }
}
