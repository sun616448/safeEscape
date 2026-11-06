"use client";

import { useEffect } from "react";

const SHAKE_THRESHOLD = 25; // m/s² of acceleration change
const SHAKE_HITS = 3; // strong jolts within the window
const SHAKE_WINDOW_MS = 800;

/** Calls onExit on Esc (desktop) or a firm shake (mobile). */
export function useQuickExit(onExit: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
    };

    let last: { x: number; y: number; z: number } | null = null;
    let hits: number[] = [];
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a || a.x == null || a.y == null || a.z == null) return;
      const cur = { x: a.x, y: a.y, z: a.z };
      if (last) {
        const delta = Math.abs(cur.x - last.x) + Math.abs(cur.y - last.y) + Math.abs(cur.z - last.z);
        if (delta > SHAKE_THRESHOLD) {
          const now = Date.now();
          hits = [...hits.filter((t) => now - t < SHAKE_WINDOW_MS), now];
          if (hits.length >= SHAKE_HITS) {
            hits = [];
            onExit();
          }
        }
      }
      last = cur;
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("devicemotion", onMotion);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("devicemotion", onMotion);
    };
  }, [onExit]);
}

/**
 * iOS requires a user gesture to grant motion access. Call this from a tap handler
 * (e.g. when the hidden layer unlocks). Safe to call on other platforms.
 */
export async function requestMotionPermission(): Promise<void> {
  const DME = (globalThis as { DeviceMotionEvent?: { requestPermission?: () => Promise<string> } })
    .DeviceMotionEvent;
  try {
    await DME?.requestPermission?.();
  } catch {
    /* denied or unsupported: Esc + exit button still work */
  }
}
