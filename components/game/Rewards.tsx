"use client";

import { useState } from "react";
import type { CodeResult } from "@/lib/types";
import { grantPromo, LEVEL_COINS, useProgress } from "@/lib/gameProgress";
import { btnPrimary, field, label } from "./styles";

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
    <div className="flex w-full flex-col gap-8">
      <section className="flex items-end justify-between border-b-2 border-[var(--hl-ink)] pb-4">
        <div>
          <p className={label}>Coins</p>
          <p className="f-title text-[2.75rem] leading-none tabular-nums">{progress.coins}</p>
        </div>
        <svg viewBox="0 0 40 40" className="size-11" aria-hidden>
          <circle cx="20" cy="20" r="17" fill="var(--hl-accent)" stroke="var(--hl-ink)" strokeWidth="2" />
          <circle cx="20" cy="20" r="11" fill="none" stroke="var(--hl-ink)" strokeOpacity="0.35" strokeWidth="1.5" />
        </svg>
      </section>

      <form onSubmit={submit} className="flex flex-col gap-2" autoComplete="off">
        <label htmlFor="redeem-code" className="f-title text-lg">
          Redeem a code
        </label>
        <p className="text-sm text-[var(--hl-muted)]">Got a code from a friend or our newsletter? Enter it here.</p>
        <div className="mt-1 flex gap-2">
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
            className={`${field} flex-1 [-webkit-text-security:disc]`}
          />
          <button type="submit" disabled={busy} className={btnPrimary}>
            Redeem
          </button>
        </div>
        <p
          role="status"
          className={`min-h-6 text-sm ${notice?.tone === "success" ? "font-bold text-[var(--hl-brand)]" : "text-[var(--hl-muted)]"}`}
        >
          {notice?.text}
        </p>
      </form>

      <section className="flex flex-col">
        <h2 className={`${label} pb-2`}>Rewards history</h2>
        <ul className="border-t-2 border-[var(--hl-ink)]">
          {progress.redeemed.map((r, i) => (
            <li key={i} className="flex min-h-12 items-center justify-between border-b border-[var(--hl-line)] text-base">
              <span>Promo code · {r.date}</span>
              <span className="f-btn tabular-nums text-[var(--hl-zone)]">+{r.coins}</span>
            </li>
          ))}
          <li className="flex min-h-12 items-center justify-between border-b border-[var(--hl-line)] text-base">
            <span>Levels cleared · {progress.levelsCompleted}</span>
            <span className="f-btn tabular-nums text-[var(--hl-zone)]">+{progress.levelsCompleted * LEVEL_COINS}</span>
          </li>
        </ul>
      </section>
    </div>
  );
}
