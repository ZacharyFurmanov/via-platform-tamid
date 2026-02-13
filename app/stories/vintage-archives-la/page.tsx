import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "Vintage Archives LA — The Story Behind the Selection | VIA",
  description:
    "Why we chose Vintage Archives LA for VIA. Dedicated to the art of curation, specializing in exceptional vintage designer shoes.",
};

export default function VintageArchivesLAStory() {
  return (
    <main className="bg-white min-h-screen text-black">
      {/* Back nav */}
      <div className="max-w-3xl mx-auto px-6 pt-8 pb-4">
        <Link
          href="/stories"
          className="inline-block text-xs tracking-[0.25em] uppercase text-neutral-500 hover:text-black transition"
        >
          &larr; All Stories
        </Link>
      </div>

      {/* Hero image */}
      <div className="max-w-4xl mx-auto px-6 mb-12">
        <div className="aspect-[16/9] relative overflow-hidden rounded-sm">
          <Image
            src="/stores/VintageArchivesLA.jpg"
            alt="Vintage Archives LA"
            fill
            priority
            className="object-cover"
          />
        </div>
      </div>

      {/* Article */}
      <article className="max-w-3xl mx-auto px-6 pb-24">
        <p className="text-xs uppercase tracking-[0.25em] text-neutral-500 mb-4">
          The Story Behind the Selection
        </p>

        <h1 className="text-3xl sm:text-5xl font-serif mb-8 leading-tight">
          Vintage Archives LA
        </h1>

        <div className="prose prose-lg max-w-none text-neutral-700 leading-relaxed space-y-6">
          <p>
            Born from a lifelong love of vintage shopping and the thrill of
            uncovering something truly rare, Vintage Archives LA is dedicated to
            the art of curation. Each piece is selected with intention, focusing
            on exceptional vintage designer shoes that feel as special as they
            are timeless.
          </p>

          <p>
            From iconic Chanel heels to Carrie Bradshaw inspired Manolo
            Blahnik&apos;s, every pair is chosen for its craftsmanship, heritage,
            and quiet confidence. These are not just accessories&mdash;they&apos;re
            statement pieces. Elegant, premium finds that carry history while
            fitting seamlessly into a luxury lifestyle.
          </p>

          <p>
            At its core, Vintage Archives LA is about honoring what already
            exists. By giving beautiful designer shoes a second life, the brand
            champions sustainability without sacrificing style. Every pair tells
            a story, waiting to become part of yours.
          </p>

          <p className="font-serif text-black text-xl">
            VIA can&apos;t wait for you to find truly special, one of a kind,
            shoes from Vintage Archives LA.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-12 pt-8 border-t border-neutral-200">
          <Link
            href="/stores/vintage-archives-la"
            className="inline-block bg-black text-white px-8 py-4 text-sm uppercase tracking-wide hover:bg-neutral-800 transition"
          >
            Shop Vintage Archives LA
          </Link>
        </div>
      </article>
    </main>
  );
}
