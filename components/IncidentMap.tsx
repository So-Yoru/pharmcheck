"use client";

import { useMemo, useState } from "react";
import { Radar, Route } from "lucide-react";
import type { ScanFeedItem, ScanVerdict } from "@/lib/types";
import { formatCount } from "@/lib/time";

const VIEW_WIDTH = 640;
const VIEW_HEIGHT = 560;

const DOT_COLORS: Record<ScanVerdict, string> = {
  GENUINE_FIRST: "#34d399",
  REPEAT_SAME_DEVICE: "#38bdf8",
  CLONE_DETECTED: "#f43f5e",
  INVALID_PIN: "#fb7185",
  NOT_FOUND: "#fbbf24",
};

const VERDICT_PRIORITY: ScanVerdict[] = [
  "CLONE_DETECTED",
  "INVALID_PIN",
  "NOT_FOUND",
  "REPEAT_SAME_DEVICE",
  "GENUINE_FIRST",
];

const INDIA_OUTLINE: Array<[number, number]> = [
  [23.0, 68.2],
  [24.3, 68.8],
  [24.8, 71.0],
  [27.7, 70.0],
  [29.6, 70.3],
  [32.3, 74.6],
  [34.0, 74.2],
  [34.7, 76.0],
  [35.6, 77.4],
  [34.4, 78.6],
  [32.5, 79.1],
  [30.4, 81.0],
  [28.6, 82.1],
  [27.5, 84.0],
  [26.5, 87.4],
  [26.7, 89.0],
  [27.3, 89.6],
  [26.8, 92.0],
  [27.6, 94.6],
  [28.2, 95.6],
  [27.0, 97.1],
  [25.4, 95.4],
  [23.7, 93.4],
  [22.0, 92.5],
  [23.5, 91.2],
  [22.4, 89.0],
  [21.5, 87.0],
  [19.5, 85.6],
  [18.0, 84.1],
  [15.8, 80.6],
  [13.5, 80.4],
  [11.0, 79.9],
  [9.3, 79.2],
  [8.1, 77.5],
  [9.9, 76.6],
  [11.5, 75.7],
  [13.0, 74.7],
  [15.0, 74.0],
  [17.5, 73.0],
  [19.0, 72.8],
  [21.0, 72.6],
  [22.1, 72.4],
  [21.4, 70.0],
  [20.7, 70.3],
  [22.3, 69.1],
];

function project(lat: number, lng: number): { x: number; y: number } {
  return {
    x: Number(((lng - 66) * 20).toFixed(1)),
    y: Number(((38 - lat) * 17.5).toFixed(1)),
  };
}

const OUTLINE_PATH =
  INDIA_OUTLINE.map(([lat, lng], index) => {
    const point = project(lat, lng);
    return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
  }).join(" ") + " Z";

interface CityPoint {
  city: string;
  lat: number;
  lng: number;
  count: number;
  verdict: ScanVerdict;
}

interface IncidentMapProps {
  feed: ScanFeedItem[];
  incidents: ScanFeedItem[];
}

