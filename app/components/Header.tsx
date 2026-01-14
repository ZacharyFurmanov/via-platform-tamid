import Link from "next/link";
import Image from "next/image";

export default function Header() {
  return (
    <header className="sticky top-0 z-[100] w-full bg-black/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">

        {/* LOGO → HOME */}
        <Link href="/" className="shrink-0">
          <Image
            src="/via-logo-black.png"
            alt="VIA"
            width={120}
            height={40}
            priority
          />
        </Link>

        {/* NAV */}
        <nav className="flex items-center gap-4 sm:gap-6">

          {/* For Stores → INTERNAL */}
          <Link
            href="/for-stores"
            className="text-gray-300 hover:text-white transition text-sm sm:text-base"
          >
            For Stores
          </Link>

          {/* Partner with VIA → INTERNAL */}
          <Link
            href="/partner-with-us"
            className="text-gray-300 hover:text-white transition text-sm sm:text-base"
          >
            Partner with VIA
          </Link>

          {/* Join Waitlist → EXTERNAL */}
          <a
            href="https://viaplatform.carrd.co/"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-white text-black px-4 py-2 text-sm sm:px-5 sm:py-2 sm:text-base font-medium hover:bg-gray-200 transition"
          >
            Join Waitlist
          </a>

        </nav>
      </div>
    </header>
  );
}



