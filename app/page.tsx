import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <section className="bg-black text-white min-h-screen flex items-center">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">

        {/* LEFT: Text */}
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

          <p className="text-gray-300 max-w-md leading-relaxed mb-10">
            VIA lets you shop independent resale and vintage stores from across
            the country, all in one place. Browse multiple stores at once and
            discover unique pieces you won’t find anywhere else.
          </p>

          <div className="flex gap-4">
            <Link
              href="/stores"
              className="bg-white text-black px-6 py-3 rounded-full font-medium"
            >
              Browse Stores
            </Link>

            <Link
              href="/for-stores"
              className="border border-gray-500 px-6 py-3 rounded-full text-gray-200"
            >
              Partner with us
            </Link>
          </div>
        </div>

        {/* RIGHT: Image */}
        <div className="w-full">
          <Image
            src="/via-shoes.png"
            alt="Vintage shoes"
            width={600}
            height={520}
            className="w-full h-[520px] object-cover rounded-lg"
            priority
          />
        </div>

      </div>
    </section>
  );
}
