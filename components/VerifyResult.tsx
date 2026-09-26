"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Info,
  KeyRound,
  MapPin,
  Navigation,
  ShieldCheck,
  ShieldX,
  Siren,
  TriangleAlert,
  X,
} from "lucide-react";
import type { VerifyResponse } from "@/lib/types";
import { formatCount, minutesSince } from "@/lib/time";

interface VerifyResultProps {
  result: VerifyResponse;
  serial: string;
  onDismiss: () => void;
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p
        className={`mt-0.5 text-sm font-semibold text-slate-100 ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function DismissButton({ onDismiss }: { onDismiss: () => void }) {
  return (
    <button
      type="button"
      onClick={onDismiss}
      aria-label="Dismiss result"
      className="absolute right-3 top-3 rounded-full border border-slate-700/70 bg-slate-950/60 p-1.5 text-slate-400 transition hover:border-slate-500 hover:text-slate-100"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

function AuthenticCard({ result, serial, onDismiss }: VerifyResultProps) {
  return (
    <section className="animate-pc-fade-up relative overflow-hidden rounded-3xl border border-emerald-500/40 bg-gradient-to-b from-emerald-500/15 via-slate-900/85 to-slate-900/90 shadow-glow">
      <DismissButton onDismiss={onDismiss} />
      <div className="px-6 pb-6 pt-8 text-center">
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
          <span className="animate-pc-pulse-ring absolute inset-0 rounded-full bg-emerald-500/25" />
          <span className="animate-pc-pop flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/40">
            <svg viewBox="0 0 48 48" className="h-11 w-11" aria-hidden>
              <circle
                cx="24"
                cy="24"
                r="21"
                fill="none"
                stroke="rgba(52,211,153,0.35)"
                strokeWidth="2.5"
              />
              <path
                d="M14.5 24.5 L21.5 31.5 L34 18.5"
                fill="none"
                stroke="#34d399"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-pc-draw"
              />
            </svg>
          </span>
        </div>

        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-400">
          Authentic Medicine
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-50">
          {result.drug_name ?? "Verified Product"}
        </h2>
        <p className="mt-1 text-sm text-emerald-200/90">{result.message}</p>

        <div className="mt-6 grid grid-cols-2 gap-3 text-left">
          <Detail label="Serial Number" value={serial} mono />
          <Detail label="Batch Number" value={result.batch_no ?? "-"} mono />
          <Detail label="Expiry Date" value={result.exp_date ?? "-"} />
          <Detail label="Scan Location" value={result.current_city ?? "-"} />
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-left">
          <ShieldCheck className="h-6 w-6 shrink-0 text-emerald-400" />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Government Authenticated
            </p>
            <p className="text-[11px] text-emerald-200/70">
              CDSCO trace verified - Central Drug Regulatory Authority
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function RepeatCard({ result, serial, onDismiss }: VerifyResultProps) {
  return (
    <section className="animate-pc-fade-up relative overflow-hidden rounded-3xl border border-sky-500/40 bg-gradient-to-b from-sky-500/10 via-slate-900/85 to-slate-900/90">
      <DismissButton onDismiss={onDismiss} />
      <div className="px-6 pb-6 pt-8 text-center">
        <div className="animate-pc-pop mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-500/15 ring-1 ring-sky-400/40">
          <Info className="h-8 w-8 text-sky-300" />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.28em] text-sky-400">
          Previously Verified
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-50">
          {result.drug_name ?? "Known Serial"}
        </h2>
        <p className="mt-1 text-sm text-sky-200/90">{result.message}</p>

        <div className="mt-6 grid grid-cols-2 gap-3 text-left">
          <Detail label="Serial Number" value={serial} mono />
          <Detail label="Batch Number" value={result.batch_no ?? "-"} mono />
          <Detail
            label="Previous Scan"
            value={
              result.prev_city
                ? `${result.prev_city} · ${
                    result.prev_scanned_at
                      ? `${minutesSince(result.prev_scanned_at)} mins ago`
                      : "earlier"
                  }`
                : "This device"
            }
          />
          <Detail label="Current Location" value={result.current_city ?? "-"} />
        </div>

        <p className="mt-5 text-xs text-slate-400">
          Re-verification logged to the national surveillance grid. If you did
          not scan this box before, contact your pharmacist.
        </p>
      </div>
    </section>
  );
}

function CloneCard({ result, serial, onDismiss }: VerifyResultProps) {
  const [reported, setReported] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  const minutes = result.prev_scanned_at
    ? minutesSince(result.prev_scanned_at)
    : null;
  const distance =
    result.distance_km != null ? formatCount(result.distance_km) : null;
  const velocity = result.velocity ? formatCount(Number(result.velocity)) : null;

  const narrative = [
    result.prev_city && minutes
      ? `Scanned in ${result.prev_city} ${minutes} mins ago.`
      : result.prev_city
        ? `Previously scanned in ${result.prev_city}.`
        : null,
    result.current_city
      ? `Current location: ${result.current_city}${
          distance ? ` (${distance} km away)` : ""
        }.`
      : null,
    velocity ? `Velocity: ~${velocity} km/h.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const fileReport = () => {
    const serial4 = Math.floor(1000 + Math.random() * 9000);
    setReference(`PC-${new Date().getFullYear()}-${serial4}`);
    setReported(true);
  };

  return (
    <section className="animate-pc-fade-up relative overflow-hidden rounded-3xl border border-rose-600/50 bg-gradient-to-b from-rose-600/20 via-slate-900/90 to-slate-900/95 shadow-glow-rose">
      <DismissButton onDismiss={onDismiss} />
      <div className="px-6 pb-6 pt-8 text-center">
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
          <span className="animate-pc-pulse-ring absolute inset-0 rounded-full bg-rose-500/30" />
          <span className="animate-pc-pop flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/15 ring-1 ring-rose-400/50">
            <TriangleAlert className="h-10 w-10 text-rose-400" />
          </span>
        </div>

        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.28em] text-rose-400">
          Counterfeit Clone Detected
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-50">
          {result.drug_name ?? "Cloned Serial"}
        </h2>

        <div className="mt-5 rounded-2xl border border-rose-500/40 bg-rose-500/15 px-4 py-3 text-sm font-semibold text-rose-200">
          {result.message}
        </div>

        <p className="mt-4 text-sm leading-relaxed text-rose-100/85">
          {narrative}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 text-left">
          <Detail label="Origin Scan City" value={result.prev_city ?? "-"} />
          <Detail
            label="Distance"
            value={distance ? `${distance} km` : "-"}
          />
          <Detail
            label="Calculated Velocity"
            value={velocity ? `${velocity} km/h` : "-"}
          />
          <Detail
            label="Previous Scan"
            value={minutes ? `${minutes} mins ago` : "-"}
          />
          <Detail label="Serial Number" value={serial} mono />
          <Detail label="Batch Number" value={result.batch_no ?? "-"} mono />
        </div>

        <div className="mt-5 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-left">
          <div className="flex items-center gap-2 text-amber-300">
            <Siren className="h-4 w-4" />
            <p className="text-xs font-bold uppercase tracking-wider">
              Inspector Dispatch Notice
            </p>
          </div>
          <p className="mt-2 text-sm text-amber-100/90">
            Enforcement unit alerted in {result.current_city ?? "your zone"}.
            The Central Drug Regulatory Authority has been notified of a cloned
            serial in circulation.
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={fileReport}
            disabled={reported}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:cursor-default disabled:bg-rose-600/40 disabled:text-rose-100/70"
          >
            <Siren className="h-4 w-4" />
            {reported ? "Report Filed" : "Report to CDSCO"}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
          >
            <Navigation className="h-4 w-4" />
            Close Alert
          </button>
        </div>

        {reported && reference && (
          <p className="animate-pc-fade-up mt-3 flex items-center justify-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            Reference {reference} logged with the enforcement cell.
          </p>
        )}
      </div>
    </section>
  );
}

