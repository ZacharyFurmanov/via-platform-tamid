import Link from "next/link";
import Image from "next/image";

export default function Header() {
  return (
    <header className="fixed top-0 z-50 w-full bg-black">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

        {/* LOGO */}
        <Link href="/" className="flex items-center">
          <Image
            src="/via-logo-white.png"
            alt="VIA"
            width={72}
            height={28}
            priority
          />
        </Link>

        {/* NAV */}
        <nav className="flex items-center gap-10 text-sm uppercase tracking-wide text-white/80">
          <Link href="/stores" className="hover:text-white transition">
            Stores
          </Link>

          <Link href="/categories" className="hover:text-white transition">
            Categories
          </Link>

          <Link href="/for-stores" className="hover:text-white transition">
            Partner With VIA
          </Link>
        </nav>
      </div>
    </header>
  );
}


