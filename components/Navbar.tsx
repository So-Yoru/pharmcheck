"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Factory, LayoutDashboard, ScanLine, ShieldPlus } from "lucide-react";

const LINKS = [
  { href: "/scan", label: "Consumer App", icon: ScanLine },
  { href: "/admin", label: "Enforcement Portal", icon: LayoutDashboard },
  { href: "/manufacturer", label: "Factory Minting", icon: Factory },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl print:hidden">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/scan" className="group flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-glow transition-transform duration-200 group-hover:scale-105">
            <ShieldPlus className="h-5 w-5 text-slate-950" />
          </span>
          <span className="leading-tight">
            <span className="block text-base font-bold tracking-tight text-slate-50">
              PharmCheck
            </span>
            <span className="hidden text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-400/80 sm:block">
              Surveillance Grid
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
