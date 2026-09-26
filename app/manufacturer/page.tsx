"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  BadgeCheck,
  Boxes,
  Factory,
  FlaskConical,
  Loader2,
  Printer,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import ScratchPanel from "@/components/ScratchPanel";
import type { MintResponse } from "@/lib/types";

const MAX_QUANTITY = 40;

export default function ManufacturerPage() {
  const [drugName, setDrugName] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [expDate, setExpDate] = useState("");
  const [quantity, setQuantity] = useState("6");
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minted, setMinted] = useState<MintResponse | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleMint = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const parsedQuantity = Number(quantity);

    if (!drugName.trim() || !batchNo.trim() || !expDate) {
      setError("Drug name, batch number and expiry date are required.");
      return;
    }
    if (
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity < 1 ||
      parsedQuantity > MAX_QUANTITY
    ) {
      setError(`Quantity must be between 1 and ${MAX_QUANTITY} units.`);
      return;
    }

    setMinting(true);
    setMinted(null);
    try {
      const response = await fetch("/api/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          drug_name: drugName.trim(),
          batch_no: batchNo.trim(),
          exp_date: expDate,
          quantity: parsedQuantity,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? "Minting failed.");
      }
      setMinted(payload as MintResponse);
      requestAnimationFrame(() =>
        previewRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Minting failed - try again."
      );
    } finally {
      setMinting(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
            <Factory className="h-3.5 w-3.5" />
            Factory Minting Console
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-50">
            Batch Registration &amp; Serialization
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Mint serialized units with sealed scratch PINs and print-ready QR
            packaging labels for distribution.
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-5 print:hidden">
        <form onSubmit={handleMint} className="pc-card space-y-5 p-5 lg:col-span-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="drug" className="pc-label">
                Drug Name
              </label>
              <input
                id="drug"
                value={drugName}
                onChange={(event) => setDrugName(event.target.value)}
                placeholder="e.g. Azithromycin 250mg"
                autoComplete="off"
                className="pc-input"
              />
            </div>
            <div>
              <label htmlFor="batch" className="pc-label">
                Batch Number
              </label>
              <input
                id="batch"
                value={batchNo}
                onChange={(event) => setBatchNo(event.target.value)}
                placeholder="e.g. B-2026-K"
                autoComplete="off"
                spellCheck={false}
                className="pc-input font-mono uppercase"
              />
            </div>
            <div>
              <label htmlFor="expiry" className="pc-label">
                Expiry Date
              </label>
              <input
                id="expiry"
                type="date"
                value={expDate}
                onChange={(event) => setExpDate(event.target.value)}
                className="pc-input [color-scheme:dark]"
              />
            </div>
            <div>
              <label htmlFor="quantity" className="pc-label">
                Quantity (serialized units)
              </label>
              <input
                id="quantity"
                type="number"
                min={1}
                max={MAX_QUANTITY}
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="pc-input tabular-nums"
              />
            </div>
            <div className="flex items-end">
              <p className="text-[11px] leading-relaxed text-slate-500">
                Manufacturing date is stamped automatically. Each unit receives
                a unique serial, a sealed 6-character PIN and a public QR
                payload.
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-200">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={minting}
            className="pc-btn-primary w-full"
          >
            {minting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Minting serialized units...
              </>
            ) : (
              <>
                <FlaskConical className="h-4 w-4" />
                Mint Batch
              </>
            )}
          </button>
        </form>

        <aside className="pc-card space-y-4 p-5 lg:col-span-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Serialization Pipeline
            </h2>
          </div>
          <ul className="space-y-3 text-xs leading-relaxed text-slate-400">
            <li className="flex gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-300">
                1
              </span>
              Each unit is written to the SQLite registry with a SHA-256
              hashed PIN - the plaintext PIN never touches the database.
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-300">
                2
              </span>
              QR payloads encode the serial and batch so the consumer scanner
              resolves the record instantly.
            </li>
            <li className="flex gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-300">
                3
              </span>
              Labels below are print-ready - use the Print button to export the
              packaging sheet.
            </li>
          </ul>
        </aside>
      </div>

      {minted && (
        <section ref={previewRef} className="space-y-5 scroll-mt-24">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Boxes className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                Serialized Packaging · {minted.batch_no} · {minted.quantity}{" "}
                unit{minted.quantity === 1 ? "" : "s"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="pc-btn-ghost print:hidden"
            >
              <Printer className="h-4 w-4" />
              Print Labels
            </button>
          </div>

          <div className="animate-pc-fade-up grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {minted.items.map((item) => (
              <article
                key={item.serial_number}
                className="pc-label-card break-inside-avoid rounded-2xl border border-slate-700 bg-slate-950/70 p-4"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600">
                      <ShieldCheck className="h-4 w-4 text-slate-950" />
                    </span>
                    <div className="leading-tight">
                      <p className="text-xs font-bold text-slate-100">
                        PharmCheck
                      </p>
                      <p className="text-[9px] uppercase tracking-[0.18em] text-emerald-400/80">
                        Certified Batch
                      </p>
                    </div>
                  </div>
                  <BadgeCheck className="h-4 w-4 text-emerald-400" />
                </div>

                <div className="mt-3">
                  <p className="text-sm font-bold uppercase text-slate-50">
                    {item.drug_name}
                  </p>
                  <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-slate-400">
                    <p>
                      Batch{" "}
                      <span className="font-mono font-semibold text-slate-200">
                        {item.batch_no}
                      </span>
                    </p>
                    <p>
                      Exp{" "}
                      <span className="font-mono font-semibold text-slate-200">
                        {item.exp_date}
                      </span>
                    </p>
                    <p>
                      Mfg{" "}
                      <span className="font-mono font-semibold text-slate-200">
                        {item.mfg_date}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={item.qr_data_url}
                    alt={`QR code for ${item.serial_number}`}
                    width={84}
                    height={84}
                    className="rounded-lg border border-slate-700 bg-white p-1"
                  />
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                      Serial Number
                    </p>
                    <p className="break-all font-mono text-[11px] font-semibold text-slate-100">
                      {item.serial_number}
                    </p>
                    <p className="mt-1 text-[9px] text-slate-500">
                      Scan the QR and enter the sealed PIN to verify.
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <ScratchPanel pin={item.pin} />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
