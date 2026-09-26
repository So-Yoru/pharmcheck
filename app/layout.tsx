import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "PharmCheck | Anti-Counterfeit Medicine Surveillance",
  description:
    "Verify medicine authenticity, trace batch serials, and monitor counterfeit clone incidents across the national supply chain.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased">
        <Navbar />
        <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6">
          {children}
        </main>
        <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-600 print:hidden">
          PharmCheck prototype - simulated regulatory data for demonstration
          only.
        </footer>
      </body>
    </html>
  );
}
