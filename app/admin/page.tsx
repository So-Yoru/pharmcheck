"use client";

import { useCallback, useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Boxes,
  Cpu,
  Landmark,
  MapPin,
  Radio,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Siren,
  TriangleAlert,
} from "lucide-react";
import IncidentMap from "@/components/IncidentMap";
import LiveClock from "@/components/LiveClock";
import { formatCount, formatRelativeFromSqlite } from "@/lib/time";
import type { AdminOverview, ScanFeedItem, ScanVerdict } from "@/lib/types";

const VERDICT_META: Record<
  ScanVerdict,
  { label: string; pill: string; dot: string }
> = {
  GENUINE_FIRST: {
    label: "GENUINE",
    pill: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    dot: "bg-emerald-400",
  },
  REPEAT_SAME_DEVICE: {
    label: "REPEAT",
    pill: "border-sky-500/40 bg-sky-500/10 text-sky-300",
    dot: "bg-sky-400",
  },
  CLONE_DETECTED: {
    label: "CLONE_DETECTED",
    pill: "border-rose-500/50 bg-rose-500/15 text-rose-300",
    dot: "bg-rose-500",
  },
  INVALID_PIN: {
    label: "TAMPERED PIN",
    pill: "border-rose-500/40 bg-rose-500/10 text-rose-300",
    dot: "bg-rose-400",
  },
  NOT_FOUND: {
    label: "UNREGISTERED",
    pill: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    dot: "bg-amber-400",
  },
};

const TONES = {
  emerald: {
    icon: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
    accent: "from-emerald-500/10",
  },
  rose: {
    icon: "bg-rose-500/15 text-rose-400 ring-rose-500/30",
    accent: "from-rose-500/10",
  },
  sky: {
    icon: "bg-sky-500/15 text-sky-400 ring-sky-500/30",
    accent: "from-sky-500/10",
  },
};

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  tone: keyof typeof TONES;
}) {
  return (
    <div className="pc-card relative overflow-hidden p-5 transition duration-300 hover:border-slate-600">
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b ${TONES[tone].accent} to-transparent`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-50">
            {value}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">{sub}</p>
        </div>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${TONES[tone].icon}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

function FeedRow({ scan }: { scan: ScanFeedItem }) {
  const meta = VERDICT_META[scan.verdict];
  const isClone = scan.verdict === "CLONE_DETECTED";
  return (
    <article
      className={`rounded-2xl border p-4 transition ${
        isClone
          ? "border-rose-500/40 bg-rose-500/10"
          : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.pill}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
            <span className="font-mono text-xs font-semibold text-slate-200">
              {scan.serial_number}
            </span>
          </div>
          <p className="mt-1.5 truncate text-sm font-medium text-slate-200">
            {scan.drug_name ?? "Unregistered product"}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
            <MapPin className="h-3 w-3" />
            {scan.city}
            <Cpu className="ml-1 h-3 w-3" />
            {scan.device_fingerprint.slice(0, 18)}
          </p>
        </div>
        <span className="shrink-0 text-[11px] text-slate-500">
          {formatRelativeFromSqlite(scan.scanned_at)}
        </span>
      </div>

      {isClone && (
        <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
          <div className="flex items-center gap-2 text-amber-300">
            <Siren className="h-3.5 w-3.5" />
            <p className="text-[10px] font-bold uppercase tracking-wider">
              Inspector dispatch notice
            </p>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-amber-100/90">
            {scan.prev_city ?? "Unknown origin"} {"->"} {scan.city} ·{" "}
            {formatCount(scan.distance_km ?? 0)} km apart ·{" "}
            {formatCount(scan.velocity_kmh)} km/h implied transit speed
          </p>
        </div>
      )}
    </article>
  );
}

export default function AdminPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/admin/overview", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(`Grid request failed (${response.status})`);
      }
      const payload = (await response.json()) as AdminOverview;
      setData(payload);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to reach the surveillance grid."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => clearInterval(timer);
  }, [load]);

  const kpis = data?.kpis;
  const feed = data?.feed ?? [];
  const incidents = data?.incidents ?? [];

  return (
    <div className="space-y-6">
      <section className="pc-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 ring-1 ring-slate-700">
              <Landmark className="h-6 w-6 text-emerald-400" />
            </span>
            <div>
              <h1 className="text-lg font-bold text-slate-50">
                Central Drug Regulatory Authority
              </h1>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                PharmCheck National Surveillance Grid
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <LiveClock />
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Live Surveillance Active
            </span>
            <button
              type="button"
              onClick={() => void load()}
              aria-label="Refresh surveillance data"
              className="rounded-xl border border-slate-700 p-2.5 text-slate-300 transition hover:border-emerald-500/50 hover:text-emerald-300"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {error} - retrying automatically.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          icon={ShieldCheck}
          label="Total Verified Clean Scans"
          value={formatCount(kpis?.cleanScans ?? 0)}
          sub={`${formatCount(kpis?.repeatScans ?? 0)} repeat re-verifications`}
          tone="emerald"
        />
        <KpiCard
          icon={TriangleAlert}
          label="Counterfeit / Clone Incidents"
          value={formatCount(
            (kpis?.cloneIncidents ?? 0) + (kpis?.counterfeitAttempts ?? 0)
          )}
          sub={`${formatCount(kpis?.cloneIncidents ?? 0)} clones · ${formatCount(
            kpis?.counterfeitAttempts ?? 0
          )} tampered attempts`}
          tone="rose"
        />
        <KpiCard
          icon={Boxes}
          label="Active Tracked Batches"
          value={formatCount(kpis?.activeBatches ?? 0)}
          sub={`${formatCount(
            kpis?.serializedUnits ?? 0
          )} serialized units under registry`}
          tone="sky"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="pc-card lg:col-span-2">
          <header className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-rose-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                Fraud Anomaly Feed
              </h2>
            </div>
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Radio className="h-3.5 w-3.5 text-emerald-400" />
              auto-refresh 5s
            </span>
          </header>
          <div className="pc-scroll max-h-[560px] space-y-3 overflow-y-auto p-4">
            {loading && !data ? (
              <div className="space-y-3">
                {[0, 1, 2].map((key) => (
                  <div
                    key={key}
                    className="h-20 animate-pulse rounded-2xl border border-slate-800 bg-slate-950/60"
                  />
                ))}
              </div>
            ) : feed.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <ShieldAlert className="h-8 w-8 text-slate-600" />
                <p className="text-sm text-slate-400">
                  No scan events on the grid yet.
                </p>
                <p className="text-xs text-slate-500">
                  Run a verification in the Consumer App to populate live
                  intelligence.
                </p>
              </div>
            ) : (
              feed.map((scan) => <FeedRow key={scan.id} scan={scan} />)
            )}
          </div>
        </section>

        <div className="lg:col-span-3">
          <IncidentMap feed={feed} incidents={incidents} />
        </div>
      </div>
    </div>
  );
}
