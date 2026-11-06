"use client";

import { useCallback, useRef, useState } from "react";
import GameShell from "@/components/game/GameShell";
import HiddenApp from "@/components/hidden/HiddenApp";
import { checkCode, saveState, type Session } from "@/lib/crypto";
import { requestMotionPermission } from "@/lib/quickExit";
import { isFreshState } from "@/lib/state";
import type { CodeResult, Layer, SavedState } from "@/lib/types";

// Single route. Switches between the game and the hidden layer via state only.
export default function Home() {
  const [layer, setLayer] = useState<Layer>("game");
  // Decrypted data and key live only here, and are dropped on exit.
  const [session, setSession] = useState<Session | null>(null);
  // First visit opens on "How this works"; the dev code goes straight to the plan.
  const [startOn, setStartOn] = useState<"about" | "plan" | undefined>();
  const sessionRef = useRef<Session | null>(null);

  const handleCode = async (code: string): Promise<CodeResult> => {
    // iOS only grants motion access (for shake-to-exit) from a tap, so ask before awaiting.
    requestMotionPermission();
    const result = await checkCode(code);
    switch (result.kind) {
      case "unlock":
        sessionRef.current = result.session;
        setSession(result.session);
        setStartOn(result.dev ? "plan" : isFreshState(result.session.state) ? "about" : undefined);
        setLayer("hidden");
        return "unlock";
      case "clear":
        return "reward"; // checkCode already wiped the hidden data.
      case "invite":
        return "setup";
      default:
        return "expired";
    }
  };

  const exit = useCallback(() => {
    sessionRef.current = null; // drop the key
    setSession(null); // drop decrypted data from memory
    setStartOn(undefined);
    setLayer("game");
  }, []);

  const persist = useCallback((state: SavedState) => {
    if (sessionRef.current) void saveState(sessionRef.current, state);
  }, []);

  if (layer === "hidden" && session) {
    return (
      <HiddenApp
        initialState={session.state}
        session={session}
        startOn={startOn}
        onChange={persist}
        onExit={exit}
      />
    );
  }

  return <GameShell onCodeSubmit={handleCode} />;
}
