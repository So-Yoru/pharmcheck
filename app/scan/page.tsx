"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Html5Qrcode as Html5QrcodeType } from "html5-qrcode";
import {
  Camera,
  Crosshair,
  FlaskConical,
  KeyRound,
  Loader2,
  MapPin,
  QrCode,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Skull,
  TriangleAlert,
} from "lucide-react";
import VerifyResult from "@/components/VerifyResult";
import { resolveCity } from "@/lib/cities";
import type { VerifyResponse } from "@/lib/types";

const FALLBACK_LAT = 17.385;
const FALLBACK_LNG = 78.4867;

type TabMode = "camera" | "manual";
type LocationSource = "locating" | "gps" | "fallback" | "demo";

interface LocationState {
  lat: number;
  lng: number;
  city: string;
  source: LocationSource;
}

const DEMO_BOXES = [
  {
    label: "Load Authentic Box",
    detail: "SN-GEN-101 / SAFE99",
    serial: "SN-GEN-101",
    pin: "SAFE99",
    tone: "genuine" as const,
  },
  {
    label: "Load Clone Box",
    detail: "SN-CLONE-404 / FAKE01",
    serial: "SN-CLONE-404",
    pin: "FAKE01",
    tone: "clone" as const,
  },
];

function extractSerial(decoded: string): string {
  const raw = decoded.trim();
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as { s?: unknown; serial?: unknown };
      if (typeof parsed.s === "string" && parsed.s.trim()) {
        return parsed.s.trim().toUpperCase();
      }
      if (typeof parsed.serial === "string" && parsed.serial.trim()) {
        return parsed.serial.trim().toUpperCase();
      }
    } catch {
      return raw.toUpperCase();
    }
  }
  const parts = raw.split("|");
  if (parts.length >= 2 && parts[0].toUpperCase() === "PHARMCHECK") {
    return parts[1].trim().toUpperCase();
  }
  return raw.toUpperCase();
}

