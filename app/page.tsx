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
      <section className="relative min-h-[85vh] sm:min-h-screen flex items-center bg-[#5D0F17] overflow-hidden">
        <div className="relative z-10 w-full">
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-3xl animate-hero">

              <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-[#D8CABD] mb-4 sm:mb-5 font-sans italic">
                Stop digging. Start shopping.
              </p>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-serif mb-5 sm:mb-8 text-[#F7F3EA] leading-tight">
                The home of curated vintage &amp; secondhand.
              </h1>

              <p className="max-w-xl mb-8 sm:mb-12 text-sm sm:text-base text-[#D8CABD] font-sans leading-relaxed">
                Discover and browse independent vintage and secondhand stores worldwide.
                The pieces you&apos;ve been looking for, without the hunt. All trusted and verified stores.
              </p>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 animate-hero delay-150">
                <Link
                  href="/stores"
                  className="bg-[#F7F3EA] text-[#5D0F17] px-8 sm:px-10 py-3.5 sm:py-4 text-xs sm:text-sm uppercase tracking-[0.12em] hover:bg-[#D8CABD] transition-colors duration-300 text-center font-sans"
                >
                  Explore Stores
                </Link>
                <Link
                  href="/categories"
                  className="border border-[#F7F3EA]/60 text-[#F7F3EA] px-8 sm:px-10 py-3.5 sm:py-4 text-xs sm:text-sm uppercase tracking-[0.12em] hover:bg-[#F7F3EA]/10 transition-colors duration-300 text-center font-sans"
                >
                  Browse Categories
                </Link>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ================= SHOP BY STORE ================= */}
      <section className="bg-[#F7F3EA] py-16 sm:py-24">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal>
            <div className="px-6 mb-10 sm:mb-14 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-[#5D0F17]/50 mb-1 font-sans">Shop by</p>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#5D0F17]">Store</h2>
              </div>
              <Link
                href="/stores"
                className="text-sm uppercase tracking-[0.15em] text-[#5D0F17] hover:text-[#5D0F17]/60 transition-colors min-h-[44px] flex items-center font-sans"
              >
                Shop All Stores
              </Link>
            </div>
          </ScrollReveal>

          <StoreCarousel />
        </div>
      </section>

      {/* ================= SHOP BY CATEGORY ================= */}
      <section className="bg-[#F7F3EA] py-16 sm:py-24 border-t border-[#5D0F17]/10">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal>
            <div className="px-6 mb-10 sm:mb-14 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-[#5D0F17]/50 mb-1 font-sans">Shop by</p>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#5D0F17]">Category</h2>
              </div>
              <Link
                href="/categories"
                className="text-sm uppercase tracking-[0.15em] text-[#5D0F17] hover:text-[#5D0F17]/60 transition-colors min-h-[44px] flex items-center font-sans"
              >
                Shop All Categories
              </Link>
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
                    <div className="aspect-square relative overflow-hidden mb-4 bg-[#D8CABD]/30">
                      <Image
                        src={category.image}
                        alt={category.label}
                        fill
                        sizes="(min-width: 768px) 25vw, 72vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    </div>
                    <p className="text-xs text-[#5D0F17]/50 text-center mb-1 italic font-sans">Shop</p>
                    <h3 className="text-xl sm:text-2xl font-serif text-[#5D0F17] text-center">
                      {category.label}
                    </h3>
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

      {/* ================= SHOP BY DESIGNER ================= */}
      <ScrollReveal>
        <Suspense>
          <BrandsSection />
        </Suspense>
      </ScrollReveal>

      {/* ================= STORIES ================= */}
      <section className="bg-[#F7F3EA] py-16 sm:py-24 border-t border-[#5D0F17]/10">
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal>
            <div className="mb-10 sm:mb-14 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.15em] text-[#5D0F17]/50 mb-1 font-sans">Featured</p>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#5D0F17]">Stories</h2>
              </div>
              <Link
                href="/stories"
                className="text-sm uppercase tracking-[0.15em] text-[#5D0F17] hover:text-[#5D0F17]/60 transition-colors min-h-[44px] flex items-center font-sans"
              >
                View All Stories
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

      {/* ================= FAQ ================= */}
      <section className="bg-[#F7F3EA] py-16 sm:py-24 border-t border-[#5D0F17]/10">
        <div className="max-w-6xl mx-auto px-6">
          <ScrollReveal>
            <div className="max-w-xl mb-12 sm:mb-16">
              <p className="text-lg sm:text-xl font-serif italic text-[#5D0F17]/70 mb-4">
                Have questions?
              </p>
              <h2 className="text-3xl sm:text-4xl font-serif mb-4 text-[#5D0F17]">
                Frequently Asked Questions
              </h2>
              <p className="text-[#5D0F17]/60 text-sm sm:text-base font-sans">
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
              className="inline-block bg-[#5D0F17] text-[#F7F3EA] px-10 py-3.5 text-sm uppercase tracking-[0.15em] hover:bg-[#5D0F17]/85 transition font-sans"
            >
              Explore FAQs
            </Link>
          </div>
        </div>
      </section>

      {/* ================= VIA EXPERIENCE ================= */}
      <section className="bg-[#F7F3EA] py-16 sm:py-24 border-t border-[#5D0F17]/10">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <ScrollReveal>
            <p className="text-lg sm:text-xl font-serif italic text-[#5D0F17]/70 mb-4">
              The VIA Experience
            </p>

            <h2 className="text-3xl sm:text-4xl font-serif mb-4 sm:mb-6 text-[#5D0F17]">
              A better way to shop vintage
            </h2>

            <p className="max-w-2xl mx-auto mb-12 sm:mb-16 text-[#5D0F17]/60 text-sm sm:text-base font-sans">
              VIA brings together the best independent vintage and secondhand stores
              into one seamless browsing experience, while keeping checkout
              with the store you love.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            <ScrollReveal delay={0}>
              <h3 className="text-lg sm:text-xl font-serif mb-2 sm:mb-3 text-[#5D0F17]">Browse across stores</h3>
              <p className="text-[#5D0F17]/60 text-sm sm:text-base font-sans">
                Explore curated inventory from multiple stores at once.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={150}>
              <h3 className="text-lg sm:text-xl font-serif mb-2 sm:mb-3 text-[#5D0F17]">Discover rare pieces</h3>
              <p className="text-[#5D0F17]/60 text-sm sm:text-base font-sans">
                Find one-of-a-kind items you won&apos;t see everywhere else.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={300}>
              <h3 className="text-lg sm:text-xl font-serif mb-2 sm:mb-3 text-[#5D0F17]">Checkout with confidence</h3>
              <p className="text-[#5D0F17]/60 text-sm sm:text-base font-sans">
                Purchase directly from the original store, no middlemen.
              </p>
            </ScrollReveal>
          </div>
        </div>
      </section>

    </main>
  );
}
