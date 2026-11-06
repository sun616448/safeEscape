"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { goalOf, mazeForLevel, run, wallPath, type Dir, type Point } from "@/lib/maze";
import { formatTime } from "@/lib/gameProgress";

const KEYS: Record<string, Dir> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

const SWIPE_MIN_PX = 24;

interface Props {
  level: number;
  onComplete: (ms: number, moves: number) => void;
}

// Remount with `key={level}` to start a level fresh.
export default function Maze({ level, onComplete }: Props) {
  const maze = useMemo(() => mazeForLevel(level), [level]);
  const walls = useMemo(() => wallPath(maze), [maze]);
  const goal = goalOf(maze);

  const [pos, setPos] = useState<Point>({ x: 0, y: 0 });
  const [trail, setTrail] = useState<Point[]>([{ x: 0, y: 0 }]);
  const [moves, setMoves] = useState(0);
  const [done, setDone] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const swipeFrom = useRef<{ x: number; y: number } | null>(null);

  // Live clock, only while a run is in progress.
  useEffect(() => {
    if (done || startedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [done, startedAt]);

  const elapsed = startedAt === null ? 0 : now - startedAt;

  const move = (dir: Dir) => {
    if (done) return;
    const path = run(maze, pos, dir);
    if (!path.length) return;
    const t = Date.now();
    const start = startedAt ?? t;
    const end = path[path.length - 1];
    setStartedAt(start);
    setPos(end);
    setTrail((prev) => [...prev, ...path]);
    setMoves(moves + 1);
    setNow(t);
    if (end.x === goal.x && end.y === goal.y) {
      setDone(true);
      onComplete(t - start, moves + 1);
    }
  };

  // Keep the latest `move` for the window listener without re-subscribing every render.
  const moveRef = useRef(move);
  useEffect(() => {
    moveRef.current = move;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      const dir = KEYS[e.key] ?? KEYS[e.key.toLowerCase()];
      if (!dir) return;
      e.preventDefault();
      moveRef.current(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    swipeFrom.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const from = swipeFrom.current;
    swipeFrom.current = null;
    if (!from) return;
    const dx = e.clientX - from.x;
    const dy = e.clientY - from.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN_PX) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
    else move(dy > 0 ? "down" : "up");
  };

  const pad = 0.5;

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <div className="flex w-full items-center justify-between text-sm text-pf-ink/70 tabular-nums">
        <span>Moves {moves}</span>
        <span>{formatTime(elapsed)}</span>
      </div>

      <div
        className="w-full touch-none select-none rounded-2xl bg-pf-cream p-2 shadow-[0_1px_0_#0000000d,0_8px_24px_-12px_#24524e55]"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipeFrom.current = null)}
      >
        <svg
          viewBox={`${-pad} ${-pad} ${maze.cols + pad * 2} ${maze.rows + pad * 2}`}
          className="block aspect-square w-full"
          role="img"
          aria-label={`Maze, level ${level}. Use arrow keys, swipe, or the buttons to move.`}
        >
          {trail.map((p, i) => (
            <rect
              key={i}
              x={p.x + 0.3}
              y={p.y + 0.3}
              width={0.4}
              height={0.4}
              rx={0.2}
              className="fill-pf-gold/30"
            />
          ))}
          <rect
            x={goal.x + 0.18}
            y={goal.y + 0.18}
            width={0.64}
            height={0.64}
            rx={0.14}
            className="fill-pf-teal/15 stroke-pf-teal"
            strokeWidth={0.08}
          />
          <path
            d={walls}
            fill="none"
            className="stroke-pf-teal"
            strokeWidth={maze.cols > 12 ? 0.14 : 0.18}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <g
            style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
            className="transition-transform duration-150 ease-out motion-reduce:transition-none"
          >
            <circle cx={0.5} cy={0.5} r={0.3} className="fill-pf-gold stroke-pf-teal-dark" strokeWidth={0.05} />
          </g>
        </svg>
      </div>

      <DPad onMove={move} disabled={done} />
    </div>
  );
}

function DPad({ onMove, disabled }: { onMove: (d: Dir) => void; disabled: boolean }) {
  const btn =
    "flex h-14 w-14 items-center justify-center rounded-xl bg-pf-teal text-pf-cream shadow-sm active:bg-pf-teal-dark disabled:opacity-40";
  const arrow = (rotate: number) => (
    <svg viewBox="0 0 24 24" className="h-6 w-6" style={{ transform: `rotate(${rotate}deg)` }} aria-hidden>
      <path d="M12 5l7 8H5z" fill="currentColor" />
    </svg>
  );
  return (
    <div className="grid grid-cols-3 gap-2" aria-label="Move">
      <span />
      <button className={btn} onClick={() => onMove("up")} disabled={disabled} aria-label="Up">
        {arrow(0)}
      </button>
      <span />
      <button className={btn} onClick={() => onMove("left")} disabled={disabled} aria-label="Left">
        {arrow(-90)}
      </button>
      <span />
      <button className={btn} onClick={() => onMove("right")} disabled={disabled} aria-label="Right">
        {arrow(90)}
      </button>
      <span />
      <button className={btn} onClick={() => onMove("down")} disabled={disabled} aria-label="Down">
        {arrow(180)}
      </button>
      <span />
    </div>
  );
}
