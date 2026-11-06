"use client";

import { useCallback, useEffect, useState } from "react";
import { STRINGS } from "@/lib/i18n";
import { useQuickExit } from "@/lib/quickExit";
import type { LogEntry, Plan, SavedState, Situation } from "@/lib/types";
import type { Session } from "@/lib/vault";
import Chat from "./Chat";
import Emergency from "./Emergency";
import Log from "./Log";
import PlanView from "./PlanView";
import "./hidden.css";

type Tab = "plan" | "talk" | "record";
type View = Tab | "help";

type Props = {
  /** Decrypted state from the passcode unlock (or EMPTY_STATE on first use). */
  initialState: SavedState;
  /** Unlocked key, used to encrypt/decrypt log photos and voice notes. */
  session: Session | null;
  /** Called on every change so the caller can re-encrypt and save. */
  onChange: (state: SavedState) => void;
  /** Return to the game and lock. Caller must drop decrypted state. */
  onExit: () => void;
};

function freshSituation(): Situation {
  const now = new Date().toISOString();
  return { id: now, createdAt: now, updatedAt: now, turns: [], notes: {}, plan: null, checked: {} };
}

export const EMPTY_STATE: SavedState = { version: 4, locale: "en", situation: freshSituation(), log: [] };

const icon = "size-6";
const TAB_ICONS: Record<Tab, React.ReactNode> = {
  plan: (
    <svg className={icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="m3.5 6 1.2 1.2L7 5M3.5 12l1.2 1.2L7 11" />
      <circle cx="5" cy="18" r="1.3" />
    </svg>
  ),
  talk: (
    <svg className={icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 12.5a7.5 7.5 0 0 1-11 6.6L4 20l1-4.3A7.5 7.5 0 1 1 20 12.5Z" />
    </svg>
  ),
  record: (
    <svg className={icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M14 3v5h5M9.5 13h6M9.5 17h4" />
    </svg>
  ),
};

export default function HiddenApp({ initialState, session, onChange, onExit }: Props) {
  const [state, setState] = useState<SavedState>(initialState);
  // Open where she'll most likely want to be: her plan if she has one, otherwise the chat.
  const [view, setView] = useState<View>(initialState.situation.plan ? "plan" : "talk");
  const [lastTab, setLastTab] = useState<Tab>(initialState.situation.plan ? "plan" : "talk");
  const [planUnseen, setPlanUnseen] = useState(false);
  const [translating, setTranslating] = useState(false);
  const t = STRINGS[state.locale];
  const s = state.situation;

  const exit = useCallback(() => onExit(), [onExit]);
  useQuickExit(exit);

  useEffect(() => {
    onChange(state);
  }, [state, onChange]);

  // Each screen starts at the top (the chat scrolls itself to the latest message).
  useEffect(() => {
    if (view !== "talk") window.scrollTo(0, 0);
  }, [view]);

  const go = (v: View) => {
    if (v !== "help") setLastTab(v);
    if (v === "plan") setPlanUnseen(false);
    setView(v);
  };

  const setSituation = (next: Situation) => {
    if (next.plan && next.plan !== s.plan && view !== "plan") setPlanUnseen(true);
    setState((st) => ({ ...st, situation: next }));
  };
  // Her own edit on the plan screen. Moves the checkmark if she renamed a checked line.
  const editPlan = (plan: Plan, rename?: { from: string; to: string }) =>
    setState((st) => {
      const checked = { ...st.situation.checked };
      if (rename && checked[rename.from]) {
        delete checked[rename.from];
        checked[rename.to] = true;
      }
      return { ...st, situation: { ...st.situation, plan, checked, updatedAt: new Date().toISOString() } };
    });
  // Switch the whole app, including her plan's text. Checkmarks follow each line by position.
  async function switchLanguage() {
    const locale = state.locale === "en" ? "es" : "en";
    setState((st) => ({ ...st, locale }));
    const plan = s.plan;
    if (!plan) return;
    setTranslating(true);
    try {
      const res = await fetch("/api/plan/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, locale }),
      });
      const data = (await res.json()) as { type: "plan"; plan: Plan } | { type: "error" };
      if (data.type !== "plan") return;
      const next = data.plan;
      const keys = (p: Plan) => [
        `right-now:${p.rightNow.title}`,
        ...p.steps.map((x) => `step:${x.title}`),
        ...p.goBag.map((x) => `bag:${x}`),
      ];
      const before = keys(plan);
      const after = keys(next);
      setState((st) => {
        if (st.situation.plan !== plan) return st; // changed meanwhile: keep hers
        const checked: Record<string, boolean> = {};
        before.forEach((k, i) => {
          if (st.situation.checked[k]) checked[after[i]] = true;
        });
        return { ...st, situation: { ...st.situation, plan: next, checked } };
      });
    } catch {
      /* offline: labels still switch; the plan stays as it was */
    } finally {
      setTranslating(false);
    }
  }

  const setLog = (log: LogEntry[]) => setState((st) => ({ ...st, log }));
  const toggle = (key: string) =>
    setState((st) => ({
      ...st,
      situation: { ...st.situation, checked: { ...st.situation.checked, [key]: !st.situation.checked[key] } },
    }));

  const pill = "min-h-11 rounded-full px-4 text-sm font-semibold";
  const tabs: { id: Tab; label: string }[] = [
    { id: "plan", label: t.myPlan },
    { id: "talk", label: t.talk },
    { id: "record", label: t.record },
  ];

  return (
    <div className="hl flex min-h-dvh flex-1 flex-col">
      <header className="sticky top-0 z-20 bg-[var(--hl-bg)]/95 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2">
          {view === "help" ? (
            <button onClick={() => go(lastTab)} className={`${pill} -ml-2`}>
              ← {t.back}
            </button>
          ) : (
            <button
              onClick={switchLanguage}
              disabled={translating}
              className={`${pill} -ml-2 text-[var(--hl-muted)]`}
              aria-label="Language"
            >
              {translating ? "…" : t.language}
            </button>
          )}
          <div className="flex items-center gap-2">
            {view !== "help" && (
              <button onClick={() => go("help")} className={`${pill} bg-[var(--hl-danger)] text-[var(--hl-danger-ink)]`}>
                {t.sos}
              </button>
            )}
            <button onClick={exit} className={`${pill} bg-[var(--hl-ink)] px-5 text-[var(--hl-bg)]`}>
              {t.exit}
            </button>
          </div>
        </div>
      </header>

      <main className={`mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-4 pt-3 ${
          view === "talk" ? "pb-[var(--hl-tabbar)]" : "pb-[calc(var(--hl-tabbar)+1.5rem)]"
        }`}>
        {view === "help" && <Emergency county={s.county} t={t} locale={state.locale} />}

        {view === "plan" &&
          (s.plan ? (
            <PlanView
              plan={s.plan}
              checked={s.checked}
              t={t}
              locale={state.locale}
              onToggle={toggle}
              onEdit={editPlan}
              onTalk={() => go("talk")}
              onHelp={() => go("help")}
              onReset={() => {
                setSituation(freshSituation());
                go("talk");
              }}
            />
          ) : (
            <div className="flex flex-1 flex-col items-start justify-center gap-5 pb-16">
              <p className="max-w-[22ch] text-2xl font-semibold leading-snug text-balance">{t.noPlanYet}</p>
              <button
                onClick={() => go("talk")}
                className="min-h-12 rounded-full bg-[var(--hl-brand)] px-6 font-semibold text-[var(--hl-brand-ink)]"
              >
                {t.talk} →
              </button>
            </div>
          ))}

        {view === "talk" && (
          <Chat situation={s} t={t} locale={state.locale} onUpdate={setSituation} onViewPlan={() => go("plan")} />
        )}

        {view === "record" && (
          <Log log={state.log} session={session} county={s.county} t={t} locale={state.locale} onChange={setLog} />
        )}
      </main>

      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--hl-line)] bg-[var(--hl-surface)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto grid h-16 max-w-lg grid-cols-3">
          {tabs.map(({ id, label }) => {
            const active = view === id;
            return (
              <button
                key={id}
                onClick={() => go(id)}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
                  active ? "font-semibold text-[var(--hl-brand)]" : "font-medium text-[var(--hl-muted)]"
                }`}
              >
                {TAB_ICONS[id]}
                {label}
                {id === "plan" && planUnseen && (
                  <span className="absolute right-[calc(50%-1.1rem)] top-2.5 size-2.5 rounded-full bg-[var(--hl-accent)]" aria-label={t.planUpdated} />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
