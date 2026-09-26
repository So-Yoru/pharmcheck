import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { haversineKm } from "@/lib/cities";
import type { ScanFeedItem, ScanVerdict } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RawScanRow {
  id: number;
  serial_number: string;
  device_fingerprint: string;
  city: string;
  lat: number | null;
  lng: number | null;
  scanned_at: string;
  verdict: ScanVerdict;
  velocity_kmh: number;
  drug_name: string | null;
  batch_no: string | null;
  prev_city: string | null;
  prev_lat: number | null;
  prev_lng: number | null;
  prev_scanned_at: string | null;
}

const FEED_SELECT = `
  SELECT
    s.id,
    s.serial_number,
    s.device_fingerprint,
    s.city,
    s.lat,
    s.lng,
    s.scanned_at,
    s.verdict,
    s.velocity_kmh,
    m.drug_name,
    m.batch_no,
    p.city AS prev_city,
    p.lat AS prev_lat,
    p.lng AS prev_lng,
    p.scanned_at AS prev_scanned_at
  FROM scans s
  LEFT JOIN medicines m ON m.serial_number = s.serial_number
  LEFT JOIN scans p ON p.id = (
    SELECT id FROM scans
    WHERE serial_number = s.serial_number
      AND id < s.id
      AND verdict IN ('GENUINE_FIRST','REPEAT_SAME_DEVICE','CLONE_DETECTED')
    ORDER BY id DESC
    LIMIT 1
  )
`;

function withDistance(row: RawScanRow): ScanFeedItem {
  const hasCoordinates =
    row.lat != null && row.lng != null && row.prev_lat != null && row.prev_lng != null;
  const distanceKm = hasCoordinates
    ? Number(haversineKm(row.lat!, row.lng!, row.prev_lat!, row.prev_lng!).toFixed(1))
    : null;
  return { ...row, distance_km: distanceKm };
}

function scalar(sql: string): number {
  const row = getDb().prepare(sql).get() as { value: number } | undefined;
  return row ? row.value : 0;
}

export async function GET() {
  const db = getDb();
  const kpis = {
    cleanScans: scalar(
      `SELECT COUNT(*) AS value FROM scans WHERE verdict = 'GENUINE_FIRST'`
    ),
    repeatScans: scalar(
      `SELECT COUNT(*) AS value FROM scans WHERE verdict = 'REPEAT_SAME_DEVICE'`
    ),
    cloneIncidents: scalar(
      `SELECT COUNT(*) AS value FROM scans WHERE verdict = 'CLONE_DETECTED'`
    ),
    counterfeitAttempts: scalar(
      `SELECT COUNT(*) AS value FROM scans WHERE verdict IN ('NOT_FOUND','INVALID_PIN')`
    ),
    activeBatches: scalar(
      `SELECT COUNT(DISTINCT batch_no) AS value FROM medicines`
    ),
    serializedUnits: scalar(`SELECT COUNT(*) AS value FROM medicines`),
    totalScans: scalar(`SELECT COUNT(*) AS value FROM scans`),
  };

  const feedRows = db
    .prepare(`${FEED_SELECT} ORDER BY s.id DESC LIMIT 40`)
    .all() as RawScanRow[];

  const incidentRows = db
    .prepare(
      `${FEED_SELECT} WHERE s.verdict = 'CLONE_DETECTED' ORDER BY s.id DESC LIMIT 12`
    )
    .all() as RawScanRow[];

  return NextResponse.json({
    generated_at: new Date().toISOString(),
    kpis,
    feed: feedRows.map(withDistance),
    incidents: incidentRows.map(withDistance),
  });
}
