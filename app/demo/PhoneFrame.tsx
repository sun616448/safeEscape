"use client";

import { useEffect, useRef, useState } from "react";

// iPhone 15-class screen in CSS pixels. The app runs in an iframe at exactly this size, so it
// gets a real phone viewport: fixed tab bars, dvh, scrolling and media queries behave as on a phone.
const SCREEN_W = 390;
const SCREEN_H = 844;
const BEZEL = 14;
const STATUS_H = 47; // a real phone's status bar; the iframe has no safe-area insets of its own
const HOME_H = 26;
const FRAME_W = SCREEN_W + BEZEL * 2;
const FRAME_H = SCREEN_H + BEZEL * 2;

function useClock() {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const tick = () =>
      setNow(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M/i, ""));
    tick();
    const id = setInterval(tick, 10_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export default function PhoneFrame() {
  const [scale, setScale] = useState(1);
  const frame = useRef<HTMLIFrameElement>(null);
  const time = useClock();

  useEffect(() => {
    // On an actual phone the frame is pointless: go to the app and leave no history entry.
    if (window.matchMedia("(max-width: 600px)").matches) {
      window.location.replace("/");
      return;
    }
    const fit = () => setScale(Math.min(1, (window.innerHeight - 48) / FRAME_H, (window.innerWidth - 48) / FRAME_W));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <main className="hl grid min-h-dvh place-items-center overflow-hidden !bg-[var(--hl-surface)]">
      <div style={{ width: FRAME_W * scale, height: FRAME_H * scale }}>
        <div
          className="relative origin-top-left rounded-[58px] bg-[#111216] ring-1 ring-black/40"
          style={{ width: FRAME_W, height: FRAME_H, padding: BEZEL, transform: `scale(${scale})` }}
        >
          {/* side buttons */}
          <span className="absolute -left-[3px] top-[170px] h-[34px] w-[3px] rounded-l bg-[#2a2b31]" aria-hidden />
          <span className="absolute -left-[3px] top-[225px] h-[62px] w-[3px] rounded-l bg-[#2a2b31]" aria-hidden />
          <span className="absolute -left-[3px] top-[300px] h-[62px] w-[3px] rounded-l bg-[#2a2b31]" aria-hidden />
          <span className="absolute -right-[3px] top-[250px] h-[96px] w-[3px] rounded-r bg-[#2a2b31]" aria-hidden />

          <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[44px] bg-[var(--hl-bg)]">
            {/* status bar */}
            <div
              className="relative flex shrink-0 items-center justify-between px-8 pt-1 text-[15px] font-semibold text-[var(--hl-ink)]"
              style={{ height: STATUS_H, fontFamily: "-apple-system, system-ui, sans-serif" }}
              aria-hidden
            >
              <span className="w-14 text-center tabular-nums">{time}</span>
              <span className="absolute left-1/2 top-[11px] h-[34px] w-[122px] -translate-x-1/2 rounded-full bg-black" />
              <span className="flex items-center gap-1.5">
                <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor">
                  <rect x="0" y="8" width="3" height="4" rx="1" />
                  <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
                  <rect x="10" y="3" width="3" height="9" rx="1" />
                  <rect x="15" y="0" width="3" height="12" rx="1" />
                </svg>
                <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
                  <rect x="0.5" y="0.5" width="21" height="11" rx="3" stroke="currentColor" opacity="0.4" />
                  <rect x="2" y="2" width="16" height="8" rx="1.8" fill="currentColor" />
                  <path d="M23 4v4c.8-.3 1.3-1.1 1.3-2S23.8 4.3 23 4Z" fill="currentColor" opacity="0.4" />
                </svg>
              </span>
            </div>

            <iframe
              ref={frame}
              src="/"
              title="Path Finder"
              className="block w-full flex-1 border-0"
              onLoad={() => frame.current?.focus()}
            />

            {/* home indicator area: continues the app's tab bar, like the safe area on a real phone */}
            <div className="flex shrink-0 items-center justify-center bg-[var(--hl-paper-2)]" style={{ height: HOME_H }} aria-hidden>
              <span className="h-[5px] w-[134px] rounded-full bg-[var(--hl-ink)] opacity-70" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