function RejectedCard({ result, serial, onDismiss }: VerifyResultProps) {
  const isPinIssue = result.status === "INVALID_PIN";
  const title =
    result.status === "NOT_FOUND"
      ? "Unregistered Serial"
      : isPinIssue
        ? "PIN Verification Failed"
        : "Incomplete Submission";
  const guidance =
    result.status === "NOT_FOUND"
      ? "This serial number is absent from the national registry. Do not consume this medicine and report it to your pharmacist immediately."
      : isPinIssue
        ? "The scratch PIN does not match the sealed record. The packaging may have been tampered with. Do not consume."
        : "Please provide a valid serial number and scratch PIN.";

  return (
    <section
      className={`animate-pc-fade-up relative overflow-hidden rounded-3xl border bg-gradient-to-b via-slate-900/90 to-slate-900/95 ${
        isPinIssue
          ? "border-amber-500/40 from-amber-500/10"
          : "border-rose-600/50 from-rose-600/15 shadow-glow-rose"
      }`}
    >
      <DismissButton onDismiss={onDismiss} />
      <div className="px-6 pb-6 pt-8 text-center">
        <div
          className={`animate-pc-pop mx-auto flex h-16 w-16 items-center justify-center rounded-full ring-1 ${
            isPinIssue
              ? "bg-amber-500/15 ring-amber-400/40"
              : "bg-rose-500/15 ring-rose-400/50"
          }`}
        >
          {isPinIssue ? (
            <KeyRound className="h-8 w-8 text-amber-300" />
          ) : (
            <ShieldX className="h-8 w-8 text-rose-400" />
          )}
        </div>
        <p
          className={`mt-4 text-xs font-semibold uppercase tracking-[0.28em] ${
            isPinIssue ? "text-amber-400" : "text-rose-400"
          }`}
        >
          Verification Rejected
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-50">{title}</h2>
        <p
          className={`mt-2 text-sm font-medium ${
            isPinIssue ? "text-amber-200/90" : "text-rose-200/90"
          }`}
        >
          {result.message}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 text-left">
          <Detail label="Serial Number" value={serial} mono />
          <Detail
            label="Status Code"
            value={result.status}
            mono
          />
          {result.drug_name && (
            <Detail label="Registered Drug" value={result.drug_name} />
          )}
          <Detail label="Scan Location" value={result.current_city ?? "-"} />
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-2xl border border-slate-700/70 bg-slate-950/60 p-4 text-left">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <p className="text-xs leading-relaxed text-slate-300">{guidance}</p>
        </div>
      </div>
    </section>
  );
}

export default function VerifyResult(props: VerifyResultProps) {
  switch (props.result.status) {
    case "GENUINE_FIRST":
      return <AuthenticCard {...props} />;
    case "REPEAT_SAME_DEVICE":
      return <RepeatCard {...props} />;
    case "CLONE_DETECTED":
      return <CloneCard {...props} />;
    default:
      return <RejectedCard {...props} />;
  }
}
