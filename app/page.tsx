import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <section className="min-h-screen bg-black text-white flex items-center">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div>
          <p className="text-sm tracking-widest text-gray-400 mb-6">
            SHOP CURATED & VINTAGE RESALE
          </p>

          <Image
            src="/via-logo-black.png"
            alt="VIA"
            width={240}
            height={80}
            className="mb-8"
            priority
          />

          <p className="text-gray-300 max-w-md mb-10">
            VIA lets you shop independent resale and vintage stores from across
            the country, all in one place.
          </p>

          <div className="flex gap-4">
            <Link href="/stores" className="bg-white text-black px-6 py-3 rounded-full">
              Browse Stores
            </Link>
            <Link href="/partner-with-us" className="border border-gray-600 px-6 py-3 rounded-full">
              Partner with us
            </Link>
          </div>
        </div>

        <Image
          src="/via-shoes.png"
          alt="Vintage shoes"
          width={600}
          height={520}
          className="rounded-lg"
        />
      </div>
    </section>
  );
}

