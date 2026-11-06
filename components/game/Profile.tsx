"use client";

import { formatTime, useProgress } from "@/lib/gameProgress";

export default function Profile() {
  const progress = useProgress();
  const times = Object.values(progress.bestTimes);
  const fastest = times.length ? Math.min(...times) : null;

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-pf-teal">
          <span className="h-6 w-6 rounded-full bg-pf-gold" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-pf-ink">Player</h2>
          <p className="text-sm text-pf-ink/60">Level {progress.levelsCompleted + 1}</p>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <Stat label="Levels cleared" value={String(progress.levelsCompleted)} />
        <Stat label="Fastest clear" value={fastest === null ? "–" : formatTime(fastest)} />
        <Stat label="Total moves" value={String(progress.totalMoves)} />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-pf-cream p-3 text-center">
      <div className="text-xl font-semibold text-pf-ink tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-pf-ink/60">{label}</div>
    </div>
  );
}
