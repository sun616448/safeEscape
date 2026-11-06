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
  /** Erase the messages, keep the plan and what is known. */
  onClear: () => void;
  /** Erase the chat and the plan. */
  onRestart: () => void;
};

// Ongoing chat. Claude asks one thing at a time, infers her goal and county,
// and returns an updated plan whenever it has enough to act on.
export default function Chat({ situation, t, locale, onUpdate, onViewPlan, onClear, onRestart }: Props) {
  const [confirm, setConfirm] = useState<"clear" | "restart" | null>(null);
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
      {situation.turns.length > 0 && !loading && (
        <div className="-mt-1 mb-2 flex justify-end gap-1">
          {(
            [
              ["clear", t.clearChat, t.clearChatConfirm, onClear],
              ["restart", t.restart, t.restartConfirm, onRestart],
            ] as const
          ).map(([id, label, confirmLabel, action]) => (
            <button
              key={id}
              onClick={() => {
                if (confirm !== id) return setConfirm(id);
                setConfirm(null);
                setPlanMarks(new Set());
                setError(null);
                action();
              }}
              onBlur={() => setConfirm((c) => (c === id ? null : c))}
              className={`f-label min-h-11 px-2 ${confirm === id ? "text-[var(--hl-danger)]" : "text-[var(--hl-muted)]"}`}
            >
              {confirm === id ? confirmLabel : label}
            </button>
          ))}
        </div>
      )}
      {/* No bubbles: Claude's words sit on the paper; hers are indented and marked with the gold player dot. */}
      <ol className="flex flex-1 flex-col gap-6 pb-6" aria-live="polite">
        <li className="text-[1.0625rem] leading-relaxed">{t.firstMessage}</li>
        {situation.turns.map((m, i) =>
          m.role === "user" ? (
            <li key={i} className="ml-6 flex gap-3">
              <span
                className="mt-[0.45rem] size-2.5 shrink-0 rounded-full bg-[var(--hl-accent)] shadow-[0_0_0_2px_var(--hl-brand-dk)]"
                aria-hidden
              />
              <p className="whitespace-pre-wrap text-[1.0625rem] leading-relaxed text-[var(--hl-muted)]">{m.content}</p>
            </li>
          ) : (
            <li key={i} className="flex flex-col gap-3">
              <p className="whitespace-pre-wrap text-[1.0625rem] leading-relaxed">{m.content}</p>
              <ContactButtons ids={m.contacts} t={t} />
              {planMarks.has(i) && (
                <button
                  onClick={onViewPlan}
                  className="f-label flex min-h-11 items-center gap-2 self-start text-[var(--hl-brand)]"
                >
                  <span className="size-2.5 rounded-full bg-[var(--hl-accent)]" aria-hidden />
                  {t.planUpdated} →
                </button>
              )}
            </li>
          )
        )}
        {loading && (
          <li className="f-label animate-pulse text-[var(--hl-muted)]" role="status" aria-label="…">
            {t.thinking}
          </li>
        )}
      </ol>

      {error && (
        <p className="mb-2 text-sm font-bold text-[var(--hl-danger)]">
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
        className="sticky bottom-[var(--hl-tabbar)] -mx-5 flex items-end gap-2 bg-[var(--hl-bg)] px-5 pb-3 pt-3"
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
          className="max-h-40 min-h-12 flex-1 resize-none rounded-[var(--hl-radius)] border-2 border-[var(--hl-ink)] bg-[var(--hl-surface)] px-3 py-2.5 text-base leading-snug outline-none [field-sizing:content] focus:border-[var(--hl-brand)]"
        />
        <button
          type="submit"
          disabled={!draft.trim() || loading}
          className="f-btn min-h-12 shrink-0 rounded-[var(--hl-radius)] bg-[var(--hl-brand)] px-5 text-[var(--hl-brand-ink)] disabled:opacity-40"
        >
          {t.send}
        </button>
      </form>
    </div>
  );
}
