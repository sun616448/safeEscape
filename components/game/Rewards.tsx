"use client";

import { useState } from "react";
import type { CodeResult } from "@/lib/types";
import { grantPromo, LEVEL_COINS, useProgress } from "@/lib/gameProgress";

interface Props {
  /** See CodeResult in lib/types.ts. "unlock" means the caller already left the game. */
  onCodeSubmit: (code: string) => Promise<CodeResult>;
  /** The invite code was redeemed on a device with no codes yet. */
  onStartSetup: () => void;
}

type Notice = { tone: "success" | "neutral"; text: string };

export default function Rewards({ onCodeSubmit, onStartSetup }: Props) {
  const progress = useProgress();
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = code.trim();
    // Clear the field right away so the code never stays on screen.
    setCode("");
    setNotice(null);
    if (!value) return;
    setBusy(true);
    let result: CodeResult = "expired";
    try {
      result = await onCodeSubmit(value);
    } catch {
      // Fall through to the ordinary "expired" message.
    }
    setBusy(false);
    if (result === "unlock") return;
    if (result === "setup") {
      onStartSetup();
    } else if (result === "reward") {
      const coins = grantPromo();
      setNotice({ tone: "success", text: `Code redeemed! +${coins} coins` });
    } else {
      setNotice({ tone: "neutral", text: "This code has expired or was already used." });
    }
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="flex items-center justify-between rounded-2xl bg-pf-teal p-5 text-pf-cream">
        <div>
          <p className="text-sm opacity-80">Coins</p>
          <p className="text-3xl font-semibold tabular-nums">{progress.coins}</p>
        </div>
        <span className="h-10 w-10 rounded-full bg-pf-gold shadow-inner" aria-hidden />
      </section>

      <section className="rounded-2xl bg-pf-cream p-4">
        <form onSubmit={submit} className="flex flex-col gap-2" autoComplete="off">
          <label htmlFor="redeem-code" className="text-sm font-medium text-pf-ink">
            Redeem a code
          </label>
          <p className="text-xs text-pf-ink/60">Got a code from a friend or our newsletter? Enter it here.</p>
          <div className="flex gap-2">
            <input
              id="redeem-code"
              name="pf-redeem"
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setNotice(null);
              }}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="go"
              className="min-w-0 flex-1 rounded-xl border border-pf-sand bg-white px-3 py-3 text-base text-pf-ink [-webkit-text-security:disc] outline-none focus:border-pf-teal"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-pf-teal px-4 py-3 text-sm font-medium text-pf-cream active:bg-pf-teal-dark disabled:opacity-50"
            >
              Redeem
            </button>
          </div>
          <p
            role="status"
            className={`min-h-5 text-sm ${notice?.tone === "success" ? "font-medium text-pf-teal" : "text-pf-ink/70"}`}
          >
            {notice?.text}
          </p>
        </form>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-pf-ink">Rewards history</h2>
        <ul className="flex flex-col gap-2">
          {progress.redeemed.map((r, i) => (
            <li key={i} className="flex items-center justify-between rounded-xl bg-pf-cream px-4 py-3 text-sm">
              <span>Promo code · {r.date}</span>
              <span className="font-medium text-pf-teal tabular-nums">+{r.coins}</span>
            </li>
          ))}
          <li className="flex items-center justify-between rounded-xl bg-pf-cream px-4 py-3 text-sm">
            <span>Levels cleared · {progress.levelsCompleted}</span>
            <span className="font-medium text-pf-teal tabular-nums">+{progress.levelsCompleted * LEVEL_COINS}</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
