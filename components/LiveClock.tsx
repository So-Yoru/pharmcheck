"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export default function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
      <Clock className="h-4 w-4 text-emerald-400" />
      <div className="leading-tight">
        <p className="font-mono text-sm font-semibold tabular-nums text-slate-100">
          {now
            ? now.toLocaleTimeString("en-IN", { hour12: false })
            : "--:--:--"}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-slate-500">
          {now
            ? now.toLocaleDateString("en-IN", {
                weekday: "short",
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "Syncing clock"}
        </p>
      </div>
    </div>
  );
}
