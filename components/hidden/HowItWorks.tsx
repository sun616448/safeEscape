"use client";

// Plain-language explanation, shown the first time she opens the hidden layer and any time
// from "How this works". Behind the code, so it can be direct.
// TODO(hidden layer): Spanish version; mention Esc / shake once quick exit lands.

export default function HowItWorks({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex flex-col gap-5 text-pf-ink">
      <div>
        <h2 className="text-xl font-semibold">This is your private space</h2>
        <p className="mt-2 text-sm leading-relaxed text-pf-ink/80">
          Path Finder looks like a maze game. This part is hidden. Here you can describe what&apos;s going
          on and get a safety plan with Bay Area resources, at your own pace. What you save here is
          encrypted on this phone. Nothing is stored anywhere else.
        </p>
      </div>

      <ul className="flex flex-col gap-3 text-sm leading-relaxed">
        <li className="rounded-xl bg-pf-cream p-3">
          <b>My code</b> brings you back here. Type it in the game under Rewards → Redeem a code.
        </li>
        <li className="rounded-xl bg-pf-cream p-3">
          <b>Clear code</b> erases everything saved here. Anyone watching only sees &ldquo;Code redeemed!
          +200 coins&rdquo;. Afterward, you can set up new codes with the invite code.
        </li>
        <li className="rounded-xl bg-pf-cream p-3">
          <b>Leave fast:</b> tap <b>Exit</b> in the corner. You&apos;ll be back in the maze, and this space
          locks.
        </li>
      </ul>

      <p className="rounded-xl border border-pf-teal/30 p-3 text-sm leading-relaxed">
        If you&apos;re in danger right now, call <b>911</b>. National Domestic Violence Hotline, 24/7:{" "}
        <b>1-800-799-7233</b>, or text <b>START</b> to <b>88788</b>.
      </p>

      <button
        onClick={onClose}
        className="rounded-xl bg-pf-teal px-4 py-3 text-sm font-medium text-pf-cream active:bg-pf-teal-dark"
      >
        Got it
      </button>
    </div>
  );
}
