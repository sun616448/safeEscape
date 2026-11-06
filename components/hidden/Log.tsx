"use client";

import { useEffect, useRef, useState } from "react";
import { compressImage, useRecorder } from "@/lib/media";
import { resourcesFor } from "@/lib/resources";
import type { County, Declaration, DeclarationResponse, Locale, LogEntry, LogMedia } from "@/lib/types";
import type { Strings } from "@/lib/i18n";
import { deleteMedia, loadMedia, saveMedia, type Session } from "@/lib/vault";
import ResourceCard from "./ResourceCard";

type Props = {
  log: LogEntry[];
  session: Session | null;
  county?: County;
  t: Strings;
  locale: Locale;
  onChange: (log: LogEntry[]) => void;
};

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

/** datetime-local value in local time */
function toLocalInput(iso: string) {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

/** Decrypts one photo/voice note on demand; revokes the object URL when unmounted. */
function MediaView({ m, session }: { m: LogMedia; session: Session | null }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null;
    let live = true;
    if (session)
      loadMedia(session, m.id).then((b) => {
        if (b && live) setUrl((u = URL.createObjectURL(b)));
      });
    return () => {
      live = false;
      if (u) URL.revokeObjectURL(u);
    };
  }, [m.id, session]);
  if (!url) return <div className="size-20 rounded-[var(--hl-radius)] bg-[var(--hl-line)]" />;
  return m.kind === "photo" ? (
    // eslint-disable-next-line @next/next/no-img-element -- local decrypted blob URL
    <img src={url} alt="" className="size-20 rounded-[var(--hl-radius)] object-cover" />
  ) : (
    <audio src={url} controls className="h-11 w-full max-w-64" />
  );
}

