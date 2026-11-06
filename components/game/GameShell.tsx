"use client";

import { useState } from "react";
import Maze from "./Maze";
import Profile from "./Profile";
import Rewards from "./Rewards";
import Setup from "./Setup";
import type { CodeResult } from "@/lib/types";
import { btnPrimary, btnSecondary } from "./styles";
import { formatTime, LEVEL_COINS, recordLevel, useProgress } from "@/lib/gameProgress";

type Tab = "play" | "rewards" | "profile" | "setup";

interface Props {
  onCodeSubmit: (code: string) => Promise<CodeResult>;
}

export default function GameShell({ onCodeSubmit }: Props) {
  const progress = useProgress();
  const [tab, setTab] = useState<Tab>("play");
  // null = "the next unplayed level", so it follows saved progress once it loads.
  const [picked, setPicked] = useState<number | null>(null);
  const [cleared, setCleared] = useState<{ ms: number; moves: number; best: boolean; coins: number } | null>(
    null,
  );
  // Bumped to restart the same level.
  const [attempt, setAttempt] = useState(0);

  const unlocked = progress.levelsCompleted + 1;
  const level = Math.min(picked ?? unlocked, unlocked);

  const goTo = (n: number) => {
    setPicked(Math.max(1, Math.min(n, unlocked)));
    setCleared(null);
  };

  const onComplete = (ms: number, moves: number) => {
    const prevBest = progress.bestTimes[level];
    // Pin the level, or the newly unlocked one would replace it under the popup.
    setPicked(level);
    const coins = level > progress.levelsCompleted ? LEVEL_COINS : 0;
    recordLevel(level, ms, moves);
    setCleared({ ms, moves, best: prevBest === undefined || ms < prevBest, coins });
  };

  return (
    <main className="hl flex min-h-dvh flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <header className="flex min-h-14 items-center justify-between">
          <h1 className="f-title text-xl">Path Finder</h1>
          {tab === "play" && (
            <div className="flex items-center">
              <LevelButton label="Previous level" onClick={() => goTo(level - 1)} disabled={level <= 1} flip />
              <span className="f-label min-w-[4.5rem] text-center tabular-nums">Level {level}</span>
              <LevelButton label="Next level" onClick={() => goTo(level + 1)} disabled={level >= unlocked} />
            </div>
          )}
        </header>

        <div className="relative flex flex-1 flex-col items-center pt-2 pb-6">
          {tab === "play" ? (
            <>
              <Maze key={`${level}-${attempt}`} level={level} onComplete={onComplete} />
              {cleared && (
                <div
                  role="dialog"
                  aria-label={`Level ${level} cleared`}
                  className="absolute inset-x-0 top-1/4 mx-auto flex w-[min(20rem,100%)] flex-col gap-1 rounded-[var(--hl-radius)] border-2 border-[var(--hl-ink)] bg-[var(--hl-bg)] p-5"
                >
                  <p className="f-title text-[1.625rem] leading-tight">Level {level} cleared</p>
                  <p className="f-label tabular-nums text-[var(--hl-muted)]">
                    {formatTime(cleared.ms)} · {cleared.moves} moves{cleared.best ? " · New best" : ""}
                  </p>
                  {cleared.coins > 0 && (
                    <p className="f-btn mt-1 tabular-nums text-[var(--hl-zone)]">+{cleared.coins} coins</p>
                  )}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      className={btnSecondary}
                      onClick={() => {
                        setCleared(null);
                        setAttempt((a) => a + 1);
                      }}
                    >
                      Replay
                    </button>
                    <button className={btnPrimary} onClick={() => goTo(level + 1)} autoFocus>
                      Next level
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : tab === "rewards" ? (
            <Rewards onCodeSubmit={onCodeSubmit} onStartSetup={() => setTab("setup")} />
          ) : tab === "setup" ? (
            <Setup onFinish={() => setTab("rewards")} onCancel={() => setTab("rewards")} />
          ) : (
            <Profile />
          )}
        </div>
      </div>

      <nav
        aria-label="Sections"
        className="sticky bottom-0 z-20 border-t-2 border-[var(--hl-ink)] bg-[var(--hl-paper-2)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto grid h-[4.25rem] max-w-lg grid-cols-3">
          {TABS.map(({ id, label }) => {
            const active = tab === id || (id === "rewards" && tab === "setup");
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-current={active ? "page" : undefined}
                className={`f-label relative flex flex-col items-center justify-center gap-1 transition-colors ${
                  active ? "text-[var(--hl-ink)]" : "text-[var(--hl-muted)]"
                }`}
              >
                {active && <span className="absolute inset-x-[28%] -top-0.5 h-1 bg-[var(--hl-accent)]" aria-hidden />}
                {TAB_ICONS[id]}
                {label}
              </button>
            );
          })}
        </div>
      </nav>
    </main>
  );
}

const icon = "size-[22px]";
const TABS: { id: "play" | "rewards" | "profile"; label: string }[] = [
  { id: "play", label: "Play" },
  { id: "rewards", label: "Rewards" },
  { id: "profile", label: "Profile" },
];
const TAB_ICONS: Record<(typeof TABS)[number]["id"], React.ReactNode> = {
  play: (
    <svg className={icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 4h16v16H4zM4 10h6M14 4v6M10 14h10M10 14v6" />
    </svg>
  ),
  rewards: (
    <svg className={icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M9.5 10.5h5" />
    </svg>
  ),
  profile: (
    <svg className={icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
    </svg>
  ),
};

function LevelButton({
  label,
  onClick,
  disabled,
  flip,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  flip?: boolean;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-11 items-center justify-center rounded-[var(--hl-radius)] text-[var(--hl-brand)] disabled:text-[var(--hl-line)]"
    >
      <svg viewBox="0 0 24 24" className={`size-5 ${flip ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="m9 5 7 7-7 7" />
      </svg>
    </button>
  );
}
