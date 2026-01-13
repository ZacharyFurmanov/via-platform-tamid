import Image from "next/image";
import Link from "next/link";
import "./globals.css";
import { Cormorant_Garamond } from "next/font/google";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-cormorant",
});

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VIA",
  description: "Curated vintage & resale, nationwide.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`bg-black text-white ${cormorant.className}`}>
        {/* HEADER */}
        <header className="w-full border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            {/* Logo */}
            <Link href="/">
              <Image
                src="/via-logo-black.png"
                alt="VIA logo"
                width={120}
                height={40}
                priority
              />
            </Link>

            {/* Nav */}
            <nav className="flex items-center gap-6">
              <Link
                href="/for-stores"
                className="text-gray-300 hover:text-white transition"
              >
                For Stores
              </Link>

              <a
                href="https://forms.gle/rNWypufodudZe46MA"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-white text-black px-5 py-2 font-medium hover:bg-gray-200 transition"
              >
                Join Waitlist
              </a>
            </nav>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="snap-y snap-mandatory">
  {children}
</main>

        {/* FOOTER */}
        <footer className="border-t border-gray-800 mt-24 py-8 text-sm text-gray-400">
          <div className="max-w-7xl mx-auto px-6 flex justify-between">
            <span>VIA 2026 — Curated vintage & resale, nationwide.</span>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white"
            >
              Instagram
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
