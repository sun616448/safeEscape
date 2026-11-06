"use client";

import { useState } from "react";
import { codeProblem, createCodes, normalizeCode } from "@/lib/crypto";
import { PROMO_COINS } from "@/lib/gameProgress";
import { btnPrimary, btnQuiet, btnSecondary, field, title } from "./styles";

// Opened by redeeming the invite code. Wording is plain enough that she knows what the codes
// do, and low-key enough to pass a glance. The full explanation lives inside the hidden layer.

type Step = "intro" | "my" | "clear" | "saving" | "practice" | "done";

interface Props {
  /** Codes are saved; send her to Rewards to redeem My code for real. */
  onFinish: () => void;
  /** Leave without saving anything (only before codes are saved). */
  onCancel: () => void;
}

export default function Setup({ onFinish, onCancel }: Props) {
  const [step, setStep] = useState<Step>("intro");
  const [myCode, setMyCode] = useState("");
  const [clearCode, setClearCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const save = async (clear: string) => {
    setStep("saving");
    const ok = await createCodes(myCode, clear).catch(() => false);
    if (!ok) {
      setError("This device couldn't save your codes. Private browsing can block saving.");
      setStep("clear");
      return;
    }
    setStep("practice");
  };

  return (
    <div className="flex w-full flex-col gap-5">
      {step === "intro" && (
        <>
          <Heading title="Set up your codes" />
          <p className="text-base leading-relaxed">
            You&apos;ll make two codes. Both go in <b>Rewards</b>, under <b>Redeem a code</b>.
          </p>
          <dl className="border-t-2 border-[var(--hl-ink)]">
            <div className="border-b border-[var(--hl-line)] py-3">
              <dt className="f-title text-lg">My code</dt>
              <dd className="mt-0.5 text-base leading-relaxed">opens your private space.</dd>
            </div>
            <div className="border-b border-[var(--hl-line)] py-3">
              <dt className="f-title text-lg">Clear code</dt>
              <dd className="mt-0.5 text-base leading-relaxed">
                erases your private space. The game just shows a normal reward, like any promo code.
              </dd>
            </div>
          </dl>
          <p className="text-sm leading-relaxed text-[var(--hl-muted)]">
            Pick codes you&apos;ll remember and others won&apos;t guess. Don&apos;t write them down where
            they could be found.
          </p>
          <Actions primary="Start" onPrimary={() => setStep("my")} secondary="Not now" onSecondary={onCancel} />
        </>
      )}

      {step === "my" && (
        <ChooseCode
          key="my"
          title="Choose My code"
          hint="Redeem it in Rewards to open your private space."
          onBack={() => setStep("intro")}
          onCancel={onCancel}
          check={(c) => codeProblem(c)}
          onDone={(c) => {
            setMyCode(c);
            setError(null);
            setStep("clear");
          }}
        />
      )}

      {step === "clear" && (
        <ChooseCode
          key="clear"
          title="Choose Clear code"
          hint="Redeem it to erase your private space. Anyone watching just sees a normal reward."
          externalError={error}
          onBack={() => setStep("my")}
          onCancel={onCancel}
          check={(c) => codeProblem(c, myCode)}
          onDone={(c) => {
            setClearCode(c);
            save(c);
          }}
        />
      )}

      {step === "saving" && (
        <>
          <Heading title="Saving your codes…" />
          <p className="text-base text-[var(--hl-muted)]">This takes a moment.</p>
        </>
      )}

      {step === "practice" && <Practice clearCode={clearCode} onDone={() => setStep("done")} />}

      {step === "done" && (
        <>
          <Heading title="You're all set" />
          <p className="text-base leading-relaxed">
            Now go to <b>Rewards</b> and redeem <b>My code</b> to open your private space. It explains
            everything inside.
          </p>
          <Actions primary="Go to Rewards" onPrimary={onFinish} />
        </>
      )}
    </div>
  );
}

function Heading({ title: text }: { title: string }) {
  return <h2 className={title}>{text}</h2>;
}

function Actions({
  primary,
  onPrimary,
  secondary,
  onSecondary,
  primaryType = "button",
}: {
  primary: string;
  onPrimary?: () => void;
  secondary?: string;
  onSecondary?: () => void;
  primaryType?: "button" | "submit";
}) {
  return (
    <div className="mt-1 flex gap-2">
      {secondary && (
        <button type="button" onClick={onSecondary} className={`${btnSecondary} flex-1`}>
          {secondary}
        </button>
      )}
      <button
        type={primaryType}
        onClick={onPrimary}
        className={`${btnPrimary} flex-1`}
      >
        {primary}
      </button>
    </div>
  );
}

function CodeField({
  id,
  label,
  value,
  onChange,
  show,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="f-label text-[var(--hl-muted)]">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck={false}
        className={`${field} ${show ? "" : "[-webkit-text-security:disc]"}`}
      />
    </div>
  );
}

function ChooseCode({
  title,
  hint,
  check,
  onDone,
  onBack,
  onCancel,
  externalError,
}: {
  title: string;
  hint: string;
  check: (code: string) => string | null;
  onDone: (code: string) => void;
  onBack: () => void;
  onCancel: () => void;
  externalError?: string | null;
}) {
  const [code, setCode] = useState("");
  const [again, setAgain] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const problem = check(code) ?? (normalizeCode(code) !== normalizeCode(again) ? "The two entries don't match." : null);
    if (problem) setError(problem);
    else onDone(code);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" autoComplete="off">
      <div className="flex items-baseline justify-between gap-2">
        <Heading title={title} />
        <button type="button" onClick={onCancel} className={btnQuiet}>
          Not now
        </button>
      </div>
      <p className="text-base leading-relaxed">{hint}</p>
      <CodeField
        id={`${title}-1`}
        label="Code"
        value={code}
        onChange={(v) => {
          setCode(v);
          setError(null);
        }}
        show={show}
      />
      <CodeField
        id={`${title}-2`}
        label="Type it again"
        value={again}
        onChange={(v) => {
          setAgain(v);
          setError(null);
        }}
        show={show}
      />
      <label className="flex min-h-11 items-center gap-3 text-base">
        <input type="checkbox" className="size-5" checked={show} onChange={(e) => setShow(e.target.checked)} />
        Show codes
      </label>
      <p role="alert" className="min-h-6 text-base font-bold">
        {error ?? externalError}
      </p>
      <Actions primary="Next" primaryType="submit" secondary="Back" onSecondary={onBack} />
    </form>
  );
}

