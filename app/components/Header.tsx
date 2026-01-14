import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-[999] w-full bg-black/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

        {/* ✅ LOGO — NOW ACTUALLY LINKS HOME */}
        <Link href="/" aria-label="Go to homepage" className="shrink-0">
          <Image
            src="/via-logo-black.png"
            alt="VIA"
            width={120}
            height={40}
            priority
          />
        </Link>

        <nav className="flex items-center gap-4 sm:gap-6">
          <Link href="/for-stores" className="text-gray-300 hover:text-white">
            For Stores
          </Link>

          <Link
            href="/partner-with-us"
            className="text-gray-300 hover:text-white"
          >
            Partner with VIA
          </Link>

          <a
            href="https://viaplatform.carrd.co/"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-white text-black px-4 py-2 font-medium hover:bg-gray-200 transition"
          >
            Join Waitlist
          </a>
        </nav>

      </div>
    </header>
  );
}


