// Shared classes for the game screens, from the same map world as the hidden layer (DESIGN.md):
// 4px radius, no shadows, route-blue primary, 2px outlines, condensed labels.

const base = "f-btn inline-flex min-h-12 items-center justify-center rounded-[var(--hl-radius)] px-5";

export const btnPrimary = `${base} bg-[var(--hl-brand)] text-[var(--hl-brand-ink)] active:bg-[var(--hl-brand-dk)] disabled:opacity-50`;

export const btnSecondary = `${base} border-2 border-[var(--hl-brand)] text-[var(--hl-brand)] active:border-[var(--hl-brand-dk)] active:text-[var(--hl-brand-dk)]`;

export const btnQuiet = "f-btn min-h-11 px-1 text-[var(--hl-muted)] underline decoration-2 underline-offset-4";

export const field =
  "min-h-12 min-w-0 rounded-[var(--hl-radius)] border-2 border-[var(--hl-ink)] bg-[var(--hl-surface)] px-3 text-base text-[var(--hl-ink)] outline-none focus:border-[var(--hl-brand)]";

export const label = "f-label text-[var(--hl-muted)]";

export const title = "f-title text-[1.625rem] leading-[1.1]";
