"use client";

import { useCallback, useEffect, useState } from "react";
import { STRINGS } from "@/lib/i18n";
import { useQuickExit } from "@/lib/quickExit";
import { freshSituation } from "@/lib/state";
import type { LogEntry, Plan, SavedState, Situation } from "@/lib/types";
import type { Session } from "@/lib/vault";
import Chat from "./Chat";
import Emergency from "./Emergency";
import HowItWorks from "./HowItWorks";
import Log from "./Log";
import PlanView from "./PlanView";
import "./hidden.css";

type Tab = "plan" | "talk" | "record";
type View = Tab | "help" | "about";

type Props = {
  /** Decrypted state from the passcode unlock (an empty state on first use). */
  initialState: SavedState;
  /** Unlocked key, used to encrypt/decrypt log photos and voice notes. */
  session: Session | null;
  /** Opening screen override: "about" on first visit, "plan" for the dev code. */
  startOn?: "about" | "plan";
  /** Development only: the dev codes, shown on "How this works". */
  devCodes?: { myCode: string; clearCode: string };
  /** Called on every change so the caller can re-encrypt and save. */
  onChange: (state: SavedState) => void;
  /** Return to the game and lock. Caller must drop decrypted state. */
  onExit: () => void;
};

const icon = "size-[22px]";
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

export default function HiddenApp({ initialState, session, startOn, devCodes, onChange, onExit }: Props) {
  const [state, setState] = useState<SavedState>(initialState);
  // Open where she'll most likely want to be: her plan if she has one, otherwise the chat.
  const [view, setView] = useState<View>(startOn ?? (initialState.situation.plan ? "plan" : "talk"));
  const [lastTab, setLastTab] = useState<Tab>(startOn === "plan" || initialState.situation.plan ? "plan" : "talk");
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
    if (v !== "help" && v !== "about") setLastTab(v);
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

  const btn = "f-btn inline-flex min-h-11 items-center rounded-[var(--hl-radius)] px-4";
  const tabs: { id: Tab; label: string }[] = [
    { id: "plan", label: t.myPlan },
    { id: "talk", label: t.talk },
    { id: "record", label: t.record },
  ];

  return (
    <div className={`hl relative flex min-h-dvh flex-1 flex-col overflow-x-clip`}>
      <div className="contours" aria-hidden />
      <header className="sticky top-0 z-20 bg-[var(--hl-bg)] px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-2">
          {view === "help" || view === "about" ? (
            <button onClick={() => go(lastTab)} className={`${btn} -ml-3`}>
              ← {t.back}
            </button>
          ) : (
            <button
              onClick={switchLanguage}
              disabled={translating}
              className={`${btn} f-label -ml-3 !text-xs text-[var(--hl-muted)]`}
              aria-label="Language"
            >
              {translating ? "…" : t.language}
            </button>
          )}
          <div className="flex items-center gap-2">
            {view !== "help" && (
              <button onClick={() => go("help")} className={`${btn} bg-[var(--hl-danger)] text-[var(--hl-danger-ink)]`}>
                {t.sos}
              </button>
            )}
            <button onClick={exit} className={`${btn} bg-[var(--hl-ink)] px-5 text-[var(--hl-bg)]`}>
              {t.exit}
            </button>
          </div>
        </div>
      </header>

      <main
        className={`relative mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 px-5 pt-3 ${
          view === "talk" ? "pb-[var(--hl-tabbar)]" : "pb-[calc(var(--hl-tabbar)+2rem)]"
        }`}
      >
        {view === "help" && <Emergency county={s.county} t={t} locale={state.locale} onAbout={() => go("about")} />}
        {view === "about" && <HowItWorks t={t} codes={devCodes} onClose={() => go(lastTab)} />}

        {view === "plan" &&
          (s.plan ? (
            <PlanView
              plan={s.plan}
              checked={s.checked}
              county={s.county}
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
            <div className="flex flex-1 flex-col items-start justify-center gap-6 pb-16">
              <span className="size-7 rounded-full bg-[var(--hl-accent)] shadow-[0_0_0_4px_var(--hl-bg),0_0_0_6px_var(--hl-brand)]" aria-hidden />
              <p className="f-title max-w-[18ch] text-[1.75rem] leading-[1.1] text-balance">{t.noPlanYet}</p>
              <button onClick={() => go("talk")} className={`${btn} min-h-12 bg-[var(--hl-brand)] px-6 text-[var(--hl-brand-ink)]`}>
                {t.talk} →
              </button>
            </div>
          ))}

        {view === "talk" && (
          <Chat
            situation={s}
            t={t}
            locale={state.locale}
            onUpdate={setSituation}
            onViewPlan={() => go("plan")}
            onClear={() => setSituation({ ...s, turns: [], updatedAt: new Date().toISOString() })}
            onRestart={() => setSituation(freshSituation())}
          />
        )}

        {view === "record" && (
          <Log log={state.log} session={session} county={s.county} t={t} locale={state.locale} onChange={setLog} />
        )}
      </main>

      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-[var(--hl-ink)] bg-[var(--hl-paper-2)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto grid h-[4.25rem] max-w-lg grid-cols-3">
          {tabs.map(({ id, label }) => {
            const active = view === id;
            return (
              <button
                key={id}
                onClick={() => go(id)}
                aria-current={active ? "page" : undefined}
                className={`f-label relative flex flex-col items-center justify-center gap-1 transition-colors ${
                  active ? "text-[var(--hl-ink)]" : "text-[var(--hl-muted)]"
                }`}
              >
                {active && <span className="absolute inset-x-[28%] -top-0.5 h-1 bg-[var(--hl-accent)]" aria-hidden />}
                {TAB_ICONS[id]}
                {label}
                {id === "plan" && planUnseen && (
                  <span
                    className="absolute right-[calc(50%-1.25rem)] top-2 size-2.5 rounded-full bg-[var(--hl-accent)] ring-2 ring-[var(--hl-paper-2)]"
                    aria-label={t.planUpdated}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
