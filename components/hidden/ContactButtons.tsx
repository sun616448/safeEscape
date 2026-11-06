import { getResource } from "@/lib/resources";
import type { Strings } from "@/lib/i18n";
import { digits, smsLink } from "./ResourceCard";

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
  </svg>
);

/** "SAVE – Safe Alternatives…" → "SAVE"; "Riley Center (St. Vincent…)" → "Riley Center" */
const shortName = (name: string) => name.split(/\s[–(]/)[0].trim();

/**
 * One-tap actions for a step or chat message: Call / Text for each vetted contact ("911" or a resource id).
 * Numbers always come from data/resources.bay-area.json, never from Claude's text.
 */
export default function ContactButtons({ ids, t, onDark = false }: { ids?: string[]; t: Strings; onDark?: boolean }) {
  if (!ids?.length) return null;
  const primary = onDark
    ? "bg-[var(--hl-brand-ink)] text-[var(--hl-brand)]"
    : "bg-[var(--hl-brand)] text-[var(--hl-brand-ink)]";
  const secondary = onDark ? "border-2 border-current" : "border-2 border-[var(--hl-brand)] text-[var(--hl-brand)]";
  const pill = "f-btn inline-flex min-h-11 max-w-full items-center gap-2 rounded-[var(--hl-radius)] px-4";

  return (
    <div className="flex flex-wrap gap-2">
      {ids.map((id) => {
        if (id === "911")
          return (
            <span key={id} className="contents">
              <a href="tel:911" className={`${pill} bg-[var(--hl-danger)] text-[var(--hl-danger-ink)]`}>
                <PhoneIcon />
                {t.call911}
              </a>
              <a href="sms:911" className={`${pill} border-2 border-[var(--hl-danger)] text-[var(--hl-danger)]`}>
                {t.text911}
              </a>
            </span>
          );
        const r = getResource(id);
        if (!r) return null;
        const sms = r.text ? smsLink(r.text) : null;
        return (
          <span key={id} className="contents">
            {r.phone && (
              <a href={`tel:${digits(r.phone)}`} className={`${pill} ${primary}`}>
                <PhoneIcon />
                <span className="truncate">
                  {t.call} {shortName(r.name)}
                </span>
              </a>
            )}
            {sms && (
              <a href={sms} className={`${pill} ${secondary}`}>
                <span className="truncate">{r.text?.replace(/\s*\(.*\)\s*$/, "")}</span>
              </a>
            )}
            {!r.phone && !sms && r.url && (
              <a href={r.url} target="_blank" rel="noreferrer noopener" className={`${pill} ${secondary}`}>
                {shortName(r.name)} ↗
              </a>
            )}
          </span>
        );
      })}
    </div>
  );
}
