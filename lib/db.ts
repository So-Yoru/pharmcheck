import crypto from "crypto";
import path from "path";
import Database from "better-sqlite3";

export interface MedicineRow {
  serial_number: string;
  drug_name: string;
  batch_no: string;
  mfg_date: string;
  exp_date: string;
  pin_hash: string;
  status: string;
}

export interface ScanRow {
  id: number;
  serial_number: string;
  device_fingerprint: string;
  city: string;
  lat: number;
  lng: number;
  scanned_at: string;
  verdict: string;
  velocity_kmh: number;
}

const globalForDb = globalThis as unknown as {
  __pharmcheckDb?: Database.Database;
};

export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function migrate(database: Database.Database): void {
  database.pragma("busy_timeout = 5000");
  database.pragma("journal_mode = WAL");
  database.exec(`
    CREATE TABLE IF NOT EXISTS medicines (
      serial_number TEXT PRIMARY KEY,
      drug_name TEXT NOT NULL,
      batch_no TEXT NOT NULL,
      mfg_date TEXT NOT NULL,
      exp_date TEXT NOT NULL,
      pin_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'AVAILABLE_FOR_SALE'
    );
  `);
  database.exec(`
    CREATE TABLE IF NOT EXISTS scans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      serial_number TEXT NOT NULL,
      device_fingerprint TEXT NOT NULL DEFAULT 'unknown-device',
      city TEXT NOT NULL DEFAULT 'Unknown',
      lat REAL,
      lng REAL,
      scanned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      verdict TEXT NOT NULL,
      velocity_kmh REAL NOT NULL DEFAULT 0
    );
  `);
  database.exec(
    `CREATE INDEX IF NOT EXISTS idx_scans_serial ON scans (serial_number, id DESC);`
  );
  database.exec(
    `CREATE INDEX IF NOT EXISTS idx_scans_verdict ON scans (verdict);`
  );
}

function seed(database: Database.Database): void {
  const insertMedicine = database.prepare(`
    INSERT OR IGNORE INTO medicines
      (serial_number, drug_name, batch_no, mfg_date, exp_date, pin_hash, status)
    VALUES
      (@serial_number, @drug_name, @batch_no, @mfg_date, @exp_date, @pin_hash, @status)
  `);

  insertMedicine.run({
    serial_number: "SN-GEN-101",
    drug_name: "Amoxicillin 500mg",
    batch_no: "B-2026-X",
    mfg_date: "2026-03-04",
    exp_date: "2028-03-03",
    pin_hash: sha256("SAFE99"),
    status: "AVAILABLE_FOR_SALE",
  });

  insertMedicine.run({
    serial_number: "SN-CLONE-404",
    drug_name: "Azithromycin 250mg",
    batch_no: "B-9981-C",
    mfg_date: "2025-11-03",
    exp_date: "2027-11-02",
    pin_hash: sha256("FAKE01"),
    status: "AVAILABLE_FOR_SALE",
  });

  const existingSeedScan = database
    .prepare(
      `SELECT COUNT(*) AS count FROM scans WHERE serial_number = ? AND device_fingerprint = ?`
    )
    .get("SN-CLONE-404", "seed-import-terminal-nd01") as { count: number };

  if (existingSeedScan.count === 0) {
    database
      .prepare(
        `
        INSERT INTO scans
          (serial_number, device_fingerprint, city, lat, lng, scanned_at, verdict, velocity_kmh)
        VALUES
          (?, ?, ?, ?, ?, datetime('now', '-20 minutes'), 'GENUINE_FIRST', 0)
      `
      )
      .run(
        "SN-CLONE-404",
        "seed-import-terminal-nd01",
        "New Delhi",
        28.6139,
        77.209
      );
  }
}

function createConnection(): Database.Database {
  const databasePath = path.join(process.cwd(), "pharmcheck.db");
  const database = new Database(databasePath);
  migrate(database);
  seed(database);
  return database;
}

export function getDb(): Database.Database {
  if (!globalForDb.__pharmcheckDb) {
    globalForDb.__pharmcheckDb = createConnection();
  }
  return globalForDb.__pharmcheckDb;
}
