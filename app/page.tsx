import Link from "next/link";
import FAQAccordion from "./components/FAQAccordion";
import Image from "next/image";
import ScrollReveal from "./components/ScrollReveal";
import SmoothScroll from "./components/SmoothScroll";
import StoreCarousel from "./components/StoreCarousel";
import StoriesHero from "./components/StoriesHero";
import NewArrivalsSection from "./components/NewArrivalsSection";
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
    <div className="absolute inset-0 bg-black/40" />
  </div>

  {/* Content wrapper */}
  <div className="relative z-10 w-full">
    <div className="max-w-7xl mx-auto px-6">
      <div className="max-w-2xl animate-hero">

        <h1 className="text-3xl sm:text-6xl md:text-[4.25rem] font-serif mb-4 sm:mb-8 text-white leading-tight">
          The home of curated vintage & secondhand.
        </h1>

        <p className="max-w-xl mb-6 sm:mb-10 text-sm sm:text-base text-gray-200">
          Discover and browse independent vintage and secondhand stores worldwide.
          The pieces you've been looking for, without the hunt. All trusted and verified stores.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 animate-hero delay-150">
          <Link
            href="/stores"
            className="bg-white px-8 sm:px-10 py-3 sm:py-4 text-xs sm:text-sm uppercase tracking-wide hover:bg-neutral-200 hover:scale-[1.02] transition-all duration-300 text-black text-center"
          >
            Explore Stores
          </Link>

          <Link
            href="/categories"
            className="border border-white text-white px-8 sm:px-10 py-3 sm:py-4 text-xs sm:text-sm uppercase tracking-wide hover:bg-white hover:text-black hover:scale-[1.02] transition-all duration-300 text-center"
          >
            Browse Categories
          </Link>

          <Link
            href="#new-arrivals"
            className="border border-white/50 text-white/90 px-8 sm:px-10 py-3 sm:py-4 text-xs sm:text-sm uppercase tracking-wide hover:bg-white hover:text-black hover:scale-[1.02] transition-all duration-300 text-center"
          >
            New Arrivals
          </Link>
        </div>

      </div>
    </div>
  </div>
</section>

     {/* ================= SHOP BY STORE ================= */}
<section className="bg-neutral-100 py-24 sm:py-40">
  <div className="max-w-7xl mx-auto">
    {/* Header */}
    <ScrollReveal>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-8 sm:mb-16 px-6">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-gray-500 mb-3 sm:mb-4">
            Selected by VIA
          </p>
          <h2 className="text-3xl sm:text-5xl font-serif text-black">
            Shop by Store
          </h2>
        </div>

        <Link
          href="/stores"
          className="mt-4 sm:mt-0 text-sm uppercase tracking-wide link-underline min-h-[44px] flex items-center"
        >
          View all stores
        </Link>
      </div>
    </ScrollReveal>

    <StoreCarousel />
  </div>
</section>

    {/* ================= SHOP BY CATEGORY ================= */}
<section className="bg-[#f1f0ed] py-24 sm:py-40">
  <div className="max-w-7xl mx-auto">
    <ScrollReveal>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-8 sm:mb-16 px-6">
        <div>
          <h2 className="text-3xl sm:text-5xl font-serif text-black">
            Shop by Category
          </h2>
        </div>

        <Link
          href="/categories"
          className="mt-4 sm:mt-0 text-sm uppercase tracking-wide link-underline min-h-[44px] flex items-center"
        >
          View all categories
        </Link>
      </div>
    </ScrollReveal>

    <div className="overflow-x-auto sm:overflow-visible pb-4 sm:pb-0 scrollbar-hide touch-pan-x [&_img]:select-none [&_img]:pointer-events-none">
      <div className="flex gap-4 pl-6 pr-6 sm:px-6 sm:grid sm:grid-cols-2 md:grid-cols-4 sm:gap-6">
        {[
          { label: "Clothes", slug: "clothes", image: "/categories/clothes.jpg" },
          { label: "Bags", slug: "bags", image: "/categories/bags.jpg" },
          { label: "Shoes", slug: "shoes", image: "/categories/shoes.jpg" },
          { label: "Accessories", slug: "accessories", image: "/categories/accessories.jpg" },
        ].map((category, i) => (
          <ScrollReveal key={category.slug} delay={i * 150}>
            <Link
              href={`/categories/${category.slug}`}
              className="group block w-[72vw] flex-shrink-0 sm:w-auto"
            >
              <div className="aspect-[3/4] relative overflow-hidden mb-3 sm:mb-4 rounded-sm">
                <Image
                  src={category.image}
                  alt={category.label}
                  fill
                  sizes="(min-width: 768px) 25vw, 72vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/15 group-hover:bg-black/25 transition-colors duration-500" />

                <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8">
                  <h3 className="text-xl sm:text-3xl font-serif text-white">
                    {category.label}
                  </h3>
                </div>
              </div>
            </Link>
          </ScrollReveal>
        ))}
      </div>
    </div>
  </div>
