import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb, sha256 } from "@/lib/db";
import type { MedicineRow, ScanRow } from "@/lib/db";
import { haversineKm, resolveCity } from "@/lib/cities";
import { parseSqliteUtc } from "@/lib/time";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FALLBACK_LAT = 17.385;
const FALLBACK_LNG = 78.4867;
const VELOCITY_THRESHOLD_KMH = 120;
const VERIFIED_VERDICTS = "('GENUINE_FIRST','REPEAT_SAME_DEVICE','CLONE_DETECTED')";

interface VerifyPayload {
  serial_number?: unknown;
  pin?: unknown;
  lat?: unknown;
  lng?: unknown;
  device_id?: unknown;
}

function logScan(
  serialNumber: string,
  deviceId: string,
  city: string,
  lat: number,
  lng: number,
  verdict: string,
  velocityKmh: number
): void {
  getDb()
    .prepare(
      `
    INSERT INTO scans
      (serial_number, device_fingerprint, city, lat, lng, verdict, velocity_kmh)
    VALUES
      (?, ?, ?, ?, ?, ?, ?)
  `
    )
    .run(serialNumber, deviceId, city, lat, lng, verdict, velocityKmh);
}

export async function POST(request: NextRequest) {
  let payload: VerifyPayload;
  try {
    payload = (await request.json()) as VerifyPayload;
  } catch {
    return NextResponse.json(
      { status: "BAD_REQUEST", message: "Malformed request body." },
      { status: 400 }
    );
  }

  const serialNumber =
    typeof payload.serial_number === "string"
      ? payload.serial_number.trim().toUpperCase()
      : "";
  const pin = typeof payload.pin === "string" ? payload.pin.trim() : "";

  if (!serialNumber || pin.length < 4) {
    return NextResponse.json(
      {
        status: "BAD_REQUEST",
        message: "A serial number and a valid scratch PIN are required.",
      },
      { status: 400 }
    );
  }

  const rawLat = Number(payload.lat);
  const rawLng = Number(payload.lng);
  const lat =
    Number.isFinite(rawLat) && Math.abs(rawLat) <= 90 ? rawLat : FALLBACK_LAT;
  const lng =
    Number.isFinite(rawLng) && Math.abs(rawLng) <= 180 ? rawLng : FALLBACK_LNG;
  const deviceId =
    typeof payload.device_id === "string" && payload.device_id.trim()
      ? payload.device_id.trim().slice(0, 128)
      : "anonymous-device";
  const currentCity = resolveCity(lat, lng);

  const db = getDb();
  const medicine = db
    .prepare(`SELECT * FROM medicines WHERE serial_number = ?`)
    .get(serialNumber) as MedicineRow | undefined;

  if (!medicine) {
    logScan(serialNumber, deviceId, currentCity, lat, lng, "NOT_FOUND", 0);
    return NextResponse.json({
      status: "NOT_FOUND",
      message: "Counterfeit: Unregistered Serial Number",
      current_city: currentCity,
    });
  }

  if (sha256(pin) !== medicine.pin_hash) {
    logScan(serialNumber, deviceId, currentCity, lat, lng, "INVALID_PIN", 0);
    return NextResponse.json({
      status: "INVALID_PIN",
      message: "Tampered or Incorrect Scratch PIN",
      drug_name: medicine.drug_name,
      batch_no: medicine.batch_no,
      current_city: currentCity,
    });
  }

  const previous = db
    .prepare(
      `
      SELECT * FROM scans
      WHERE serial_number = ? AND verdict IN ${VERIFIED_VERDICTS}
      ORDER BY id DESC
      LIMIT 1
    `
    )
    .get(serialNumber) as ScanRow | undefined;

  if (!previous) {
    logScan(serialNumber, deviceId, currentCity, lat, lng, "GENUINE_FIRST", 0);
    db.prepare(
      `UPDATE medicines SET status = 'CONSUMED' WHERE serial_number = ?`
    ).run(serialNumber);
    return NextResponse.json({
      status: "GENUINE_FIRST",
      drug_name: medicine.drug_name,
      batch_no: medicine.batch_no,
      exp_date: medicine.exp_date,
      current_city: currentCity,
      message: "Authentic & Safe to Consume",
    });
  }

  if (previous.device_fingerprint === deviceId) {
    logScan(
      serialNumber,
      deviceId,
      currentCity,
      lat,
      lng,
      "REPEAT_SAME_DEVICE",
      0
    );
    return NextResponse.json({
      status: "REPEAT_SAME_DEVICE",
      drug_name: medicine.drug_name,
      batch_no: medicine.batch_no,
      exp_date: medicine.exp_date,
      prev_city: previous.city,
      current_city: currentCity,
      prev_scanned_at: previous.scanned_at,
      message: "Verified previously by this device",
    });
  }

  const distanceKm = haversineKm(lat, lng, previous.lat, previous.lng);
  const deltaMs = Math.max(
    Date.now() - parseSqliteUtc(previous.scanned_at),
    1000
  );
  const deltaHours = deltaMs / 3_600_000;
  const velocity = distanceKm / deltaHours;

  if (velocity > VELOCITY_THRESHOLD_KMH) {
    logScan(
      serialNumber,
      deviceId,
      currentCity,
      lat,
      lng,
      "CLONE_DETECTED",
      velocity
    );
    db.prepare(
      `UPDATE medicines SET status = 'COMPROMISED' WHERE serial_number = ?`
    ).run(serialNumber);
    return NextResponse.json({
      status: "CLONE_DETECTED",
      velocity: velocity.toFixed(1),
      distance_km: Number(distanceKm.toFixed(1)),
      prev_city: previous.city,
      current_city: currentCity,
      prev_scanned_at: previous.scanned_at,
      drug_name: medicine.drug_name,
      batch_no: medicine.batch_no,
      message:
        "Critical Clone Alert: Impossible physical transit velocity detected.",
    });
  }

  logScan(
    serialNumber,
    deviceId,
    currentCity,
    lat,
    lng,
    "REPEAT_SAME_DEVICE",
    velocity
  );
  return NextResponse.json({
    status: "REPEAT_SAME_DEVICE",
    velocity: velocity.toFixed(1),
    distance_km: Number(distanceKm.toFixed(1)),
    prev_city: previous.city,
    current_city: currentCity,
    prev_scanned_at: previous.scanned_at,
    drug_name: medicine.drug_name,
    batch_no: medicine.batch_no,
    exp_date: medicine.exp_date,
    message:
      "Verified previously on another device - transit velocity within plausible range",
  });
}
