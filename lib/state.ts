import type { SavedState, Situation } from "@/lib/types";

// The hidden layer's saved state: what lib/crypto.ts encrypts under "My code".

export function freshSituation(): Situation {
  const now = new Date().toISOString();
  return { id: now, createdAt: now, updatedAt: now, turns: [], notes: {}, plan: null, checked: {} };
}

export function emptyState(): SavedState {
  return { version: 4, locale: "en", situation: freshSituation(), log: [] };
}

/** Accepts whatever was decrypted (older versions, or the empty save made at setup). */
export function normalizeState(raw: unknown): SavedState {
  const st = raw as Omit<Partial<SavedState>, "version"> & { version?: number };
  if (st && (st.version === 3 || st.version === 4) && st.situation && typeof st.situation === "object") {
    return { ...emptyState(), ...st, version: 4, log: st.log ?? [] };
  }
  return emptyState();
}

/** Nothing said or saved yet: the first time she opens the hidden layer. */
export function isFreshState(st: SavedState): boolean {
  return st.situation.turns.length === 0 && !st.situation.plan && st.log.length === 0;
}
