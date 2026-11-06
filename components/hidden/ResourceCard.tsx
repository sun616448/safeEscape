import type { Locale, Resource } from "@/lib/types";
import type { Strings } from "@/lib/i18n";

export function digits(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

/**
 * "Text START to 88788" → sms:88788 with body START
 * "Text (415) 200-3575 (Mon–Fri…)" / "Text 988" → sms:4152003575 / sms:988
 */
export function smsLink(text: string) {
  const kw = text.match(/text\s+([A-Za-z]+)\s+to\s+([\d\s()+-]+)/i);
  if (kw) return `sms:${digits(kw[2])}?&body=${encodeURIComponent(kw[1])}`;
  const num = text.match(/text\s+([\d\s()+-]{3,})/i);
  return num ? `sms:${digits(num[1])}` : null;
}

export default function ResourceCard({
  r,
  why,
  t,
  locale = "en",
}: {
  r: Resource;
  why?: string;
  t: Strings;
  locale?: Locale;
}) {
  const blurb = locale === "es" ? r.blurbEs : r.blurb;
  const sms = r.text ? smsLink(r.text) : null;
  const b = "f-btn inline-flex min-h-11 items-center rounded-[var(--hl-radius)] px-4";
  // A row in a list, separated by hairlines: no card, no shadow (see DESIGN.md).
  return (
    <li className="border-b border-[var(--hl-line)] py-4 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="f-title text-lg leading-tight">{r.name}</h3>
        {r.is24h && <span className="f-label shrink-0 text-[var(--hl-zone)]">24/7</span>}
      </div>
      <p className="mt-1 text-[15px] leading-relaxed text-[var(--hl-muted)]">{why || blurb}</p>
      {r.flag && <p className="mt-1 text-xs font-bold text-[var(--hl-muted)]">{t.confirmByPhone}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {r.phone && (
          <a href={`tel:${digits(r.phone)}`} className={`${b} bg-[var(--hl-brand)] text-[var(--hl-brand-ink)]`}>
            {t.call}
          </a>
        )}
        {sms && (
          <a href={sms} className={`${b} border-2 border-[var(--hl-brand)] text-[var(--hl-brand)]`}>
            {r.text?.replace(/\s*\(.*\)\s*$/, "")}
          </a>
        )}
        {r.url && (
          <a
            href={r.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex min-h-11 items-center px-2 text-sm text-[var(--hl-muted)] underline underline-offset-4"
          >
            {t.website}
          </a>
        )}
      </div>
    </li>
  );
}