</section>

      {/* ================= NEW ARRIVALS ================= */}
      <ScrollReveal>
        <Suspense>
          <NewArrivalsSection />
        </Suspense>
      </ScrollReveal>

      {/* ================= FAQ TEASER ================= */}
      <section className="bg-[#f7f6f3] py-24 sm:py-40">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-12 sm:mb-20">
              <div className="max-w-xl">
                <p className="text-xs uppercase tracking-[0.25em] text-gray-500 mb-3 sm:mb-4">
                  Have questions?
                </p>

                <h2 className="text-3xl sm:text-5xl font-serif mb-4 sm:mb-6">
                  Frequently Asked Questions
                </h2>

                <p className="text-gray-700 text-sm sm:text-base">
                  Everything you need to know about shopping, shipping,
                  and how VIA works.
                </p>
              </div>

              <div className="mt-6 md:mt-2">
                <Link
                  href="/faqs"
                  className="inline-flex items-center justify-center border border-black px-6 py-3 min-h-[48px] text-sm uppercase tracking-wide hover:bg-black hover:text-white transition"
                >
                  Explore FAQs
                </Link>
              </div>
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
        </div>
      </section>

      {/* ================= STORY BEHIND THE SELECTION ================= */}
      <section className="bg-neutral-100 py-24 sm:py-40">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-8 sm:mb-16">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-gray-500 mb-3 sm:mb-4">
                  The Story Behind the Selection
                </p>
                <h2 className="text-3xl sm:text-5xl font-serif text-black">
                  Why we chose them
                </h2>
              </div>

              <Link
                href="/stories"
                className="mt-4 sm:mt-0 text-sm uppercase tracking-wide link-underline min-h-[44px] flex items-center"
              >
                View all stories
              </Link>
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

      {/* ================= VIA EXPERIENCE ================= */}
      <section className="bg-[#f7f6f3] py-24 sm:py-36 border-t border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <ScrollReveal>
            <p className="text-xs uppercase tracking-[0.25em] text-neutral-400 mb-3 sm:mb-4">
              The VIA Experience
            </p>

            <h2 className="text-3xl sm:text-5xl font-serif mb-4 sm:mb-6 text-black">
              A better way to shop vintage
            </h2>

            <p className="max-w-2xl mx-auto mb-12 sm:mb-20 text-neutral-600 text-sm sm:text-base">
              VIA brings together the best independent vintage and secondhand stores
              into one seamless browsing experience, while keeping checkout
              with the store you love.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            <ScrollReveal delay={0}>
              <h3 className="text-lg sm:text-xl font-serif mb-2 sm:mb-3 text-black">Browse across stores</h3>
              <p className="text-neutral-600 text-sm sm:text-base">
                Explore curated inventory from multiple stores at once.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={150}>
              <h3 className="text-lg sm:text-xl font-serif mb-2 sm:mb-3 text-black">Discover rare pieces</h3>
              <p className="text-neutral-600 text-sm sm:text-base">
                Find one-of-a-kind items you won't see everywhere else.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <h3 className="text-lg sm:text-xl font-serif mb-2 sm:mb-3 text-black">Checkout with confidence</h3>
              <p className="text-neutral-600 text-sm sm:text-base">
                Purchase directly from the original store, no middlemen.
              </p>
            </ScrollReveal>
          </div>

        </div>
      </section>

    </main>
  );
}

