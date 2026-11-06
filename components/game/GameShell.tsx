"use client";

import { useState } from "react";
import Maze from "./Maze";
import Profile from "./Profile";
import Rewards from "./Rewards";
import Setup from "./Setup";
import type { CodeResult } from "@/lib/types";
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
    <main className="flex flex-1 flex-col bg-pf-sand/60 text-pf-ink">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="flex items-center justify-between py-3">
          <h1 className="text-xl font-semibold text-pf-teal">Path Finder</h1>
          {tab === "play" && (
            <div className="flex items-center gap-1">
              <LevelButton label="Previous level" onClick={() => goTo(level - 1)} disabled={level <= 1}>
                ‹
              </LevelButton>
              <span className="min-w-20 text-center text-sm font-medium tabular-nums">Level {level}</span>
              <LevelButton label="Next level" onClick={() => goTo(level + 1)} disabled={level >= unlocked}>
                ›
              </LevelButton>
            </div>
          )}
        </header>

        <div className="relative flex flex-1 flex-col items-center pb-4">
          {tab === "play" ? (
            <>
              <Maze key={`${level}-${attempt}`} level={level} onComplete={onComplete} />
              {cleared && (
                <div className="absolute inset-x-0 top-1/4 mx-auto w-[min(20rem,100%)] rounded-2xl bg-white p-5 text-center shadow-xl">
                  <p className="text-lg font-semibold text-pf-teal">Level {level} cleared</p>
                  <p className="mt-1 text-sm text-pf-ink/70 tabular-nums">
                    {formatTime(cleared.ms)} · {cleared.moves} moves{cleared.best ? " · New best" : ""}
                  </p>
                  {cleared.coins > 0 && (
                    <p className="mt-1 text-sm font-medium text-pf-teal">+{cleared.coins} coins</p>
                  )}
                  <div className="mt-4 flex gap-2">
                    <button
                      className="flex-1 rounded-xl border border-pf-teal px-4 py-3 text-sm font-medium text-pf-teal"
                      onClick={() => {
                        setCleared(null);
                        setAttempt((a) => a + 1);
                      }}
                    >
                      Replay
                    </button>
                    <button
                      className="flex-1 rounded-xl bg-pf-teal px-4 py-3 text-sm font-medium text-pf-cream active:bg-pf-teal-dark"
                      onClick={() => goTo(level + 1)}
                      autoFocus
                    >
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

      <nav className="sticky bottom-0 border-t border-pf-sand bg-pf-cream pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-md">
          <TabButton active={tab === "play"} onClick={() => setTab("play")}>
            Play
          </TabButton>
          <TabButton active={tab === "rewards"} onClick={() => setTab("rewards")}>
            Rewards
          </TabButton>
          <TabButton active={tab === "profile"} onClick={() => setTab("profile")}>
            Profile
          </TabButton>
        </div>
      </nav>
    </main>
  );
}

function LevelButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl leading-none text-pf-teal disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex-1 py-4 text-sm font-medium ${active ? "text-pf-teal" : "text-pf-ink/50"}`}
    >
      {children}
    </button>
  );
}
