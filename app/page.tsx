"use client";

import { useState } from "react";
import type { Layer } from "@/lib/types";

// Single route. Switches between the game and the hidden layer via state only.
// Placeholders: components/game/* and components/hidden/* will replace these.
export default function Home() {
  const [layer, setLayer] = useState<Layer>("game");

  if (layer === "hidden") {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p>Hidden layer placeholder</p>
        <button className="rounded-lg border px-4 py-2" onClick={() => setLayer("game")}>
          Exit
        </button>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-[#f4efe4] p-6 text-[#2f6f6a]">
      <h1 className="text-3xl font-semibold">Path Finder</h1>
      <p>Maze coming soon.</p>
    </main>
  );
}