export default function Log({ log, session, county, t, locale, onChange }: Props) {
  const [composing, setComposing] = useState(false);
  const [text, setText] = useState("");
  const [when, setWhen] = useState(() => toLocalInput(new Date().toISOString()));
  const [pending, setPending] = useState<{ m: LogMedia; blob: Blob; url: string }[]>([]);
  const [tip, setTip] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [draft, setDraft] = useState<Declaration | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const recorder = useRecorder();

  const reset = () => {
    pending.forEach((p) => URL.revokeObjectURL(p.url));
    setPending([]);
    setText("");
    setWhen(toLocalInput(new Date().toISOString()));
    setTip(null);
    setComposing(false);
  };

  async function addPhoto(file: File | undefined, fromGallery: boolean) {
    if (!file) return;
    const blob = await compressImage(file);
    setPending((p) => [...p, { m: { id: newId(), kind: "photo" }, blob, url: URL.createObjectURL(blob) }]);
    if (fromGallery) setTip(t.photoTip);
  }

  async function toggleVoice() {
    if (recorder.recording) {
      const blob = await recorder.stop();
      if (blob) {
        setPending((p) => [...p, { m: { id: newId(), kind: "audio" }, blob, url: URL.createObjectURL(blob) }]);
        setTip(t.voiceTip);
      }
    } else if (!(await recorder.start())) {
      setTip(t.micDenied);
    }
  }

  async function saveEntry() {
    if (!text.trim() && !pending.length) return;
    if (session) for (const p of pending) await saveMedia(session, p.m.id, p.blob);
    const entry: LogEntry = {
      id: newId(),
      happenedAt: new Date(when).toISOString(),
      createdAt: new Date().toISOString(),
      text: text.trim(),
      media: pending.map((p) => p.m),
    };
    onChange([...log, entry].sort((a, b) => b.happenedAt.localeCompare(a.happenedAt)));
    reset();
  }

  function remove(e: LogEntry) {
    if (confirmDel !== e.id) return setConfirmDel(e.id);
    e.media.forEach((m) => deleteMedia(m.id));
    onChange(log.filter((x) => x.id !== e.id));
    setConfirmDel(null);
  }

  async function makeDraft() {
    setDrafting(true);
    setError(null);
    try {
      const res = await fetch("/api/declaration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          county,
          locale,
          entries: log.map((e) => ({
            happenedAt: e.happenedAt,
            text: e.text,
            photos: e.media.filter((m) => m.kind === "photo").length,
            voiceNotes: e.media.filter((m) => m.kind === "audio").length,
          })),
        }),
      });
      const data = (await res.json()) as DeclarationResponse;
      if (data.type === "draft") setDraft(data.draft);
      else setError(data.message);
    } catch {
      setError(t.offline);
    } finally {
      setDrafting(false);
    }
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(locale === "es" ? "es-US" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });

  // ---- Court draft view ----
  if (draft) {
    const full = `${t.mostRecent}\n${draft.mostRecent}\n\n${t.earlier}\n${draft.earlier}`;
    const legal = resourcesFor(county).filter((r) => r.type === "legal");
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[15px] leading-snug">{t.draftIntro}</p>
        <section className="border-y-2 border-[var(--hl-ink)] py-5">
          <h3 className="f-label text-[var(--hl-zone)]">{t.mostRecent}</h3>
          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{draft.mostRecent}</p>
          {draft.earlier && (
            <>
              <h3 className="f-label mt-6 text-[var(--hl-zone)]">{t.earlier}</h3>
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">{draft.earlier}</p>
            </>
          )}
        </section>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(full);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* clipboard blocked */
            }
          }}
          className="f-btn inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--hl-radius)] px-4 min-h-12 bg-[var(--hl-brand)] text-[var(--hl-brand-ink)]"
        >
          {copied ? `✓ ${t.copied}` : t.copy}
        </button>
        {draft.toCheck.length > 0 && (
          <section className="rounded-[var(--hl-radius)] bg-[var(--hl-surface)] p-4">
            <h3 className="f-label text-[var(--hl-zone)]">{t.toCheck}</h3>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-[15px] leading-snug">
              {draft.toCheck.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </section>
        )}
        {legal.length > 0 && (
          <section>
            <h3 className="f-label text-[var(--hl-zone)]">{t.legalHelp}</h3>
            <ul className="flex flex-col gap-2">
              {legal.slice(0, 3).map((r) => (
                <ResourceCard key={r.id} r={r} t={t} locale={locale} />
              ))}
            </ul>
          </section>
        )}
        <button onClick={() => setDraft(null)} className="f-btn min-h-11 self-start underline underline-offset-4">
          ← {t.log}
        </button>
        <p className="px-1 text-xs text-[var(--hl-muted)]">{t.notAdvice}</p>
      </div>
    );
  }

  // ---- Log view ----
  const empty = log.length === 0;
  const ico = "size-5 shrink-0 text-[var(--hl-brand-dk)]";
  const points: [string, React.ReactNode][] = [
    [
      t.docPoint1,
      <svg key="1" className={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" />
      </svg>,
    ],
    [
      t.docPoint2,
      <svg key="2" className={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
        <circle cx="12" cy="13" r="3.5" />
      </svg>,
    ],
    [
      t.docPoint3,
      <svg key="3" className={ico} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 3h9l4 4v14H6z" />
        <path d="M14 3v5h5M9.5 13h6M9.5 17h4" />
      </svg>,
    ],
  ];

  return (
    <div className="flex flex-col gap-4">
      {!composing && (
        <header className="flex flex-col gap-2">
          <h1 className="f-title text-[1.875rem] leading-[1.05] text-balance">{t.docTitle}</h1>
          <p className="text-base leading-relaxed text-[var(--hl-muted)]">{t.docWhy}</p>
          {empty && (
            <ul className="mt-2 flex flex-col gap-3">
              {points.map(([label, icon]) => (
                <li key={label} className="flex items-center gap-3 text-base">
                  {icon}
                  {label}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 flex items-center gap-2 text-sm text-[var(--hl-muted)]">
            <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            {t.docPrivate}
          </p>
        </header>
      )}
      {composing ? (
        <section className="flex flex-col gap-3">
          <h1 className="f-title text-[1.875rem] leading-[1.05]">{t.add}</h1>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="f-label text-[var(--hl-zone)]">{t.when}</span>
            <input
              type="datetime-local"
              value={when}
              max={toLocalInput(new Date().toISOString())}
              onChange={(e) => setWhen(e.target.value)}
              className="min-h-11 rounded-[var(--hl-radius)] border-2 border-[var(--hl-ink)] bg-[var(--hl-surface)] px-3"
            />
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder={t.whatHappened}
            aria-label={t.whatHappened}
            spellCheck={false}
            autoComplete="off"
            className="w-full resize-none rounded-[var(--hl-radius)] border-2 border-[var(--hl-ink)] bg-[var(--hl-surface)] p-3 text-base leading-relaxed outline-none focus:border-[var(--hl-brand)]"
          />
          {pending.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {pending.map((p) =>
                p.m.kind === "photo" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                  <img key={p.m.id} src={p.url} alt="" className="size-20 rounded-[var(--hl-radius)] object-cover" />
                ) : (
                  <audio key={p.m.id} src={p.url} controls className="h-11 w-full max-w-64" />
                )
              )}
            </div>
          )}
          {tip && <p className="text-xs text-[var(--hl-muted)]">{tip}</p>}
          <div className="flex flex-wrap gap-2">
            {/* capture="environment" opens the camera; the photo isn't saved to the camera roll */}
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => addPhoto(e.target.files?.[0], false)} />
            <input ref={galleryRef} type="file" accept="image/*" hidden onChange={(e) => addPhoto(e.target.files?.[0], true)} />
            <button onClick={() => cameraRef.current?.click()} className="f-btn inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--hl-radius)] px-4 border-2 border-[var(--hl-brand)] text-[var(--hl-brand)]">
              <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
              {t.photo}
            </button>
            <button
              onClick={() => galleryRef.current?.click()}
              aria-label={t.photo}
              className="f-btn inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--hl-radius)] px-4 border-2 border-[var(--hl-brand)] px-3 text-[var(--hl-brand)]"
            >
              <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="4" y="5" width="16" height="14" rx="1.5" /><path d="m4 16 5-5 4 4 2-2 5 5" /><circle cx="15.5" cy="9.5" r="1.5" /></svg>
            </button>
            <button
              onClick={toggleVoice}
              className={`f-btn inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--hl-radius)] px-4 border-2 ${
                recorder.recording
                  ? "border-[var(--hl-danger)] bg-[var(--hl-danger)] text-[var(--hl-danger-ink)]"
                  : "border-[var(--hl-brand)] text-[var(--hl-brand)]"
              }`}
            >
              {recorder.recording ? (
                <>
                  <span className="size-3 rounded-[2px] bg-current" aria-hidden />
                  <span className="tabular-nums">
                    {t.stop} {recorder.seconds}s
                  </span>
                </>
              ) : (
                <>
                  <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></svg>
                  {t.voice}
                </>
              )}
            </button>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={reset} className="f-btn min-h-11 px-4 text-[var(--hl-muted)]">
              {t.cancel}
            </button>
            <button
              onClick={saveEntry}
              disabled={(!text.trim() && !pending.length) || recorder.recording}
              className="f-btn inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--hl-radius)] px-4 bg-[var(--hl-brand)] px-6 text-[var(--hl-brand-ink)] disabled:opacity-40"
            >
              {t.save}
            </button>
          </div>
        </section>
      ) : (
        <button
          onClick={() => setComposing(true)}
          className="f-btn inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--hl-radius)] px-4 min-h-14 bg-[var(--hl-brand)] text-lg text-[var(--hl-brand-ink)]"
        >
          + {t.add}
        </button>
      )}


      {/* Entries as dated stops on a line, newest first (same route grammar as the plan). */}
      {log.length > 0 && !composing && (
        <ol className="route -ml-0.5 mt-2">
          {log.map((e) => (
            <li key={e.id} className="flex gap-2 pb-5">
              <span className="relative z-10 flex w-10 shrink-0 justify-center pt-1">
                <span className="size-[14px] rounded-full border-[3px] border-[var(--hl-brand-dk)] bg-[var(--hl-bg)]" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="f-label text-[var(--hl-zone)]">{fmt(e.happenedAt)}</span>
                  <button
                    onClick={() => remove(e)}
                    onBlur={() => setConfirmDel(null)}
                    className={`-mr-2 min-h-11 px-2 text-xs ${
                      confirmDel === e.id ? "font-bold text-[var(--hl-danger)]" : "text-[var(--hl-muted)] underline underline-offset-4"
                    }`}
                  >
                    {confirmDel === e.id ? t.deleteConfirm : t.deleteEntry}
                  </button>
                </div>
                {e.text && <p className="whitespace-pre-wrap text-base leading-relaxed">{e.text}</p>}
                {e.media.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {e.media.map((m) => (
                      <MediaView key={m.id} m={m} session={session} />
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {log.length > 0 && !composing && (
        <div className="flex flex-col gap-2">
          <button
            onClick={makeDraft}
            disabled={drafting}
            className="f-btn inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--hl-radius)] px-4 min-h-12 border-2 border-[var(--hl-brand)] text-[var(--hl-brand)] disabled:opacity-50"
          >
            {drafting ? t.drafting : t.makeDraft}
          </button>
          {error && <p className="text-sm font-bold text-[var(--hl-danger)]">{error}</p>}
          <p className="text-xs leading-relaxed text-[var(--hl-muted)]">{t.draftSends}</p>
        </div>
      )}
    </div>
  );
}
