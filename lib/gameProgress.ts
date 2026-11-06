// Ordinary, non-sensitive game progress (levels, times, moves, coins).
// It stays on purpose when the panic code wipes the hidden data: a game that
// suddenly resets to level 1 would be something to notice.

import { useSyncExternalStore } from "react";

const KEY = "pf_progress";

/** Coins for clearing a level for the first time. */
export const LEVEL_COINS = 10;
/** Coins for redeeming a promo code (what the panic code looks like it gave). */
export const PROMO_COINS = 200;

export interface Reward {
  /** YYYY-MM-DD */
  date: string;
  coins: number;
}

export interface Progress {
  levelsCompleted: number;
  /** Best time in ms, keyed by level number. */
  bestTimes: Record<string, number>;
  totalMoves: number;
  coins: number;
  /** Redeemed promo codes. The code itself is never stored. */
  redeemed: Reward[];
}

const EMPTY: Progress = { levelsCompleted: 0, bestTimes: {}, totalMoves: 0, coins: 0, redeemed: [] };

let cached: Progress | null = null;
const listeners = new Set<() => void>();

function read(): Progress {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(KEY);
    cached = raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    cached = EMPTY;
  }
  return cached!;
}

function write(next: Progress) {
  cached = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode, quota): keep playing from memory.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    cached = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function recordLevel(level: number, ms: number, moves: number) {
  const p = read();
  const best = p.bestTimes[level];
  const firstClear = level > p.levelsCompleted;
  write({
    ...p,
    levelsCompleted: Math.max(p.levelsCompleted, level),
    bestTimes: { ...p.bestTimes, [level]: best === undefined ? ms : Math.min(best, ms) },
    totalMoves: p.totalMoves + moves,
    coins: p.coins + (firstClear ? LEVEL_COINS : 0),
  });
}

/** Adds a redeemed promo reward and returns the coins granted. */
export function grantPromo(): number {
  const p = read();
  const date = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD, local time
  write({
    ...p,
    coins: p.coins + PROMO_COINS,
    redeemed: [{ date, coins: PROMO_COINS }, ...p.redeemed],
  });
  return PROMO_COINS;
}

export function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
