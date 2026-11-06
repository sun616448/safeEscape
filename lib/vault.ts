"use client";

import type { SavedState } from "@/lib/types";

// Encrypted on-device storage (IndexedDB). Passcode → PBKDF2 (SHA-256, 210k iterations, random salt)
// → AES-GCM key. The key is derived once at unlock, kept only in memory (non-extractable), and
// dropped on exit. State and each photo/voice note are encrypted separately with that key.
// Names are neutral on purpose (see CLAUDE.md threat model).

const DB_NAME = "pf";
const STORE = "kv";
const STATE_KEY = "save";
const SALT_KEY = "salt";
const mediaKey = (id: string) => `m:${id}`;
const ITERATIONS = 210_000;

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

async function deriveKey(passcode: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(passcode), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations: ITERATIONS },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function seal(key: CryptoKey, bytes: ArrayBuffer | Uint8Array, mime?: string): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, bytes as BufferSource);
  return { iv, data, mime };
}

const open = (key: CryptoKey, s: Sealed) =>
  crypto.subtle.decrypt({ name: "AES-GCM", iv: s.iv as BufferSource }, key, s.data);

// --- public API ------------------------------------------------------------------------------

export type Session = { key: CryptoKey };

/**
 * Unlock with a passcode. Returns the session and saved state (null state if nothing saved yet).
 * Returns null if a save exists but the passcode is wrong.
 */
export async function unlock(passcode: string): Promise<{ session: Session; state: SavedState | null } | null> {
  let salt = await get<Uint8Array>(SALT_KEY);
  if (!salt) {
    salt = crypto.getRandomValues(new Uint8Array(16));
    await put(SALT_KEY, salt);
  }
  const key = await deriveKey(passcode, salt);
  const sealed = await get<Sealed>(STATE_KEY);
  if (!sealed) return { session: { key }, state: null };
  try {
    const plain = await open(key, sealed);
    return { session: { key }, state: JSON.parse(new TextDecoder().decode(plain)) as SavedState };
  } catch {
    return null; // wrong passcode
  }
}

export async function save(session: Session, state: SavedState): Promise<void> {
  try {
    await put(STATE_KEY, await seal(session.key, new TextEncoder().encode(JSON.stringify(state))));
  } catch {
    /* storage unavailable (private mode / quota): app still works for this session */
  }
}

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

/** Panic wipe: deletes everything this app stored (state, salt, all media). */
export async function wipe(): Promise<void> {
  try {
    localStorage.removeItem("pf_save"); // earlier prototype location
  } catch {
    /* ignore */
  }
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = req.onerror = req.onblocked = () => resolve();
  });
}
