import Link from "next/link";
import Image from "next/image";
import StoriesHero from "./StoriesHero";

export const metadata = {
  title: "The Story Behind the Selection | VIA",
  description:
    "Why we chose each store on VIA. Read the stories behind the independent vintage and resale sellers we partner with.",
};

const stories = [
  {
    slug: "lei-vintage",
    store: "LEI Vintage",
    teaser:
      "Some brands start with a new collection. LEI started with a realization.",
    image: "/stores/LEI.jpg",
  },
  {
    slug: "vintage-archives-la",
    store: "Vintage Archives LA",
    teaser:
      "Dedicated to the art of curation, specializing in exceptional vintage designer shoes that feel as special as they are timeless.",
    image: "/stores/VintageArchivesLA.jpg",
  },
];

export default function StoriesPage() {
  return (
    <main className="bg-white min-h-screen text-black">
      {/* Scrolling hero */}
      <StoriesHero stories={stories} />

      {/* Stories grid */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12">
            {stories.map((story) => (
              <Link
                key={story.slug}
                href={`/stories/${story.slug}`}
                className="group block"
              >
                <div className="aspect-[4/5] relative overflow-hidden mb-4 rounded-sm">
                  <Image
                    src={story.image}
                    alt={story.store}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition" />
                </div>
                <h2 className="text-xl sm:text-2xl font-serif text-black mb-2">
                  {story.store}
                </h2>
                <p className="text-sm text-neutral-600 leading-relaxed">
                  {story.teaser}
                </p>
                <span className="inline-block mt-3 text-xs uppercase tracking-[0.15em] text-neutral-500 group-hover:text-black transition">
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
