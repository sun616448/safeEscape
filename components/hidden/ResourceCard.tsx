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
  return (
    <li className="rounded-2xl bg-[var(--hl-surface)] p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold leading-snug">{r.name}</h3>
        {r.hours === "24/7" && <span className="shrink-0 text-xs font-medium text-[var(--hl-brand)]">24/7</span>}
      </div>
      <p className="mt-1 text-[15px] leading-snug text-[var(--hl-muted)]">{why || blurb}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {r.phone && (
          <a
            href={`tel:${digits(r.phone)}`}
            className="inline-flex min-h-11 items-center rounded-full bg-[var(--hl-brand)] px-4 text-sm font-semibold text-[var(--hl-brand-ink)]"
          >
            {t.call}
          </a>
        )}
        {sms && (
          <a
            href={sms}
            className="inline-flex min-h-11 items-center rounded-full border border-[var(--hl-brand)] px-4 text-sm font-semibold text-[var(--hl-brand)]"
          >
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
