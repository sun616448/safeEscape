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
  const [firstVisit, setFirstVisit] = useState(false);
  const sessionRef = useRef<Session | null>(null);

  const handleCode = async (code: string): Promise<CodeResult> => {
    // iOS only grants motion access (for shake-to-exit) from a tap, so ask before awaiting.
    requestMotionPermission();
    const result = await checkCode(code);
    switch (result.kind) {
      case "unlock":
        sessionRef.current = result.session;
        setSession(result.session);
        // First visit (nothing saved yet): explain how this works before anything else.
        setFirstVisit(isFreshState(result.session.state));
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
    setFirstVisit(false);
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
        showIntro={firstVisit}
        onChange={persist}
        onExit={exit}
      />
    );
  }

  return <GameShell onCodeSubmit={handleCode} />;
}