export default function IncidentMap({ feed, incidents }: IncidentMapProps) {
  const [activeId, setActiveId] = useState<number | null>(null);

  const cityPoints = useMemo<CityPoint[]>(() => {
    const points = new Map<string, CityPoint>();
    for (const scan of feed) {
      if (scan.lat == null || scan.lng == null) continue;
      const key = scan.city;
      const existing = points.get(key);
      if (!existing) {
        points.set(key, {
          city: scan.city,
          lat: scan.lat,
          lng: scan.lng,
          count: 1,
          verdict: scan.verdict,
        });
        continue;
      }
      existing.count += 1;
      if (
        VERDICT_PRIORITY.indexOf(scan.verdict) <
        VERDICT_PRIORITY.indexOf(existing.verdict)
      ) {
        existing.verdict = scan.verdict;
      }
    }
    return Array.from(points.values());
  }, [feed]);

  const plottedIncidents = incidents.filter(
    (incident) =>
      incident.lat != null &&
      incident.lng != null &&
      incident.prev_lat != null &&
      incident.prev_lng != null
  );

  return (
    <section className="pc-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-4">
        <div className="flex items-center gap-2">
          <Radar className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Geospatial Incident Grid
          </h2>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> Genuine
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-400" /> Repeat
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500" /> Clone
          </span>
        </div>
      </div>

      <div className="relative bg-slate-950/60">
        <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          className="h-auto w-full"
          role="img"
          aria-label="Incident map of scan activity across India"
        >
          <defs>
            <marker
              id="pc-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#f43f5e" />
            </marker>
            <radialGradient id="pc-map-glow" cx="50%" cy="45%" r="65%">
              <stop offset="0%" stopColor="rgba(16,185,129,0.10)" />
              <stop offset="100%" stopColor="rgba(2,6,23,0)" />
            </radialGradient>
          </defs>

          <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="url(#pc-map-glow)" />

          {[10, 20, 30].map((lat) => {
            const y = project(lat, 66).y;
            return (
              <g key={`lat-${lat}`}>
                <line
                  x1={0}
                  y1={y}
                  x2={VIEW_WIDTH}
                  y2={y}
                  stroke="rgba(51,65,85,0.35)"
                  strokeWidth="1"
                />
                <text x={6} y={y - 4} fontSize="9" fill="#475569">
                  {lat}N
                </text>
              </g>
            );
          })}
          {[70, 80, 90].map((lng) => {
            const x = project(38, lng).x;
            return (
              <g key={`lng-${lng}`}>
                <line
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={VIEW_HEIGHT}
                  stroke="rgba(51,65,85,0.35)"
                  strokeWidth="1"
                />
                <text x={x + 4} y={VIEW_HEIGHT - 6} fontSize="9" fill="#475569">
                  {lng}E
                </text>
              </g>
            );
          })}

          <path
            d={OUTLINE_PATH}
            fill="rgba(30,41,59,0.55)"
            stroke="#334155"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {plottedIncidents.map((incident) => {
            const from = project(incident.prev_lat!, incident.prev_lng!);
            const to = project(incident.lat!, incident.lng!);
            const controlX = (from.x + to.x) / 2 + (to.y - from.y) * 0.18;
            const controlY = (from.y + to.y) / 2 - (to.x - from.x) * 0.18;
            const dimmed = activeId !== null && activeId !== incident.id;
            const path = `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
            return (
              <g
                key={incident.id}
                opacity={dimmed ? 0.12 : 1}
                className="transition-opacity duration-300"
              >
                <path
                  d={path}
                  fill="none"
                  stroke="rgba(244,63,94,0.22)"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
                <path
                  d={path}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2"
                  strokeDasharray="7 7"
                  className="animate-pc-dash"
                  markerEnd="url(#pc-arrow)"
                />
                <text
                  x={controlX}
                  y={controlY - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="700"
                  fill="#fda4af"
                  stroke="#020617"
                  strokeWidth="3"
                  paintOrder="stroke"
                >
                  {formatCount(incident.velocity_kmh)} km/h
                </text>
              </g>
            );
          })}

          {cityPoints.map((point) => {
            const { x, y } = project(point.lat, point.lng);
            const color = DOT_COLORS[point.verdict];
            const critical = point.verdict === "CLONE_DETECTED";
            return (
              <g key={point.city}>
                {critical && (
                  <circle cx={x} cy={y} r="12" fill={color} opacity="0.18" />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={4 + Math.min(point.count, 4)}
                  fill={color}
                  stroke="#020617"
                  strokeWidth="1.5"
                >
                  <title>
                    {`${point.city} - ${point.count} scan${
                      point.count === 1 ? "" : "s"
                    } (${point.verdict})`}
                  </title>
                </circle>
                <text
                  x={x + 9}
                  y={y + 3}
                  fontSize="10"
                  fontWeight="600"
                  fill="#cbd5e1"
                  stroke="#020617"
                  strokeWidth="2.5"
                  paintOrder="stroke"
                >
                  {point.city}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="border-t border-slate-800/80 px-5 py-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Route className="h-3.5 w-3.5 text-rose-400" />
          Clone transit traces
        </div>
        {plottedIncidents.length === 0 ? (
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            No clone incidents on record yet. Open the Consumer App and load
            the Clone Box demo to trigger a live impossible-transit trace.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {plottedIncidents.map((incident) => {
              const active = activeId === incident.id;
              return (
                <button
                  key={incident.id}
                  type="button"
                  onClick={() =>
                    setActiveId(active ? null : incident.id)
                  }
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${
                    active
                      ? "border-rose-500/60 bg-rose-500/20 text-rose-200"
                      : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-rose-500/40 hover:text-rose-200"
                  }`}
                >
                  {incident.prev_city} {"->"} {incident.city} ·{" "}
                  {formatCount(incident.velocity_kmh)} km/h
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
