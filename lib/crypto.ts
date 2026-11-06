// Client-side codes and encrypted storage (see CLAUDE.md → Storage & crypto).
//
// - "My code" derives an AES-GCM key (PBKDF2-SHA-256). The hidden layer's SavedState is
//   encrypted with it. A code is correct iff it decrypts the save; the code itself is never stored.
// - "Clear code" is stored only as a salted PBKDF2 hash. Redeeming it wipes the hidden data.
// - The invite code is public (advocates hand it out). It only opens setup, and only while
//   no codes exist on this device.

import type { SavedState } from "@/lib/types";

/** Public invite code that opens setup on a fresh install. Case and spaces don't matter. */
export const INVITE_CODE = "NEWPATH";

export const MIN_CODE_LENGTH = 4;

// Development only: "DEV" always opens the hidden layer (Clear code "DEVCLEAR"), so the two
// layers can be built and merged without running setup each time. `next build` replaces
// NODE_ENV with "production" and drops this path, so it never ships.
const DEV_CODE = "DEV";
const DEV_CLEAR_CODE = "DEVCLEAR";

// Neutral key names. pf_progress (game progress) is deliberately not in this list.
const SAVE_KEY = "pf_save";
const CLEAR_KEY = "pf_cfg";
const HIDDEN_KEYS = [SAVE_KEY, CLEAR_KEY];

const ITERATIONS = 250_000;

interface SaveBlob {
  v: 1;
  salt: string;
  iv: string;
  data: string;
}

interface ClearBlob {
  salt: string;
  hash: string;
}

export const EMPTY_STATE: SavedState = { situation: "", plan: null, checklist: {} };

/** Codes are case-insensitive and ignore spaces, like a typical promo code. */
export function normalizeCode(code: string): string {
  return code.replace(/\s+/g, "").toUpperCase();
}

/** Returns an error message for a proposed code, or null if it's fine. */
export function codeProblem(code: string, other?: string): string | null {
  const c = normalizeCode(code);
  if (c.length < MIN_CODE_LENGTH) return `Use at least ${MIN_CODE_LENGTH} letters or numbers.`;
  if (c === INVITE_CODE) return "Pick something different from the invite code.";
  if (other !== undefined && c === normalizeCode(other)) return "Your two codes need to be different.";
  return null;
}

// ---- storage helpers (never throw) ----

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** True once codes have been set up on this device. */
export function hasCodes(): boolean {
  return readJSON(SAVE_KEY) !== null || readJSON(CLEAR_KEY) !== null;
}

/** Deletes everything the hidden layer stores. Game progress is left alone on purpose. */
export function wipeHiddenData() {
  for (const key of HIDDEN_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Nothing else we can do; keep going.
    }
  }
}

// ---- crypto ----

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(n));
}

async function baseKey(code: string) {
  return crypto.subtle.importKey("raw", enc.encode(normalizeCode(code)), "PBKDF2", false, [
    "deriveKey",
    "deriveBits",
  ]);
}

async function deriveKey(code: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
    await baseKey(code),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function hashCode(code: string, salt: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
    await baseKey(code),
    256,
  );
  return new Uint8Array(bits);
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function seal(key: CryptoKey, salt: string, state: SavedState): Promise<SaveBlob> {
  const iv = randomBytes(12);
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(state)));
  return { v: 1, salt, iv: toB64(iv), data: toB64(new Uint8Array(data)) };
}

/** An unlocked session: the key stays in memory only, and is dropped on exit. */
export interface Session {
  key: CryptoKey;
  salt: string;
  state: SavedState;
}

/**
 * Saves both codes and an empty encrypted save. Returns false if this device can't store data.
 * Validate with codeProblem() first.
 */
export async function createCodes(myCode: string, clearCode: string): Promise<boolean> {
  const saveSalt = randomBytes(16);
  const clearSalt = randomBytes(16);
  const [key, clearHash] = await Promise.all([deriveKey(myCode, saveSalt), hashCode(clearCode, clearSalt)]);
  const blob = await seal(key, toB64(saveSalt), EMPTY_STATE);
  const ok =
    writeJSON(SAVE_KEY, blob) && writeJSON(CLEAR_KEY, { salt: toB64(clearSalt), hash: toB64(clearHash) });
  if (!ok) wipeHiddenData();
  return ok;
}

/** Re-encrypts and saves the hidden layer's state. Returns false if storage failed. */
export async function saveState(session: Session, state: SavedState): Promise<boolean> {
  return writeJSON(SAVE_KEY, await seal(session.key, session.salt, state));
}

export type CodeCheck =
  | { kind: "unlock"; session: Session }
  | { kind: "clear" }
  | { kind: "invite" }
  | { kind: "none" };

/**
 * Checks a redeemed code. Order: My code → Clear code (wipes) → invite (only with no codes yet).
 * Both PBKDF2 derivations always run, so the two outcomes take about the same time.
 */
async function openSave(save: SaveBlob | null, code: string): Promise<Session | null> {
  if (!save) return null;
  try {
    const key = await deriveKey(code, fromB64(save.salt));
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(save.iv) }, key, fromB64(save.data));
    return { key, salt: save.salt, state: { ...EMPTY_STATE, ...JSON.parse(dec.decode(plain)) } };
  } catch {
    return null; // Wrong code (or a corrupted save).
  }
}

export async function checkCode(code: string): Promise<CodeCheck> {
  if (process.env.NODE_ENV === "development" && normalizeCode(code) === DEV_CODE) {
    // Reuses the dev save if there is one; otherwise replaces any codes on this browser.
    let session = await openSave(readJSON<SaveBlob>(SAVE_KEY), code);
    if (!session && (await createCodes(DEV_CODE, DEV_CLEAR_CODE))) {
      session = await openSave(readJSON<SaveBlob>(SAVE_KEY), code);
    }
    if (session) return { kind: "unlock", session };
  }

  const save = readJSON<SaveBlob>(SAVE_KEY);
  const clear = readJSON<ClearBlob>(CLEAR_KEY);

  if (!save && !clear) {
    return normalizeCode(code) === INVITE_CODE ? { kind: "invite" } : { kind: "none" };
  }

  const [session, isClear] = await Promise.all([
    openSave(save, code),
    (async () => {
      if (!clear) return false;
      try {
        return sameBytes(await hashCode(code, fromB64(clear.salt)), fromB64(clear.hash));
      } catch {
        return false;
      }
    })(),
  ]);

  if (session) return { kind: "unlock", session };
  if (isClear) {
    wipeHiddenData();
    return { kind: "clear" };
  }
  return { kind: "none" };
}
