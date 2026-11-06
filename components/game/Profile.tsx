"use client";

import { formatTime, useProgress } from "@/lib/gameProgress";
import { label } from "./styles";

export default function Profile() {
  const progress = useProgress();
  const times = Object.values(progress.bestTimes);
  const fastest = times.length ? Math.min(...times) : null;

  return (
    <div className="flex w-full flex-col gap-8">
      <section className="flex items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-[var(--hl-radius)] bg-[var(--hl-brand)]">
          <span className="size-6 rounded-full bg-[var(--hl-accent)] shadow-[0_0_0_3px_var(--hl-surface)]" aria-hidden />
        </div>
        <div>
          <h2 className="f-title text-[1.625rem] leading-tight">Player</h2>
          <p className={label}>Level {progress.levelsCompleted + 1}</p>
        </div>
      </section>

      <dl className="grid grid-cols-3 border-y-2 border-[var(--hl-ink)]">
        <Stat label="Levels cleared" value={String(progress.levelsCompleted)} />
        <Stat label="Fastest clear" value={fastest === null ? "–" : formatTime(fastest)} />
        <Stat label="Total moves" value={String(progress.totalMoves)} />
      </dl>
    </div>
  );
}

function Stat({ label: name, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col-reverse gap-1 border-l border-[var(--hl-line)] px-3 py-4 first:border-l-0 first:pl-0">
      <dt className={label}>{name}</dt>
      <dd className="f-title text-2xl tabular-nums">{value}</dd>
    </div>
  );
}