/** A safe rehearsal: nothing is saved yet, so redeeming the clear code here erases nothing. */
function Practice({ clearCode, onDone }: { clearCode: string; onDone: () => void }) {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<"ok" | "wrong" | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(normalizeCode(code) === normalizeCode(clearCode) ? "ok" : "wrong");
    setCode("");
  };

  return (
    <div className="flex flex-col gap-4">
      <Heading title="Practice your Clear code" />
      <p className="text-base leading-relaxed">
        Type your Clear code below. This is only practice, so nothing gets erased.
      </p>
      <form onSubmit={submit} className="flex gap-2" autoComplete="off">
        <input
          aria-label="Redeem a code"
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setResult(null);
          }}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          className={`${field} flex-1 [-webkit-text-security:disc]`}
        />
        <button type="submit" className={btnPrimary}>
          Redeem
        </button>
      </form>
      {result === "ok" && (
        <div className="flex flex-col gap-2 rounded-[var(--hl-radius)] bg-[var(--hl-surface)] p-4">
          <p className="f-btn text-[var(--hl-brand)]">Code redeemed! +{PROMO_COINS} coins</p>
          <p className="text-base leading-relaxed">
            That&apos;s all anyone watching would see. For real, it would also erase your private space,
            and you could set up new codes later with the invite code.
          </p>
        </div>
      )}
      {result === "wrong" && <p className="text-base font-bold">That isn&apos;t your Clear code. Try again.</p>}
      <Actions primary={result === "ok" ? "Next" : "Skip"} onPrimary={onDone} />
    </div>
  );
}
