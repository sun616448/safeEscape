"use client";

import type { Strings } from "@/lib/i18n";

// Plain-language explanation, shown the first time she opens the hidden layer and any time
// from "How this works" on the SOS screen. Behind the code, so it can be direct.
export default function HowItWorks({ t, onClose }: { t: Strings; onClose: () => void }) {
  const rows = [
    [t.aboutMyCode, t.aboutMyCodeText],
    [t.aboutClearCode, t.aboutClearCodeText],
    [t.aboutLeave, t.aboutLeaveText],
  ];

  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="flex flex-col gap-3">
        <h1 className="f-title max-w-[16ch] text-[1.875rem] leading-[1.1] text-balance">{t.aboutTitle}</h1>
        <p className="max-w-[60ch] text-base leading-relaxed">{t.aboutIntro}</p>
      </div>

      <dl className="border-t-2 border-[var(--hl-ink)]">
        {rows.map(([term, text]) => (
          <div key={term} className="border-b border-[var(--hl-line)] py-4">
            <dt className="f-title text-lg">{term}</dt>
            <dd className="mt-1 text-base leading-relaxed">{text}</dd>
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
