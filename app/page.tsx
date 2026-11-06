"use client";

import { useState } from "react";
import type { CodeResult, Layer } from "@/lib/types";
import { checkCode, type Session } from "@/lib/crypto";
import GameShell from "@/components/game/GameShell";
import HowItWorks from "@/components/hidden/HowItWorks";

// Single route. Switches between the game and the hidden layer via state only.
// Placeholder: components/hidden/* will replace the hidden branch.
export default function Home() {
  const [layer, setLayer] = useState<Layer>("game");
  // Decrypted data and key live only here, and are dropped on exit.
  const [session, setSession] = useState<Session | null>(null);
  const [showIntro, setShowIntro] = useState(false);

  const handleCode = async (code: string): Promise<CodeResult> => {
    const result = await checkCode(code);
    switch (result.kind) {
      case "unlock": {
        const { state } = result.session;
        setSession(result.session);
        // First visit (nothing saved yet): explain everything before anything else.
        setShowIntro(!state.situation && !state.plan);
        setLayer("hidden");
        return "unlock";
      }
      case "clear":
        return "reward"; // checkCode already wiped the hidden data.
      case "invite":
        return "setup";
      default:
        return "expired";
    }
  };

  const exit = () => {
    setSession(null);
    setShowIntro(false);
    setLayer("game");
  };

  if (layer === "hidden" && session) {
    return (
      <main className="flex flex-1 flex-col bg-white text-pf-ink">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-6">
          <div className="flex items-center justify-between">
            <button onClick={() => setShowIntro(true)} className="text-sm text-pf-teal underline">
              How this works
            </button>
            <button
              onClick={exit}
              className="rounded-lg bg-pf-ink px-4 py-2 text-sm font-medium text-white active:opacity-80"
            >
              Exit
            </button>
          </div>
          {showIntro ? (
            <HowItWorks onClose={() => setShowIntro(false)} />
          ) : (
            <p className="text-sm text-pf-ink/70">Planning tool coming soon.</p>
          )}
        </div>
      </main>
    );
  }

  return <GameShell onCodeSubmit={handleCode} />;
}
