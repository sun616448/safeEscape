"use client";

import { useEffect, useState } from "react";
import ContactButtons from "./ContactButtons";
import type { Locale, PlanResponse, Situation } from "@/lib/types";
import type { Strings } from "@/lib/i18n";

type Props = {
  situation: Situation;
  t: Strings;
  locale: Locale;
  /** Persist the chat as it grows (encrypted by the caller). */
  onUpdate: (s: Situation) => void;
  onViewPlan: () => void;
};

// Ongoing chat. Claude asks one thing at a time, infers her goal and county,
// and returns an updated plan whenever it has enough to act on.
export default function Chat({ situation, t, locale, onUpdate, onViewPlan }: Props) {
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Indices of assistant turns that came with a plan update (this session only).
  const [planMarks, setPlanMarks] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Scroll to the very bottom so the newest message clears the sticky message box.
    window.scrollTo({ top: document.documentElement.scrollHeight });
  }, [situation.turns.length, loading]);

  async function send(text: string, base: Situation = situation) {
    const content = text.trim();
    if (!content || loading) return;
    const withMine: Situation = {
      ...base,
      turns: [...base.turns, { role: "user", content }],
      updatedAt: new Date().toISOString(),
    };
    onUpdate(withMine);
    setDraft("");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turns: withMine.turns,
          county: withMine.county,
          notes: withMine.notes,
          currentPlan: withMine.plan ?? undefined,
          done: Object.keys(withMine.checked)
            .filter((k) => withMine.checked[k])
            .map((k) => k.replace(/^(right-now|step|bag):/, "")),
          locale,
        }),
      });
      const data = (await res.json()) as PlanResponse;
      if (data.type === "error") {
        setError(data.message);
        return;
      }
      const turns = [
        ...withMine.turns,
        { role: "assistant" as const, content: data.reply, ...(data.contacts?.length ? { contacts: data.contacts } : {}) },
      ];
      if (data.plan) setPlanMarks((m) => new Set(m).add(turns.length - 1));
      onUpdate({
        ...withMine,
        turns,
        county: data.county ?? withMine.county,
        notes: data.notes,
        plan: data.plan ?? withMine.plan,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      setError(t.offline);
    } finally {
      setLoading(false);
    }
  }

  const lastIsMineUnanswered =
    !loading && situation.turns.length > 0 && situation.turns[situation.turns.length - 1].role === "user";

  return (
    <div className="flex flex-1 flex-col">
      <ol className="flex flex-1 flex-col gap-3 pb-4" aria-live="polite">
        <li className="max-w-[85%] self-start rounded-2xl bg-[var(--hl-surface)] px-4 py-3 text-[15px] leading-relaxed">
          {t.firstMessage}
        </li>
        {situation.turns.map((m, i) => (
          <li key={i} className={`flex max-w-[85%] flex-col gap-2 ${m.role === "user" ? "self-end" : "self-start"}`}>
            <div
              className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
                m.role === "user"
                  ? "bg-[var(--hl-brand-soft)]"
                  : "bg-[var(--hl-surface)]"
              }`}
            >
              {m.content}
            </div>
            {m.role === "assistant" && <ContactButtons ids={m.contacts} t={t} />}
            {planMarks.has(i) && (
              <button
                onClick={onViewPlan}
                className="flex min-h-11 items-center gap-2 self-start rounded-full bg-[var(--hl-brand)] px-4 text-sm font-semibold text-[var(--hl-brand-ink)]"
              >
                ✓ {t.planUpdated} ›
              </button>
            )}
          </li>
        ))}
        {loading && (
          <li
            className="self-start rounded-2xl bg-[var(--hl-surface)] px-4 py-3 text-lg leading-none tracking-widest text-[var(--hl-muted)] animate-pulse"
            role="status"
            aria-label="…"
          >
            {t.thinking}
          </li>
        )}
      </ol>

      {error && (
        <p className="mb-2 text-sm text-[var(--hl-danger)]">
          {error}{" "}
          {lastIsMineUnanswered && (
            <button
              className="underline underline-offset-4"
              onClick={() => {
                const last = situation.turns[situation.turns.length - 1];
                send(last.content, { ...situation, turns: situation.turns.slice(0, -1) });
              }}
            >
              {t.retry}
            </button>
          )}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="sticky bottom-[var(--hl-tabbar)] -mx-4 flex items-end gap-2 border-t border-[var(--hl-line)] bg-[var(--hl-bg)] px-4 pb-3 pt-3"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send(draft);
            }
          }}
          rows={1}
          maxLength={4000}
          placeholder={t.messagePlaceholder}
          aria-label={t.messagePlaceholder}
          autoComplete="off"
          spellCheck={false}
          className="max-h-40 min-h-12 flex-1 resize-none rounded-3xl border border-[var(--hl-line)] bg-[var(--hl-surface)] px-4 py-3 text-base leading-snug outline-none [field-sizing:content] focus:border-[var(--hl-brand)]"
        />
        <button
          type="submit"
          disabled={!draft.trim() || loading}
          className="min-h-12 shrink-0 rounded-full bg-[var(--hl-brand)] px-5 font-semibold text-[var(--hl-brand-ink)] disabled:opacity-40"
        >
          {t.send}
        </button>
      </form>
    </div>
  );
}
