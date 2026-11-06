"use client";

import { useEffect, useRef, useState } from "react";

/** Downscale a photo to keep encrypted storage small. Also strips EXIF (incl. GPS) by re-encoding. */
export async function compressImage(file: File, maxSide = 1600, quality = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", quality)
  );
}

/** Voice-note recorder. Audio stays in memory until the caller encrypts and saves it. */
export function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolveStop = useRef<((b: Blob | null) => void) | null>(null);

  const cleanup = () => {
    if (timer.current) clearInterval(timer.current);
    rec.current?.stream.getTracks().forEach((t) => t.stop());
    rec.current = null;
    setRecording(false);
  };

  useEffect(() => () => cleanup(), []);

  async function start(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = () => {
        const blob = chunks.current.length ? new Blob(chunks.current, { type: r.mimeType }) : null;
        cleanup();
        resolveStop.current?.(blob);
      };
      r.start();
      rec.current = r;
      setSeconds(0);
      setRecording(true);
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      return true;
    } catch {
      return false; // permission denied or unsupported
    }
  }

  function stop(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!rec.current) return resolve(null);
      resolveStop.current = resolve;
      rec.current.stop();
    });
  }

  return { recording, seconds, start, stop };
}
