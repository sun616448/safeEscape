"use client";

import { PROMO_COINS } from "@/lib/gameProgress";
import type { Strings } from "@/lib/i18n";

type Codes = { myCode: string; clearCode: string };

// Plain-language explanation, shown the first time she opens the hidden layer and any time
// from "How this works" on the SOS screen. Behind the code, so it can be direct.
// `codes` is passed only for the development code, so a demo can show what to type.
export default function HowItWorks({ t, codes, onClose }: { t: Strings; codes?: Codes; onClose: () => void }) {
  const chip = "f-btn inline-flex min-h-9 items-center rounded-[var(--hl-radius)] px-3 text-sm";
  const codeChip = (value?: string) =>
    value ? (
      <span className={`${chip} border-2 border-[var(--hl-ink)] bg-[var(--hl-surface)] tracking-[0.12em]`}>{value}</span>
    ) : null;

  const rows: { term: string; text: string; shows: React.ReactNode }[] = [
    {
      term: t.aboutMyCode,
      text: t.aboutMyCodeText,
      shows: codeChip(codes?.myCode),
    },
    {
      term: t.aboutClearCode,
      text: t.aboutClearCodeText,
      shows: (
        <>
          {codeChip(codes?.clearCode)}
          <span className="text-sm text-[var(--hl-muted)]">→</span>
          <span className="f-btn text-sm text-[var(--hl-brand)]">Code redeemed! +{PROMO_COINS} coins</span>
        </>
      ),
    },
    {
      term: t.aboutLeave,
      text: t.aboutLeaveText,
      shows: (
        <>
          <span className={`${chip} bg-[var(--hl-ink)] px-4 text-[var(--hl-bg)]`}>{t.exit}</span>
          <span className={`${chip} border-2 border-[var(--hl-line)]`}>Esc</span>
        </>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="flex flex-col gap-3">
        <h1 className="f-title max-w-[16ch] text-[1.875rem] leading-[1.1] text-balance">{t.aboutTitle}</h1>
        <p className="max-w-[60ch] text-base leading-relaxed">{t.aboutIntro}</p>
      </div>

      <dl className="border-t-2 border-[var(--hl-ink)]">
        {rows.map(({ term, text, shows }) => (
          <div key={term} className="flex flex-col gap-2 border-b border-[var(--hl-line)] py-4">
            <dt className="f-title text-lg">{term}</dt>
            <dd className="text-base leading-relaxed">{text}</dd>
            {shows && (
              <dd className="flex flex-wrap items-center gap-2" aria-hidden>
                {shows}
              </dd>
            )}
          </div>
        ))}
      </dl>

      <p className="text-base leading-relaxed">{t.aboutDanger}</p>

      <button
        onClick={onClose}
        className="f-btn min-h-12 rounded-[var(--hl-radius)] bg-[var(--hl-brand)] px-6 text-[var(--hl-brand-ink)] active:bg-[var(--hl-brand-dk)]"
      >
        {t.gotIt}
      </button>
    </div>
  );
}
