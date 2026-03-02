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
    <main className="bg-[#F7F3EA] min-h-screen text-[#5D0F17]">
      {/* Header */}
      <section className="border-b border-[#5D0F17]/10">
        <div className="max-w-7xl mx-auto px-6 py-16 sm:py-24">
          <div className="flex items-center gap-4 mb-1">
            <p className="text-lg sm:text-xl font-serif italic text-[#5D0F17]/70">Featured</p>
            <div className="flex-1 h-px bg-[#5D0F17]/15" />
          </div>
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-serif text-[#5D0F17]/10 leading-none -mt-2 mb-4">
            Stories
          </h1>
          <p className="max-w-2xl text-[#5D0F17]/60 text-base sm:text-lg">
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
                  className="relative w-48 h-24 sm:w-56 sm:h-28 mx-auto mb-5 overflow-hidden"
                >
                  <Image
                    src={story.logo}
                    alt={story.store}
                    fill
                    sizes="224px"
                    className="object-cover"
                  />
                </div>
                <p className="text-sm text-[#5D0F17]/60 leading-relaxed mb-3">
                  {story.teaser}
                </p>
                <span className="inline-block text-xs uppercase tracking-[0.15em] text-[#5D0F17]/50 group-hover:text-[#5D0F17] transition">
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
