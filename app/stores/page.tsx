import Image from "next/image";
import Link from "next/link";

const stores = [
  {
    name: "No Standing NYC",
    slug: "no-standing-nyc",
    location: "New York, NY",
  },
];

export default function StoresPage() {
  return (
    <section className="py-16">
      {/* VIA LOGO */}
      <div className="mb-10 flex justify-center">
        <Image
          src="/via-logo-black.png"
          alt="VIA logo"
          width={160}
          height={60}
          priority
        />
      </div>

      <h1 className="text-4xl font-bold mb-10 text-center">
        Stores on VIA
      </h1>

      <div className="max-w-3xl mx-auto grid gap-6">
        {stores.map((store) => (
          <Link
            key={store.slug}
            href={`/stores/${store.slug}`}
            className="border border-gray-800 rounded-lg p-6 hover:border-white transition"
          >
            <h2 className="text-xl font-medium">{store.name}</h2>
            <p className="text-gray-400">{store.location}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
