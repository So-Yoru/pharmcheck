# PharmCheck — Anti-Counterfeit Medicine Surveillance Platform

A full-stack prototype that fights counterfeit medicines with serialized
regulation-grade QR + scratch-PIN verification, impossible-transit clone
detection, and a live government enforcement dashboard.

Built with **Next.js 15 (App Router, TypeScript) · Tailwind CSS · Lucide
React · SQLite (better-sqlite3) · html5-qrcode**.

Three surfaces, one registry:

| Route | Audience | What it does |
| --- | --- | --- |
| `/scan` | Consumers | Scans/pastes a box serial, enters the 6-character scratch PIN, and gets an instant authenticity verdict — including candidate clone alerts with computed transit velocity. |
| `/admin` | Regulators | Live surveillance dashboard: KPIs, fraud anomaly feed, and a geospatial incident map tracing clone transits between cities. |
| `/manufacturer` | Factories | Mints serialized units with hashed PINs and generates print-ready packaging labels (QR + scratch-off PIN panels). |

## How the anti-counterfeit engine works

Every medicine box is registered with a unique serial and a **SHA-256-hashed
6-character PIN** that is printed under a scratch-off panel — the plaintext
PIN never gets stored on the server.

When a scan is verified (`POST /api/verify`), the platform records the
device fingerprint, resolved city, and geolocation, then applies four rules:

| Verdict | Logic |
| --- | --- |
| `GENUINE_FIRST` | First legitimate scan → status upgraded to `CONSUMED` |
| `REPEAT_SAME_DEVICE` | Same device fingerprint seen before → benign re-scan |
| `CLONE_DETECTED` | Different device + Haversine distance and time-delta imply transit velocity above **120 km/h** → status set to `COMPROMISED` and an inspector dispatch notice is issued |
| `NOT_FOUND` / `INVALID_PIN` | Unregistered serial or mismatched scratch PIN → counterfeit attempt, logged to the fraud feed |

The demo scenario: a clone box was scanned in **New Delhi** 20 minutes
before you try to verify it in **Hyderabad** — 1,255 km apart, ~3,750 km/h of
implied transit speed. Physically impossible. Instant critical clone alert.

## Quick start

Prerequisites: **Node.js 20+** (tested on Node 22) and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — the SQLite database
(`pharmcheck.db`) is created and seeded automatically on first boot.

The demo box buttons at the bottom of `/scan` make testing instant:

1. **Load Authentic Box** (`SN-GEN-101` / `SAFE99`) → `GENUINE_FIRST`, green government-authenticated card.
2. **Load Clone Box** (`SN-CLONE-404` / `FAKE01`) → `CLONE_DETECTED`, red alert with impossible-transit stats and an enforcement notice.

> The camera tab needs the browser to be served from `localhost` or HTTPS,
> and permission to access the rear camera. Geolocation is used when
> granted; otherwise the platform falls back to Hyderabad coordinates
> (`17.385, 78.4867`) so the demo always works.

## Database

Single SQLite file (`pharmcheck.db`, gitignored), auto-migrated and seeded on
boot via `lib/db.ts`:

- **`medicines`** — serial, drug name, batch, mfg/expiry dates, SHA-256
  `pin_hash`, status (`AVAILABLE_FOR_SALE` / `CONSUMED` / `COMPROMISED`)
- **`scans`** — scan audit trail: device fingerprint, city, lat/lng,
  verdict, and computed `velocity_kmh`

API surface:

| Endpoint | Purpose |
| --- | --- |
| `POST /api/verify` | Core anti-counterfeit verification engine |
| `GET /api/admin/overview` | KPIs, anomaly feed, and clone incidents for the dashboard |
| `POST /api/mint` | Batch registration: mints serialized units, QR-payload data URLs, and PINs |

This is a prototype — data is simulated for demonstration only, not
affiliated with any real government authority.