export default function ScanPage() {
  const [tab, setTab] = useState<TabMode>("camera");
  const [serial, setSerial] = useState("");
  const [pin, setPin] = useState("");
  const [location, setLocation] = useState<LocationState>({
    lat: FALLBACK_LAT,
    lng: FALLBACK_LNG,
    city: "Hyderabad",
    source: "locating",
  });
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [justScanned, setJustScanned] = useState(false);

  const pinRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5QrcodeType | null>(null);
  const decodeHandlerRef = useRef<(decoded: string) => void>(() => undefined);

  const requestGps = useCallback(() => {
    setLocation((prev) => ({ ...prev, source: "locating" }));
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setLocation({
        lat: FALLBACK_LAT,
        lng: FALLBACK_LNG,
        city: "Hyderabad",
        source: "fallback",
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(4));
        const lng = Number(position.coords.longitude.toFixed(4));
        setLocation({ lat, lng, city: resolveCity(lat, lng), source: "gps" });
      },
      () =>
        setLocation({
          lat: FALLBACK_LAT,
          lng: FALLBACK_LNG,
          city: "Hyderabad",
          source: "fallback",
        }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => {
    requestGps();
  }, [requestGps]);

  useEffect(() => {
    let stored = window.localStorage.getItem("pharmcheck_device_id");
    if (!stored) {
      const randomPart =
        globalThis.crypto?.randomUUID?.() ??
        Math.random().toString(36).slice(2);
      stored = `dev-${randomPart}`;
      window.localStorage.setItem("pharmcheck_device_id", stored);
    }
    setDeviceId(stored);
  }, []);

  const handleDecoded = useCallback((decoded: string) => {
    setSerial(extractSerial(decoded));
    setTab("manual");
    setJustScanned(true);
    setError(null);
    setResult(null);
  }, []);

  useEffect(() => {
    decodeHandlerRef.current = handleDecoded;
  }, [handleDecoded]);

  useEffect(() => {
    if (tab !== "camera") return;
    let disposed = false;
    let captured = false;
    let instance: Html5QrcodeType | null = null;

    const boot = async () => {
      try {
        const module = await import("html5-qrcode");
        if (disposed) return;
        instance = new module.Html5Qrcode("pharmcheck-reader", {
          verbose: false,
          formatsToSupport: [module.Html5QrcodeSupportedFormats.QR_CODE],
        });
        scannerRef.current = instance;
        await instance.start(
          { facingMode: "environment" },
          { fps: 10 },
          (decodedText) => {
            if (disposed || captured) return;
            captured = true;
            decodeHandlerRef.current(decodedText);
          },
          () => undefined
        );
        if (disposed) {
          await instance.stop().catch(() => undefined);
          instance.clear();
          return;
        }
        setCameraError(null);
      } catch {
        if (!disposed) {
          setCameraError(
            "Camera unavailable - grant permission or use the Manual tab."
          );
        }
      }
    };

    void boot();

    return () => {
      disposed = true;
      const active = instance ?? scannerRef.current;
      scannerRef.current = null;
      if (active) {
        active
          .stop()
          .then(() => active.clear())
          .catch(() => {
            try {
              active.clear();
            } catch {
              return;
            }
          });
      }
    };
  }, [tab]);

  useEffect(() => {
    if (tab === "manual" && justScanned) {
      const timer = setTimeout(() => pinRef.current?.focus(), 80);
      return () => clearTimeout(timer);
    }
  }, [tab, justScanned]);

  const loadDemo = (box: (typeof DEMO_BOXES)[number]) => {
    setSerial(box.serial);
    setPin(box.pin);
    setTab("manual");
    setJustScanned(false);
    setResult(null);
    setError(null);
  };

  const useDemoLocation = () => {
    setLocation({
      lat: FALLBACK_LAT,
      lng: FALLBACK_LNG,
      city: "Hyderabad",
      source: "demo",
    });
  };

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanSerial = serial.trim().toUpperCase();
    const cleanPin = pin.trim();
    if (!cleanSerial || cleanPin.length < 4) {
      setError("Enter the serial number and the 6-character scratch PIN.");
      return;
    }
    setVerifying(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serial_number: cleanSerial,
          pin: cleanPin,
          lat: location.lat,
          lng: location.lng,
          device_id: deviceId ?? "anonymous-device",
        }),
      });
      const data = (await response.json()) as VerifyResponse;
      if (!response.ok && !data.status) {
        throw new Error(data.message || "Verification failed.");
      }
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Network error - could not reach the verification grid."
      );
    } finally {
      setVerifying(false);
    }
  };

  const locationLabel =
    location.source === "locating"
      ? "Acquiring GPS"
      : location.source === "gps"
        ? "Live GPS"
        : location.source === "demo"
          ? "Demo GPS"
          : "Fallback GPS";

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <header className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" />
          Consumer Verification
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-50">
          Verify Your Medicine
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Scan the QR code, scratch the sealed PIN panel, and confirm
          authenticity in seconds.
        </p>
      </header>

      {result && (
        <VerifyResult
          result={result}
          serial={serial.trim().toUpperCase()}
          onDismiss={() => setResult(null)}
        />
      )}

      <section className="pc-card overflow-hidden">
        <div className="flex gap-1 border-b border-slate-800/80 p-2">
          <button
            type="button"
            onClick={() => setTab("camera")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              tab === "camera"
                ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
            }`}
          >
            <Camera className="h-4 w-4" />
            Use Camera
          </button>
          <button
            type="button"
            onClick={() => setTab("manual")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              tab === "manual"
                ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
            }`}
          >
            <ScanLine className="h-4 w-4" />
            Manual / Fast Demo Click
          </button>
        </div>

        <div className="p-5">
          {tab === "camera" ? (
            <div className="space-y-4">
              <div className="relative mx-auto h-[300px] w-[300px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
                <div
                  id="pharmcheck-reader"
                  className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
                />
                <div className="pointer-events-none absolute inset-0">
                  <span className="absolute left-4 top-4 h-10 w-10 rounded-tl-2xl border-l-2 border-t-2 border-emerald-400/90" />
                  <span className="absolute right-4 top-4 h-10 w-10 rounded-tr-2xl border-r-2 border-t-2 border-emerald-400/90" />
                  <span className="absolute bottom-4 left-4 h-10 w-10 rounded-bl-2xl border-b-2 border-l-2 border-emerald-400/90" />
                  <span className="absolute bottom-4 right-4 h-10 w-10 rounded-br-2xl border-b-2 border-r-2 border-emerald-400/90" />
                  <span className="animate-pc-scan-line absolute inset-x-8 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_14px_rgba(52,211,153,0.9)]" />
                  <Crosshair className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-emerald-300/60" />
                </div>
                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/90 px-6 text-center">
                    <TriangleAlert className="h-6 w-6 text-amber-400" />
                    <p className="text-xs text-slate-300">{cameraError}</p>
                  </div>
                )}
              </div>
              <p className="text-center text-xs text-slate-500">
                Align the QR code inside the frame. The serial number is
                captured automatically.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 px-5 py-6 text-center">
              <ScanLine className="mx-auto h-6 w-6 text-emerald-400" />
              <p className="mt-2 text-sm font-medium text-slate-200">
                Manual entry enabled
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Type or paste the serial number printed under the QR code, then
                enter the scratch PIN below.
              </p>
            </div>
          )}
        </div>
      </section>

      <form onSubmit={handleVerify} className="pc-card space-y-5 p-5">
        {justScanned && (
          <div className="animate-pc-fade-up flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
            <QrCode className="h-4 w-4" />
            QR captured:
            <span className="font-mono font-semibold">{serial}</span>
          </div>
        )}

        <div>
          <label htmlFor="serial" className="pc-label">
            Serial Number
          </label>
          <div className="relative">
            <QrCode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="serial"
              value={serial}
              onChange={(event) => setSerial(event.target.value)}
              placeholder="SN-XXXX-000"
              autoComplete="off"
              spellCheck={false}
              className="pc-input pl-9 font-mono uppercase"
            />
          </div>
        </div>

        <div>
          <label htmlFor="pin" className="pc-label">
            Scratch PIN
          </label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="pin"
              ref={pinRef}
              value={pin}
              onChange={(event) => setPin(event.target.value.toUpperCase())}
              placeholder="6-character code"
              maxLength={6}
              autoComplete="off"
              spellCheck={false}
              className="pc-input pl-9 font-mono uppercase tracking-[0.4em]"
            />
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            Found under the silver scratch panel on the medicine box.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-xs">
          <MapPin
            className={`h-4 w-4 ${
              location.source === "locating"
                ? "animate-pulse text-amber-400"
                : "text-emerald-400"
            }`}
          />
          <span className="font-semibold text-slate-200">{location.city}</span>
          <span className="font-mono text-[10px] text-slate-500">
            {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </span>
          <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {locationLabel}
          </span>
          <button
            type="button"
            onClick={location.source === "demo" ? requestGps : useDemoLocation}
            className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 transition hover:text-emerald-200"
          >
            {location.source === "demo" ? (
              <>
                <RefreshCw className="h-3 w-3" />
                Retry live GPS
              </>
            ) : (
              <>
                <FlaskConical className="h-3 w-3" />
                Force Hyderabad demo
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-200">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        <button type="submit" disabled={verifying} className="pc-btn-primary w-full">
          {verifying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying against national registry...
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              Verify Medicine
            </>
          )}
        </button>
      </form>

      <section className="pc-card p-5">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-emerald-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Fast Demo Click
          </h2>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {DEMO_BOXES.map((box) => (
            <button
              key={box.serial}
              type="button"
              onClick={() => loadDemo(box)}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                box.tone === "genuine"
                  ? "border-emerald-500/40 bg-emerald-500/10 hover:border-emerald-400 hover:bg-emerald-500/15 hover:shadow-glow"
                  : "border-rose-500/40 bg-rose-500/10 hover:border-rose-400 hover:bg-rose-500/15 hover:shadow-glow-rose"
              }`}
            >
              {box.tone === "genuine" ? (
                <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400" />
              ) : (
                <Skull className="h-5 w-5 shrink-0 text-rose-400" />
              )}
              <span>
                <span className="block text-sm font-semibold text-slate-100">
                  {box.label}
                </span>
                <span className="block font-mono text-[11px] text-slate-400">
                  {box.detail}
                </span>
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          The clone demo replays a seeded scan from New Delhi logged 20 minutes
          ago. With the Hyderabad fallback GPS, verification triggers an
          impossible-transit clone alert.
        </p>
      </section>
    </div>
  );
}
