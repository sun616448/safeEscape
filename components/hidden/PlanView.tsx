"use client";

import { useState } from "react";
import { getResource } from "@/lib/resources";
import type { Locale, Plan, StepWhen } from "@/lib/types";
import { GOAL_LABELS, type Strings } from "@/lib/i18n";
import ContactButtons from "./ContactButtons";
import ResourceCard from "./ResourceCard";

type Props = {
  plan: Plan;
  checked: Record<string, boolean>;
  t: Strings;
  locale: Locale;
  onToggle: (key: string) => void;
  /** Her own edit. `rename` moves a checkmark from the old key to the new one. */
  onEdit: (plan: Plan, rename?: { from: string; to: string }) => void;
  onTalk: () => void;
  onHelp: () => void;
  onReset: () => void;
};

type Item = { key: string; title: string; detail?: string; when: StepWhen; contacts?: string[] };
type Group = StepWhen | "bag";

const RIGHT_NOW = "right-now:";

// The next unchecked step leads; everything else is a short checklist with details on tap.
// "Edit" turns every line into a text field she can rename, remove, or add to.
export default function PlanView({ plan, checked, t, locale, onToggle, onEdit, onTalk, onHelp, onReset }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const [section, setSection] = useState<"help" | "bag" | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState<Group | null>(null);

  const items: Item[] = [
    { key: `${RIGHT_NOW}${plan.rightNow.title}`, title: plan.rightNow.title, detail: plan.rightNow.detail, when: "now", contacts: plan.rightNow.contacts },
    ...plan.steps.map((x) => ({ key: `step:${x.title}`, title: x.title, detail: x.detail, when: x.when, contacts: x.contacts })),
  ];
  const next = items.find((i) => !checked[i.key]);
  const doneCount = items.filter((i) => checked[i.key]).length;

  const groups: { when: StepWhen; label: string }[] = [
    { when: "now", label: t.planNow },
    { when: "today", label: t.planToday },
    { when: "this-week", label: t.planWeek },
  ];

  // ---- her edits ----
  function rename(item: Item, title: string) {
    if (!title || title === item.title) return;
    if (item.key.startsWith(RIGHT_NOW)) {
      onEdit({ ...plan, rightNow: { ...plan.rightNow, title } }, { from: item.key, to: `${RIGHT_NOW}${title}` });
    } else {
      onEdit(
        { ...plan, steps: plan.steps.map((s) => (s.title === item.title ? { ...s, title } : s)) },
        { from: item.key, to: `step:${title}` }
      );
    }
  }
  function remove(item: Item) {
    if (item.key.startsWith(RIGHT_NOW)) {
      // The plan always needs a first step: promote the next one.
      const promote = plan.steps.find((s) => s.when === "now") ?? plan.steps[0];
      if (!promote) return;
      onEdit({
        ...plan,
        rightNow: { title: promote.title, detail: promote.detail, contacts: promote.contacts },
        steps: plan.steps.filter((s) => s !== promote),
      });
    } else {
      onEdit({ ...plan, steps: plan.steps.filter((s) => s.title !== item.title) });
    }
  }
  function add(group: Group, title: string) {
    setAdding(null);
    if (!title) return;
    if (group === "bag") {
      if (!plan.goBag.includes(title)) onEdit({ ...plan, goBag: [...plan.goBag, title] });
    } else if (!items.some((i) => i.title === title)) {
      onEdit({ ...plan, steps: [...plan.steps, { title, detail: "", when: group }] });
    }
  }
  const renameBag = (from: string, to: string) =>
    to &&
    to !== from &&
    onEdit({ ...plan, goBag: plan.goBag.map((x) => (x === from ? to : x)) }, { from: `bag:${from}`, to: `bag:${to}` });
  const removeBag = (item: string) => onEdit({ ...plan, goBag: plan.goBag.filter((x) => x !== item) });

  // ---- pieces ----
  const field =
    "min-h-12 w-full flex-1 rounded-xl bg-transparent px-2 text-[15px] font-medium outline-none focus:bg-[var(--hl-bg)]";

  const editRow = (key: string, title: string, onRename: (v: string) => void, onRemove?: () => void) => (
    <li key={key} className="flex items-center gap-1 py-1">
      <input
        defaultValue={title}
        aria-label={title}
        enterKeyHint="done"
        autoComplete="off"
        spellCheck={false}
        onBlur={(e) => onRename(e.target.value.trim())}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        className={field}
      />
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`${t.remove}: ${title}`}
          className="flex size-11 shrink-0 items-center justify-center text-[var(--hl-muted)]"
        >
          <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="m4 4 8 8M12 4l-8 8" />
          </svg>
        </button>
      )}
    </li>
  );

  const addRow = (group: Group) =>
    adding === group ? (
      <li className="py-1">
        <input
          autoFocus
          placeholder={group === "bag" ? t.addItem : t.addStep}
          enterKeyHint="done"
          autoComplete="off"
          spellCheck={false}
          onBlur={(e) => add(group, e.target.value.trim())}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className={field}
        />
      </li>
    ) : (
      <li>
        <button
          onClick={() => setAdding(group)}
          className="flex min-h-12 w-full items-center gap-2 px-2 text-left text-[15px] font-semibold text-[var(--hl-brand)]"
        >
          <span aria-hidden className="text-lg leading-none">
            +
          </span>
          {group === "bag" ? t.addItem : t.addStep}
        </button>
      </li>
    );

  const row = (key: string, title: string, detail?: string, contacts?: string[]) => {
    const more = !!detail || !!contacts?.length;
    const isOpen = open === key;
    const done = !!checked[key];
    return (
      <li key={key}>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggle(key)}
            role="checkbox"
            aria-checked={done}
            aria-label={title}
            className="flex size-11 shrink-0 items-center justify-center"
          >
            <span
              className={`flex size-6 items-center justify-center rounded-full border-2 border-[var(--hl-brand)] ${
                done ? "bg-[var(--hl-brand)] text-[var(--hl-brand-ink)]" : ""
              }`}
            >
              {done && (
                <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <path d="m3.5 8.5 3 3 6-7" />
                </svg>
              )}
            </span>
          </button>
          <button
            onClick={() => more && setOpen(isOpen ? null : key)}
            aria-expanded={more ? isOpen : undefined}
            className="flex min-h-12 flex-1 items-center justify-between gap-2 text-left"
          >
            <span className={`text-[15px] leading-snug ${done ? "text-[var(--hl-muted)] line-through" : "font-medium"}`}>{title}</span>
            {more && (
              <span className={`pr-1 text-[var(--hl-muted)] transition-transform ${isOpen ? "rotate-90" : ""}`} aria-hidden>
                ›
              </span>
            )}
          </button>
        </div>
        {isOpen && more && (
          <div className="flex flex-col gap-3 pb-3 pl-12 pr-2">
            {detail && <p className="text-[15px] leading-snug text-[var(--hl-muted)]">{detail}</p>}
            <ContactButtons ids={contacts} t={t} />
          </div>
        )}
      </li>
    );
  };

  const toggleSection = (name: "help" | "bag", label: string, count: number) => (
    <button
      onClick={() => setSection(section === name ? null : name)}
      aria-expanded={section === name}
      className="flex min-h-14 w-full items-center justify-between px-1 text-left font-semibold"
    >
      <span>
        {label} <span className="font-normal text-[var(--hl-muted)]">({count})</span>
      </span>
      <span className={`text-[var(--hl-muted)] transition-transform ${section === name ? "rotate-90" : ""}`} aria-hidden>
        ›
      </span>
    </button>
  );

  const groupHeading = (label: string) => <h2 className="mb-1 px-1 text-sm font-semibold text-[var(--hl-muted)]">{label}</h2>;
  const list = "flex flex-col divide-y divide-[var(--hl-line)] rounded-2xl bg-[var(--hl-surface)] px-2";

  return (
    <div className="flex flex-col">
      {plan.dangerLevel === "immediate" && !editing && (
        <button
          onClick={onHelp}
          className="mb-5 flex min-h-14 items-center justify-between rounded-2xl bg-[var(--hl-danger)] px-5 text-left text-lg font-bold text-[var(--hl-danger-ink)]"
        >
          {t.helpNow} <span aria-hidden>→</span>
        </button>
      )}

      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold leading-tight text-balance">{plan.title}</h1>
        <button
          onClick={() => {
            setEditing((v) => !v);
            setAdding(null);
          }}
          aria-pressed={editing}
          className={`-mr-1 min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${
            editing ? "bg-[var(--hl-brand)] text-[var(--hl-brand-ink)]" : "border border-[var(--hl-line)]"
          }`}
        >
          {editing ? t.doneEditing : t.edit}
        </button>
      </div>
      <p className="mt-1 text-sm text-[var(--hl-muted)]">
        <span className="font-semibold text-[var(--hl-brand)]">{GOAL_LABELS[locale][plan.goal]}</span>
        {" · "}
        <button onClick={onTalk} className="underline underline-offset-4">
          {editing ? t.editHint : t.correctMe}
        </button>
      </p>

      {editing ? (
        // ---- Edit mode: every line is a text field ----
        <div className="mt-5 flex flex-col gap-5">
          {groups.map(({ when, label }) => {
            const rows = items.filter((i) => i.when === when);
            const canRemove = (i: Item) => !i.key.startsWith(RIGHT_NOW) || plan.steps.length > 0;
            return (
              <section key={when}>
                {groupHeading(label)}
                <ul className={list}>
                  {rows.map((i) => editRow(i.key, i.title, (v) => rename(i, v), canRemove(i) ? () => remove(i) : undefined))}
                  {addRow(when)}
                </ul>
              </section>
            );
          })}
          <section>
            {groupHeading(t.goBag)}
            <ul className={list}>
              {plan.goBag.map((item) => editRow(`bag:${item}`, item, (v) => renameBag(item, v), () => removeBag(item)))}
              {addRow("bag")}
            </ul>
          </section>
        </div>
      ) : (
        <>
          {/* The one thing to do next */}
          <section className="mt-5 rounded-3xl bg-[var(--hl-brand)] p-5 text-[var(--hl-brand-ink)]">
            {next ? (
              <>
                <p className="text-xl font-semibold leading-snug text-balance">{next.title}</p>
                {next.detail && <p className="mt-2 text-[15px] leading-snug opacity-90">{next.detail}</p>}
                {!!next.contacts?.length && (
                  <div className="mt-4">
                    <ContactButtons ids={next.contacts} t={t} onDark />
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-sm tabular-nums opacity-80">
                    {doneCount}/{items.length}
                  </span>
                  <button
                    onClick={() => onToggle(next.key)}
                    className="min-h-11 rounded-full bg-[var(--hl-brand-ink)] px-5 text-sm font-semibold text-[var(--hl-brand)]"
                  >
                    ✓ {t.done}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-lg font-semibold leading-snug">{t.allDone}</p>
            )}
          </section>

          <div className="mt-6 flex flex-col gap-5">
            {groups.map(({ when, label }) => {
              const rows = items.filter((i) => i.when === when && i.key !== next?.key);
              if (!rows.length) return null;
              return (
                <section key={when}>
                  {groupHeading(label)}
                  <ul className={list}>{rows.map((i) => row(i.key, i.title, i.detail, i.contacts))}</ul>
                </section>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col divide-y divide-[var(--hl-line)] border-y border-[var(--hl-line)]">
            {plan.resources.length > 0 && (
              <div>
                {toggleSection("help", t.whoCanHelp, plan.resources.length)}
                {section === "help" && (
                  <ul className="flex flex-col gap-2 pb-4">
                    {plan.resources.map(({ id, why }) => {
                      const r = getResource(id);
                      return r ? <ResourceCard key={id} r={r} why={why} t={t} locale={locale} /> : null;
                    })}
                  </ul>
                )}
              </div>
            )}
            {plan.goBag.length > 0 && (
              <div>
                {toggleSection("bag", t.goBag, plan.goBag.length)}
                {section === "bag" && <ul className={`mb-4 ${list}`}>{plan.goBag.map((item) => row(`bag:${item}`, item))}</ul>}
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="px-1 text-xs text-[var(--hl-muted)]">{t.notAdvice}</p>
            <button
              onClick={() => {
                if (!confirmReset) return setConfirmReset(true);
                setConfirmReset(false);
                onReset();
              }}
              onBlur={() => setConfirmReset(false)}
              className={`min-h-11 shrink-0 px-1 text-sm underline underline-offset-4 ${
                confirmReset ? "font-semibold text-[var(--hl-danger)]" : "text-[var(--hl-muted)]"
              }`}
            >
              {confirmReset ? t.startOverConfirm : t.startOver}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
