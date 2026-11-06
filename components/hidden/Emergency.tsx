"use client";

import { useState } from "react";
import { emergencyResources } from "@/lib/resources";
import type { County, Locale } from "@/lib/types";
import type { Strings } from "@/lib/i18n";
import ResourceCard from "./ResourceCard";

type Loc = { lat: number; lng: number; acc: number };

// Instant, no-AI emergency screen. Everything here is static and vetted.
// Location is read on the device only and goes straight into her text to 911, never to our server.
export default function Emergency({
  county,
  t,
  locale,
  onAbout,
}: {
  county?: County;
  t: Strings;
  locale: Locale;
  onAbout?: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "finding" | "denied">("idle");
  const [loc, setLoc] = useState<Loc | null>(null);

  const smsTo911 = (l: Loc) => {
    const lat = l.lat.toFixed(5);
    const lng = l.lng.toFixed(5);
    const body = `${t.locationMsg} ${lat}, ${lng} https://maps.google.com/?q=${lat},${lng}`;
    return `sms:911?&body=${encodeURIComponent(body)}`;
  };

  function sendLocation() {
    if (loc) return void (window.location.href = smsTo911(loc));
    if (!navigator.geolocation) return setStatus("denied");
    setStatus("finding");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const l = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy };
        setLoc(l);
        setStatus("idle");
        window.location.href = smsTo911(l);
      },
      () => setStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <a
          href="tel:911"
          className="f-title flex min-h-24 items-center justify-center rounded-[var(--hl-radius)] bg-[var(--hl-danger)] text-2xl text-[var(--hl-danger-ink)]"
        >
          {t.call911}
        </a>
        <a
          href="sms:911"
          className="f-title flex min-h-24 items-center justify-center rounded-[var(--hl-radius)] border-[3px] border-[var(--hl-danger)] text-2xl text-[var(--hl-danger)]"
        >
          {t.text911}
        </a>
      </div>

      <button
        onClick={sendLocation}
        disabled={status === "finding"}
        className="f-btn flex min-h-14 items-center justify-center gap-2 rounded-[var(--hl-radius)] bg-[var(--hl-danger-soft)] text-[var(--hl-danger)] disabled:opacity-60"
      >
        <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.3" /></svg>
        {status === "finding" ? t.findingLocation : t.sendLocation}
      </button>
      {status === "denied" && <p className="px-1 text-sm font-medium text-[var(--hl-danger)]">{t.noLocation}</p>}
      {loc && (
        <p className="px-1 text-sm">
          <span className="text-[var(--hl-muted)]">{t.yourLocation}: </span>
          <span className="font-mono">
            {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
          </span>
          <span className="text-[var(--hl-muted)]"> (±{Math.round(loc.acc)} m)</span>
        </p>
      )}
      <p className="text-base leading-relaxed">{t.locationTip}</p>
      <p className="text-base leading-relaxed">{t.safePlace}</p>

      <ul className="mt-2 border-t-2 border-[var(--hl-ink)]">
        {emergencyResources(county).map((r) => (
          <ResourceCard key={r.id} r={r} t={t} locale={locale} />
        ))}
      </ul>
      <p className="text-xs text-[var(--hl-muted)]">{t.callLogTip}</p>
      {onAbout && (
        <button
          onClick={onAbout}
          className="f-btn mt-2 min-h-11 self-start underline decoration-2 underline-offset-4"
        >
          {t.howItWorks}
        </button>
      )}
    </div>
  );
}
