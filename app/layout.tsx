import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

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
        <header className="sticky top-0 z-50 w-full bg-black/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            
            {/* Logo */}
            <Link href="/" className="shrink-0">
              <Image
                src="/via-logo-black.png"
                alt="VIA logo"
                width={120}
                height={40}
                priority
                className="w-[100px] sm:w-[120px]"
              />
            </Link>

            {/* Nav */}
            <nav className="flex items-center gap-4 sm:gap-6">
              <Link
                href="/for-stores"
                className="text-gray-300 hover:text-white transition text-sm sm:text-base"
              >
                For Stores
              </Link>

              <a
                href="https://forms.gle/rNWypufodudZe46MA"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-white text-black px-4 py-2 text-sm sm:px-5 sm:py-2 sm:text-base font-medium hover:bg-gray-200 transition"
              >
                Join Waitlist
              </a>
            </nav>

          </div>
        </header>

        {/* PAGE CONTENT */}
        <main>
          {children}
        </main>

        {/* FOOTER */}
        <footer className="mt-24 py-8 text-sm text-gray-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row gap-4 sm:gap-0 items-center sm:items-center justify-between text-center sm:text-left">
            
            <span>
              © 2026 VIA — Curated vintage & resale, nationwide.
            </span>

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
