import crypto from "crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import QRCode from "qrcode";
import { getDb, sha256 } from "@/lib/db";
import type { MintedItem } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PIN_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MAX_QUANTITY = 40;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface MintPayload {
  drug_name?: unknown;
  batch_no?: unknown;
  exp_date?: unknown;
  quantity?: unknown;
}

function generatePin(): string {
  let pin = "";
  for (let index = 0; index < 6; index += 1) {
    pin += PIN_ALPHABET[crypto.randomInt(PIN_ALPHABET.length)];
  }
  return pin;
}

function generateSerial(batchCode: string): string {
  return `SN-${batchCode}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  let payload: MintPayload;
  try {
    payload = (await request.json()) as MintPayload;
  } catch {
    return NextResponse.json(
      { status: "BAD_REQUEST", message: "Malformed request body." },
      { status: 400 }
    );
  }

  const drugName =
    typeof payload.drug_name === "string" ? payload.drug_name.trim() : "";
  const batchNo =
    typeof payload.batch_no === "string"
      ? payload.batch_no.trim().toUpperCase()
      : "";
  const expDate =
    typeof payload.exp_date === "string" ? payload.exp_date.trim() : "";
  const requestedQuantity = Math.floor(Number(payload.quantity));

  if (!drugName || !batchNo || !DATE_PATTERN.test(expDate)) {
    return NextResponse.json(
      {
        status: "BAD_REQUEST",
        message:
          "Drug name, batch number and a valid expiry date (YYYY-MM-DD) are required.",
      },
      { status: 400 }
    );
  }

  if (!Number.isFinite(requestedQuantity) || requestedQuantity < 1) {
    return NextResponse.json(
      { status: "BAD_REQUEST", message: "Quantity must be at least 1." },
      { status: 400 }
    );
  }

  const quantity = Math.min(requestedQuantity, MAX_QUANTITY);
  const mfgDate = new Date().toISOString().slice(0, 10);
  const batchCode =
    batchNo.replace(/[^A-Z0-9]/g, "").slice(0, 8) || "BATCH";

  const db = getDb();
  const insertMedicine = db.prepare(`
    INSERT INTO medicines
      (serial_number, drug_name, batch_no, mfg_date, exp_date, pin_hash, status)
    VALUES
      (@serial_number, @drug_name, @batch_no, @mfg_date, @exp_date, @pin_hash, 'AVAILABLE_FOR_SALE')
  `);
  const serialExists = db.prepare(
    `SELECT 1 AS present FROM medicines WHERE serial_number = ?`
  );

  const minted: Array<{ serial_number: string; pin: string }> = [];
  const mintBatch = db.transaction(() => {
    for (let index = 0; index < quantity; index += 1) {
      let serialNumber = generateSerial(batchCode);
      let guard = 0;
      while (serialExists.get(serialNumber) && guard < 25) {
        serialNumber = generateSerial(batchCode);
        guard += 1;
      }
      const pin = generatePin();
      insertMedicine.run({
        serial_number: serialNumber,
        drug_name: drugName,
        batch_no: batchNo,
        mfg_date: mfgDate,
        exp_date: expDate,
        pin_hash: sha256(pin),
      });
      minted.push({ serial_number: serialNumber, pin });
    }
  });
  mintBatch();

  const items: MintedItem[] = await Promise.all(
    minted.map(async (entry) => ({
      serial_number: entry.serial_number,
      pin: entry.pin,
      drug_name: drugName,
      batch_no: batchNo,
      mfg_date: mfgDate,
      exp_date: expDate,
      qr_data_url: await QRCode.toDataURL(
        JSON.stringify({ s: entry.serial_number, b: batchNo }),
        {
          margin: 1,
          width: 240,
          errorCorrectionLevel: "M",
          color: { dark: "#020617", light: "#ffffff" },
        }
      ),
    }))
  );

  return NextResponse.json(
    {
      batch_no: batchNo,
      drug_name: drugName,
      mfg_date: mfgDate,
      exp_date: expDate,
      quantity: items.length,
      items,
    },
    { status: 201 }
  );
}
