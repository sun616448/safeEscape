"use client";

import { useState } from "react";
import { emergencyResources } from "@/lib/resources";
import type { County, Locale } from "@/lib/types";
import type { Strings } from "@/lib/i18n";
import ResourceCard from "./ResourceCard";

type Loc = { lat: number; lng: number; acc: number };

// Instant, no-AI emergency screen. Everything here is static and vetted.
// Location is read on the device only and goes straight into her text to 911, never to our server.
export default function Emergency({ county, t, locale }: { county?: County; t: Strings; locale: Locale }) {
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
          className="flex min-h-20 items-center justify-center rounded-3xl bg-[var(--hl-danger)] text-xl font-bold text-[var(--hl-danger-ink)]"
        >
          {t.call911}
        </a>
        <a
          href="sms:911"
          className="flex min-h-20 items-center justify-center rounded-3xl border-2 border-[var(--hl-danger)] text-xl font-bold text-[var(--hl-danger)]"
        >
          {t.text911}
        </a>
      </div>

      <button
        onClick={sendLocation}
        disabled={status === "finding"}
        className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[var(--hl-danger-soft)] font-semibold text-[var(--hl-danger)] disabled:opacity-60"
      >
        <span aria-hidden>📍</span>
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
      <p className="px-1 text-[15px] leading-snug">{t.locationTip}</p>
      <p className="px-1 text-[15px] leading-snug">{t.safePlace}</p>

      <ul className="mt-2 flex flex-col gap-3">
        {emergencyResources(county).map((r) => (
          <ResourceCard key={r.id} r={r} t={t} locale={locale} />
        ))}
      </ul>
      <p className="px-1 text-xs text-[var(--hl-muted)]">{t.callLogTip}</p>
    </div>
  );
}
