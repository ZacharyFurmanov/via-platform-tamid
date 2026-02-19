import Link from "next/link";
import Image from "next/image";

export const metadata = {
  title: "The Story Behind the Selection | VIA",
  description:
    "Why we chose each store on VIA. Read the stories behind the independent vintage and secondhand sellers we partner with.",
};

const stories = [
  {
    slug: "lei-vintage",
    store: "LEI Vintage",
    teaser:
      "Some brands start with a new collection. LEI started with a realization.",
    logo: "/stores/lei-vintage-logo.jpg",
    logoBg: "#ffffff",
  },
  {
    slug: "vintage-archives-la",
    store: "Vintage Archives LA",
    teaser:
      "Dedicated to the art of curation, specializing in exceptional vintage designer shoes that feel as special as they are timeless.",
    logo: "/stores/vintage-archives-la-logo.jpg",
    logoBg: "#fdf8d8",
  },
  {
    slug: "ascensio-vintage",
    store: "Ascensio Vintage",
    teaser:
      "Championing timeless style that transcends the decades — authentic, high-quality vintage designer clothes sourced with intention.",
    logo: "/stores/ascensio-vintage-logo.jpg",
    logoBg: "#ffffff",
  },
];

export default function StoriesPage() {
  return (
    <main className="bg-white min-h-screen text-black">
      {/* Header */}
      <section className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-16 sm:py-24">
          <p className="text-xs uppercase tracking-[0.25em] text-neutral-500 mb-4">
            The Story Behind the Selection
          </p>
          <h1 className="text-3xl sm:text-5xl font-serif mb-4">
            Why we chose them
          </h1>
          <p className="max-w-2xl text-neutral-600 text-base sm:text-lg">
            Every store on VIA has a story worth telling. Here&apos;s why we selected
            each one.
          </p>
        </div>
      </section>

      {/* Stories grid */}
      <section className="py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 sm:gap-12">
            {stories.map((story) => (
              <Link
                key={story.slug}
                href={`/stories/${story.slug}`}
                className="group block text-center"
              >
                <div
                  className="relative w-44 h-24 sm:w-48 sm:h-28 mx-auto mb-5 rounded-sm overflow-hidden"
                  style={{ backgroundColor: story.logoBg }}
                >
                  <Image
                    src={story.logo}
                    alt={story.store}
                    fill
                    sizes="192px"
                    className="object-contain p-2"
                  />
                </div>
                <p className="text-sm text-neutral-600 leading-relaxed mb-3">
                  {story.teaser}
                </p>
                <span className="inline-block text-xs uppercase tracking-[0.15em] text-neutral-500 group-hover:text-black transition">
                  Read Story &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
