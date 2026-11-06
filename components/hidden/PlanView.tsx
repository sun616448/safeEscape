"use client";

import { useState } from "react";
import { getResource } from "@/lib/resources";
import type { County, Locale, Plan, StepWhen } from "@/lib/types";
import { GOAL_LABELS, type Strings } from "@/lib/i18n";
import ContactButtons from "./ContactButtons";
import ResourceCard from "./ResourceCard";

type Props = {
  plan: Plan;
  checked: Record<string, boolean>;
  county?: County;
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

const countyName = (c: County, locale: Locale) => {
  const name = c
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
  return locale === "es" ? `Condado de ${name}` : `${name} County`;
};

const Check = ({ className = "size-3" }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m3.5 8.5 3 3 6-7" />
  </svg>
);

/**
 * Her plan drawn as a route (see DESIGN.md): one line, done stops filled and kept,
 * the next stop marked with the gold "you are here" dot and set large, later stops hollow.
 * "Edit" turns every line into a text field she can rename, remove, or add to.
 */
export default function PlanView({ plan, checked, county, t, locale, onToggle, onEdit, onTalk, onHelp, onReset }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const [section, setSection] = useState<"help" | "bag" | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState<Group | null>(null);

  const items: Item[] = [
    {
      key: `${RIGHT_NOW}${plan.rightNow.title}`,
      title: plan.rightNow.title,
      detail: plan.rightNow.detail,
      when: "now",
      contacts: plan.rightNow.contacts,
    },
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

  // ---- shared pieces ----
  const btn = "f-btn inline-flex min-h-11 items-center rounded-[var(--hl-radius)] px-4";
  const zoneLabel = (label: string) => <p className="f-label pb-2 pl-12 pt-1 text-[var(--hl-zone)]">{label}</p>;

  // A stop on the route. The dot is the checkbox; the 44px hit area is centred on the line.
  const stopDot = (item: Item, kind: "done" | "ahead") => (
    <button
      onClick={() => onToggle(item.key)}
      role="checkbox"
      aria-checked={kind === "done"}
      aria-label={item.title}
      className="relative z-10 flex size-10 shrink-0 items-center justify-center"
    >
      <span
        className={`flex size-[18px] items-center justify-center rounded-full border-[3px] border-[var(--hl-brand-dk)] ${
          kind === "done" ? "bg-[var(--hl-brand-dk)] text-[var(--hl-bg)]" : "bg-[var(--hl-bg)]"
        }`}
      >
        {kind === "done" && <Check className="size-2.5" />}
      </span>
    </button>
  );

  const stop = (item: Item) => {
    // ---- you are here ----
    if (item.key === next?.key) {
      return (
        <li key={item.key} className="flex gap-2 pb-6">
          <span className="relative z-10 flex w-10 shrink-0 justify-center pt-0.5">
            <span
              className="here-dot size-[30px] rounded-full bg-[var(--hl-accent)] shadow-[0_0_0_4px_var(--hl-bg),0_0_0_6px_var(--hl-brand-dk)]"
              aria-hidden
            />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="f-title text-[1.625rem] leading-[1.1] text-balance">{item.title}</h2>
            {item.detail && <p className="mt-2 text-base leading-relaxed text-[var(--hl-muted)]">{item.detail}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <ContactButtons ids={item.contacts} t={t} />
              <button
                onClick={() => onToggle(item.key)}
                className={`${btn} ml-auto -mr-2 underline decoration-2 underline-offset-[6px]`}
              >
                {t.done}
              </button>
            </div>
          </div>
        </li>
      );
    }
    const done = !!checked[item.key];
    const more = !done && (!!item.detail || !!item.contacts?.length);
    const isOpen = open === item.key;
    return (
      <li key={item.key} className="pb-1">
        <div className="flex items-start gap-2">
          {stopDot(item, done ? "done" : "ahead")}
          <button
            onClick={() => more && setOpen(isOpen ? null : item.key)}
            aria-expanded={more ? isOpen : undefined}
            className="flex min-h-10 flex-1 items-center justify-between gap-2 py-2 text-left"
          >
            <span
              className={`text-[1.0625rem] leading-snug ${
                done ? "text-[var(--hl-muted)] line-through decoration-[var(--hl-muted)]/50" : ""
              }`}
            >
              {item.title}
            </span>
            {more && (
              <span className={`text-[var(--hl-muted)] transition-transform ${isOpen ? "rotate-90" : ""}`} aria-hidden>
                ›
              </span>
            )}
          </button>
        </div>
        {isOpen && more && (
          <div className="flex flex-col gap-3 pb-4 pl-12 pr-1">
            {item.detail && <p className="text-[15px] leading-relaxed text-[var(--hl-muted)]">{item.detail}</p>}
            <ContactButtons ids={item.contacts} t={t} />
          </div>
        )}
      </li>
    );
  };

  // ---- edit mode pieces ----
  const field =
    "min-h-12 w-full flex-1 rounded-[var(--hl-radius)] border border-transparent bg-transparent px-2 text-[1.0625rem] outline-none focus:border-[var(--hl-line)] focus:bg-[var(--hl-surface)]";

  const editRow = (key: string, title: string, onRename: (v: string) => void, onRemove?: () => void) => (
    <li key={key} className="flex items-center gap-1 border-b border-[var(--hl-line)] py-1">
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
          className={`${field} border-[var(--hl-line)] bg-[var(--hl-surface)]`}
        />
      </li>
    ) : (
      <li>
        <button
          onClick={() => setAdding(group)}
          className="f-btn flex min-h-12 w-full items-center gap-2 px-2 text-left text-[var(--hl-brand)]"
        >
          <span aria-hidden className="text-xl leading-none">
            +
          </span>
          {group === "bag" ? t.addItem : t.addStep}
        </button>
      </li>
    );

  const sectionToggle = (name: "help" | "bag", label: string, count: number) => (
    <button
      onClick={() => setSection(section === name ? null : name)}
      aria-expanded={section === name}
      className="flex min-h-14 w-full items-center justify-between text-left"
    >
      <span className="f-title text-lg">
        {label} <span className="font-medium text-[var(--hl-muted)]">{count}</span>
      </span>
      <span className={`text-lg text-[var(--hl-muted)] transition-transform ${section === name ? "rotate-90" : ""}`} aria-hidden>
        ›
      </span>
    </button>
  );

  return (
    <div className="flex flex-col">
      {plan.dangerLevel === "immediate" && !editing && (
        <button
          onClick={onHelp}
          className="f-title mb-5 flex min-h-14 items-center justify-between rounded-[var(--hl-radius)] bg-[var(--hl-danger)] px-5 text-left text-xl text-[var(--hl-danger-ink)]"
        >
          {t.helpNow} <span aria-hidden>→</span>
        </button>
      )}

      <div className="flex items-start justify-between gap-3">
        <h1 className="f-title text-[1.875rem] leading-[1.05] text-balance">{plan.title}</h1>
        <button
          onClick={() => {
            setEditing((v) => !v);
            setAdding(null);
          }}
          aria-pressed={editing}
          className={`${btn} -mr-1 shrink-0 border-2 ${
            editing
              ? "border-[var(--hl-ink)] bg-[var(--hl-ink)] text-[var(--hl-bg)]"
              : "border-[var(--hl-ink)]"
          }`}
        >
          {editing ? t.doneEditing : t.edit}
        </button>
      </div>
      <p className="f-label mt-2 flex flex-wrap gap-x-2 text-[var(--hl-muted)]">
        <span className="text-[var(--hl-brand)]">{GOAL_LABELS[locale][plan.goal]}</span>
        {county && <span>· {countyName(county, locale)}</span>}
        <span className="tabular-nums">
          · {doneCount}/{items.length}
        </span>
      </p>
      <button onClick={onTalk} className="mt-1 self-start py-1 text-left text-sm text-[var(--hl-muted)] underline underline-offset-4">
        {editing ? t.editHint : t.correctMe}
      </button>

      {editing ? (
        // ---- Edit mode: every line is a text field ----
        <div className="mt-6 flex flex-col gap-6">
          {groups.map(({ when, label }) => {
            const rows = items.filter((i) => i.when === when);
            const canRemove = (i: Item) => !i.key.startsWith(RIGHT_NOW) || plan.steps.length > 0;
            return (
              <section key={when}>
                <p className="f-label mb-1 text-[var(--hl-zone)]">{label}</p>
                <ul className="border-t border-[var(--hl-line)]">
                  {rows.map((i) => editRow(i.key, i.title, (v) => rename(i, v), canRemove(i) ? () => remove(i) : undefined))}
                  {addRow(when)}
                </ul>
              </section>
            );
          })}
          <section>
            <p className="f-label mb-1 text-[var(--hl-zone)]">{t.goBag}</p>
            <ul className="border-t border-[var(--hl-line)]">
              {plan.goBag.map((item) => editRow(`bag:${item}`, item, (v) => renameBag(item, v), () => removeBag(item)))}
              {addRow("bag")}
            </ul>
          </section>
        </div>
      ) : (
        <>
          {/* ---- The route ---- */}
          <ol className="route -ml-0.5 mt-7">
            {groups.map(({ when, label }) => {
              const rows = items.filter((i) => i.when === when);
              if (!rows.length) return null;
              return (
                <li key={when}>
                  {zoneLabel(label)}
                  <ol>{rows.map(stop)}</ol>
                </li>
              );
            })}
            {!next && (
              <li className="flex items-center gap-2 pb-2 pt-2">
                <span className="relative z-10 flex w-10 shrink-0 justify-center">
                  <span className="size-[30px] rounded-full bg-[var(--hl-accent)] shadow-[0_0_0_4px_var(--hl-bg),0_0_0_6px_var(--hl-brand-dk)]" />
                </span>
                <p className="f-title text-xl leading-snug">{t.allDone}</p>
              </li>
            )}
          </ol>

          {/* ---- Off the route: who can help, go-bag ---- */}
          <div className="mt-8 border-t-2 border-[var(--hl-ink)]">
            {plan.resources.length > 0 && (
              <div className="border-b border-[var(--hl-line)]">
                {sectionToggle("help", t.whoCanHelp, plan.resources.length)}
                {section === "help" && (
                  <ul className="pb-4">
                    {plan.resources.map(({ id, why }) => {
                      const r = getResource(id);
                      return r ? <ResourceCard key={id} r={r} why={why} t={t} locale={locale} /> : null;
                    })}
                  </ul>
                )}
              </div>
            )}
            {plan.goBag.length > 0 && (
              <div className="border-b border-[var(--hl-line)]">
                {sectionToggle("bag", t.goBag, plan.goBag.length)}
                {section === "bag" && (
                  <ul className="grid grid-cols-1 pb-4">
                    {plan.goBag.map((item) => {
                      const key = `bag:${item}`;
                      const done = !!checked[key];
                      return (
                        <li key={key}>
                          <button
                            onClick={() => onToggle(key)}
                            role="checkbox"
                            aria-checked={done}
                            className="flex min-h-11 w-full items-center gap-3 text-left"
                          >
                            <span
                              className={`flex size-5 shrink-0 items-center justify-center rounded-[3px] border-2 border-[var(--hl-brand-dk)] ${
                                done ? "bg-[var(--hl-brand-dk)] text-[var(--hl-bg)]" : ""
                              }`}
                            >
                              {done && <Check />}
                            </span>
                            <span className={done ? "text-[var(--hl-muted)] line-through" : ""}>{item}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 flex items-start justify-between gap-4">
            <p className="max-w-[28ch] text-xs leading-relaxed text-[var(--hl-muted)]">{t.notAdvice}</p>
            <button
              onClick={() => {
                if (!confirmReset) return setConfirmReset(true);
                setConfirmReset(false);
                onReset();
              }}
              onBlur={() => setConfirmReset(false)}
              className={`-mt-3 min-h-11 shrink-0 text-sm underline underline-offset-4 ${
                confirmReset ? "font-bold text-[var(--hl-danger)]" : "text-[var(--hl-muted)]"
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
