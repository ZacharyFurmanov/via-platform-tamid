import Link from "next/link";
import FAQAccordion from "./components/FAQAccordion";
import Image from "next/image";
import ScrollReveal from "./components/ScrollReveal";
import SmoothScroll from "./components/SmoothScroll";
import StoreCarousel from "./components/StoreCarousel";
import StoriesHero from "./components/StoriesHero";
import NewArrivalsSection from "./components/NewArrivalsSection";
import BrandsSection from "./components/BrandsSection";
import { Suspense } from "react";

export default function HomePage() {
  return (
    <main className="w-full">
      <SmoothScroll />
{/* ================= HERO ================= */}
<section className="relative min-h-[70vh] sm:min-h-screen flex items-center overflow-hidden">

  {/* Background image */}
  <div className="absolute inset-0">
    <Image
      src="/hero-v3.jpeg"
      alt="VIA curated vintage"
      fill
      priority
      className="object-cover object-top md:object-center"
    />
    <div className="absolute inset-0 bg-black/30" />
  </div>

  {/* Content wrapper */}
  <div className="relative z-10 w-full">
    <div className="max-w-7xl mx-auto px-6 text-center">
      <div className="max-w-3xl mx-auto animate-hero">

        <h1 className="text-3xl sm:text-6xl md:text-[4.25rem] font-serif mb-4 sm:mb-6 text-white leading-tight">
          Curated by the <em>obsessed</em>,{"\n"}not the algorithm.
        </h1>

        <p className="max-w-xl mx-auto mb-6 sm:mb-10 text-sm sm:text-base text-white/80">
          Shop the recommendations of the world&apos;s most trusted vintage and secondhand stores.
        </p>

        {/* CTA button */}
        <div className="animate-hero delay-150">
          <Link
            href="/stores"
            className="inline-block bg-white px-10 sm:px-14 py-3.5 sm:py-4 text-xs sm:text-sm uppercase tracking-[0.15em] hover:bg-neutral-100 transition-all duration-300 text-black text-center"
          >
            Shop Stores
          </Link>
        </div>

      </div>
    </div>
  </div>
</section>

     {/* ================= SHOP BY STORE ================= */}
<section className="bg-white py-16 sm:py-24">
  <div className="max-w-7xl mx-auto">
    <ScrollReveal>
      <div className="px-6 mb-10 sm:mb-14">
        <div className="flex items-center gap-4 mb-1">
          <p className="text-lg sm:text-xl font-serif italic text-black/80">Shop by</p>
          <div className="flex-1 h-px bg-neutral-200" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-5xl sm:text-7xl md:text-8xl font-serif text-black/10 leading-none -mt-2">
            Store
          </h2>
          <Link
            href="/stores"
            className="mt-2 sm:mt-0 text-sm uppercase tracking-[0.15em] hover:text-black/60 transition-colors min-h-[44px] flex items-center"
          >
            Shop All Stores
          </Link>
        </div>
      </div>
    </ScrollReveal>

    <StoreCarousel />
  </div>
</section>

    {/* ================= SHOP BY CATEGORY ================= */}
<section className="bg-white py-16 sm:py-24 border-t border-neutral-100">
  <div className="max-w-7xl mx-auto">
    <ScrollReveal>
      <div className="px-6 mb-10 sm:mb-14">
        <div className="flex items-center gap-4 mb-1">
          <p className="text-lg sm:text-xl font-serif italic text-black/80">Shop by</p>
          <div className="flex-1 h-px bg-neutral-200" />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-5xl sm:text-7xl md:text-8xl font-serif text-black/10 leading-none -mt-2">
            Category
          </h2>
          <Link
            href="/categories"
            className="mt-2 sm:mt-0 text-sm uppercase tracking-[0.15em] hover:text-black/60 transition-colors min-h-[44px] flex items-center"
          >
            Shop All Categories
          </Link>
        </div>
      </div>
    </ScrollReveal>

    <div className="overflow-x-auto sm:overflow-visible pb-4 sm:pb-0 scrollbar-hide touch-pan-x [&_img]:select-none [&_img]:pointer-events-none">
      <div className="flex gap-4 pl-6 pr-6 sm:px-6 sm:grid sm:grid-cols-2 md:grid-cols-4 sm:gap-6">
        {[
          { label: "Clothing", slug: "clothing", image: "/categories/clothes.jpg" },
          { label: "Bags", slug: "bags", image: "/categories/bags.jpg" },
          { label: "Shoes", slug: "shoes", image: "/categories/shoes.jpg" },
          { label: "Accessories", slug: "accessories", image: "/categories/accessories.jpg" },
        ].map((category, i) => (
          <ScrollReveal key={category.slug} delay={i * 150}>
            <Link
              href={`/categories/${category.slug}`}
              className="group block w-[72vw] flex-shrink-0 sm:w-auto"
            >
              <div className="aspect-square relative overflow-hidden mb-4 bg-neutral-50 rounded-sm">
                <Image
                  src={category.image}
                  alt={category.label}
                  fill
                  sizes="(min-width: 768px) 25vw, 72vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>
              <p className="text-xs text-neutral-400 text-center mb-1 italic">Shop</p>
              <h3 className="text-xl sm:text-2xl font-serif text-black text-center">
                {category.label}
              </h3>
            </Link>
          </ScrollReveal>
        ))}
      </div>
    </div>
  </div>
</section>

      {/* ================= SHOP BY DESIGNER ================= */}
      <ScrollReveal>
        <Suspense>
          <BrandsSection />
        </Suspense>
      </ScrollReveal>

      {/* ================= NEW ARRIVALS ================= */}
      <ScrollReveal>
        <Suspense>
          <NewArrivalsSection />
        </Suspense>
      </ScrollReveal>

      {/* ================= STORY BEHIND THE SELECTION ================= */}
      <section className="bg-white py-16 sm:py-24 border-t border-neutral-100">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <div className="mb-10 sm:mb-14">
              <div className="flex items-center gap-4 mb-1">
                <p className="text-lg sm:text-xl font-serif italic text-black/80">Featured</p>
                <div className="flex-1 h-px bg-neutral-200" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between">
                <h2 className="text-5xl sm:text-7xl md:text-8xl font-serif text-black/10 leading-none -mt-2">
                  Stories
                </h2>
                <Link
                  href="/stories"
                  className="mt-2 sm:mt-0 text-sm uppercase tracking-[0.15em] hover:text-black/60 transition-colors min-h-[44px] flex items-center"
                >
                  View All Stories
                </Link>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={150}>
            <StoriesHero
              stories={[
                {
                  slug: "lei-vintage",
                  store: "LEI Vintage",
                  teaser: "Some brands start with a new collection. LEI started with a realization — the world doesn't need more clothes. It needs better choices.",
                  image: "/stores/LEI.jpg",
                  logo: "/stores/lei-vintage-logo.jpg",
                  logoBg: "#ffffff",
                },
                {
                  slug: "vintage-archives-la",
                  store: "Vintage Archives LA",
                  teaser: "Dedicated to the art of curation, specializing in exceptional vintage designer shoes that feel as special as they are timeless.",
                  image: "/stores/VintageArchivesLA.jpg",
                  logo: "/stores/vintage-archives-la-logo.jpg",
                  logoBg: "#fdf8d8",
                },
                {
                  slug: "scarz-vintage",
                  store: "SCARZ Vintage",
                  teaser: "Rooted in a love for timeless design and intentional sourcing — rare finds and standout runway pieces you won't see everywhere else.",
                  image: "/stores/scarz-vintage.jpg",
                  logo: "/stores/scarz-vintage-logo.jpg",
                  logoBg: "#ffffff",
                },
                {
                  slug: "missi-archives",
                  store: "Missi Archives",
                  teaser: "Inspired by early 2000s fashion, street style, and model off-duty looks — each piece hand-selected for individuality and timeless cool.",
                  image: "/stores/missi-archives.jpg",
                  logo: "/stores/missi-archives-logo.jpg",
                  logoBg: "#722f37",
                  logoDark: true,
                },
                {
                  slug: "ascensio-vintage",
                  store: "Ascensio Vintage",
                  teaser: "Championing timeless style that transcends the decades — celebrating the beauty of pre-loved and archival pieces from the most loved brands.",
                  image: "/stores/ascensio-vintage.jpg",
                  logo: "/stores/ascensio-vintage-logo.jpg",
                  logoBg: "#ffffff",
                },
              ]}
            />
          </ScrollReveal>
        </div>
      </section>

      {/* ================= FAQ TEASER ================= */}
      <section className="bg-white py-16 sm:py-24 border-t border-neutral-100">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="max-w-xl mb-12 sm:mb-16">
              <p className="text-lg sm:text-xl font-serif italic text-black/80 mb-4">
                Have questions?
              </p>
              <h2 className="text-3xl sm:text-4xl font-serif mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-neutral-500 text-sm sm:text-base">
                Everything you need to know about shopping, shipping,
                and how VIA works.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={150}>
          <FAQAccordion
            faqs={[
              {
                q: "Is everything authentic?",
                a: "Yes — we partner only with vetted stores known for authenticity and quality.",
              },
              {
                q: "Who handles shipping?",
                a: "Each store fulfills orders directly using their own shipping policies.",
              },
              {
                q: "What about returns?",
                a: "Return policies are set by each individual store and listed on their product pages.",
              },
              {
                q: "Where do you ship?",
                a: "Stores decide where they ship, but most stores ship worldwide.",
              },
            ]}
          />
          </ScrollReveal>

          <div className="mt-10 text-center">
            <Link
              href="/faqs"
              className="inline-block bg-black text-white px-10 py-3.5 text-sm uppercase tracking-[0.15em] hover:bg-black/85 transition"
            >
              Explore FAQs
            </Link>
          </div>
        </div>
      </section>

      {/* ================= VIA EXPERIENCE ================= */}
      <section className="bg-white py-16 sm:py-24 border-t border-neutral-100">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <ScrollReveal>
            <p className="text-lg sm:text-xl font-serif italic text-black/80 mb-4">
              The VIA Experience
            </p>

            <h2 className="text-3xl sm:text-4xl font-serif mb-4 sm:mb-6 text-black">
              A better way to shop vintage
            </h2>

            <p className="max-w-2xl mx-auto mb-12 sm:mb-16 text-neutral-500 text-sm sm:text-base">
              VIA brings together the best independent vintage and secondhand stores
              into one seamless browsing experience, while keeping checkout
              with the store you love.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            <ScrollReveal delay={0}>
              <h3 className="text-lg sm:text-xl font-serif mb-2 sm:mb-3 text-black">Browse across stores</h3>
              <p className="text-neutral-500 text-sm sm:text-base">
                Explore curated inventory from multiple stores at once.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={150}>
              <h3 className="text-lg sm:text-xl font-serif mb-2 sm:mb-3 text-black">Discover rare pieces</h3>
              <p className="text-neutral-500 text-sm sm:text-base">
                Find one-of-a-kind items you won&apos;t see everywhere else.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <h3 className="text-lg sm:text-xl font-serif mb-2 sm:mb-3 text-black">Checkout with confidence</h3>
              <p className="text-neutral-500 text-sm sm:text-base">
                Purchase directly from the original store, no middlemen.
              </p>
            </ScrollReveal>
          </div>

        </div>
      </section>

    </main>
  );
}
