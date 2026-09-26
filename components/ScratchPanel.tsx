"use client";

import { useState } from "react";
import { KeyRound, Sparkles } from "lucide-react";

export default function ScratchPanel({ pin }: { pin: string }) {
  const [revealed, setRevealed] = useState(false);

  if (revealed) {
    return (
      <div className="animate-pc-fade-up flex items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-slate-950 px-3.5 py-3">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-emerald-400" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Scratch PIN
          </span>
        </div>
        <span className="font-mono text-lg font-bold tracking-[0.35em] text-emerald-300">
          {pin}
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setRevealed(true)}
      title="Click to simulate scratching the panel"
      className="group relative w-full overflow-hidden rounded-xl border border-slate-600/70 bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500 px-3.5 py-3 text-left transition hover:from-slate-200 hover:via-slate-300 hover:to-slate-400"
    >
      <span
        aria-hidden
        className="absolute inset-0 opacity-40 [background-image:repeating-linear-gradient(115deg,rgba(255,255,255,0.65)_0px,rgba(255,255,255,0.65)_2px,transparent_2px,transparent_7px)]"
      />
      <span className="relative flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-slate-700">
          <Sparkles className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Scratch to reveal PIN
          </span>
        </span>
        <span className="font-mono text-sm font-bold tracking-[0.35em] text-slate-600">
          {"\u2022\u2022\u2022\u2022\u2022\u2022"}
        </span>
      </span>
    </button>
  );
}
