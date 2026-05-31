export const revalidate = 1800; // re-render homepage in background every 30 minutes

import Link from "next/link";
import FAQAccordion from "./components/FAQAccordion";
import Image from "next/image";
import StoreCarousel from "./components/StoreCarousel";
import StoriesHero from "./components/StoriesHero";
import NewArrivalsSection from "./components/NewArrivalsSection";
import FeaturedDesignerSection from "./components/FeaturedDesignerSection";
import EditorsPicksSection from "./components/EditorsPicksSection";
import { Suspense } from "react";
import HomepageScrollTracker from "./components/HomepageScrollTracker";

export default function HomePage() {
 return (
 <main className="w-full">
 <HomepageScrollTracker />

 {/* ================= HERO — MOBILE ================= */}
 <div data-section="hero" className="md:hidden">
 <section className="relative overflow-hidden" style={{ height: "85vh" }}>
 <Image
 src="/hero-v7.jpg"
 alt=""
 fill
 priority
 className="object-cover"
 style={{ objectPosition: "center center" }}
 sizes="100vw"
 />
 <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0) 70%)" }} />
 <div className="absolute bottom-48 left-6 right-6 z-10">
 <h1 className="text-3xl font-serif text-[#FFFDF8] mb-6 leading-tight">
 Access the world&apos;s best vintage.
 </h1>
 <div className="flex gap-3">
 <Link
 href="/stores"
 className="bg-[#5D0F17] text-[#FFFDF8] px-6 py-3 text-xs uppercase tracking-[0.12em] text-center font-sans flex-1"
 >
 Explore Stores
 </Link>
 <Link
 href="/categories"
 className="border border-[#FFFDF8]/60 text-[#FFFDF8] px-6 py-3 text-xs uppercase tracking-[0.12em] text-center font-sans flex-1"
 >
 Shop Now
 </Link>
 </div>
 </div>
 </section>
 </div>

 {/* ================= HERO — DESKTOP ================= */}
 <section
 className="hidden md:block relative overflow-x-hidden"
 style={{ backgroundColor: "#D8C8BC", minHeight: "100vh" }}
 >
 <Image
 src="/hero-v7.jpg"
 alt=""
 fill
 priority
 className="object-cover"
 style={{ objectPosition: "center center" }}
 sizes="100vw"
 />
 <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0) 70%)" }} />
 <div className="absolute bottom-[28%] left-10 z-10 animate-hero">
 <h1 className="text-6xl font-serif mb-8 text-[#FFFDF8] leading-tight max-w-xl">
 Access the world&apos;s best vintage.
 </h1>
 <div className="flex gap-4">
 <Link
 href="/stores"
 className="bg-[#5D0F17] text-[#FFFDF8] px-10 py-4 text-sm uppercase tracking-[0.12em] hover:bg-[#5D0F17]/85 transition-colors duration-300 text-center font-sans"
 >
 Explore Stores
 </Link>
 <Link
 href="/categories"
 className="border border-[#FFFDF8]/60 text-[#FFFDF8] px-10 py-4 text-sm uppercase tracking-[0.12em] hover:bg-white/10 transition-colors duration-300 text-center font-sans"
 >
 Shop Now
 </Link>
 </div>
 </div>
 </section>

 {/* ================= HOW IT WORKS ================= */}
 <section data-section="how-it-works" className="bg-[#FFFDF8] py-8 sm:py-12">
 <div className="max-w-7xl mx-auto px-6 sm:px-10">
 <div className="max-w-xl">
 <p className="text-lg sm:text-xl md:text-2xl font-serif text-[#5D0F17] leading-snug">
 The best pieces, within reach. Shop from different vintage stores all over the world, in one place.
 </p>
 <p className="text-xs text-[#5D0F17]/60 font-sans leading-relaxed mt-4">
 Every store represented on VYA has been carefully vetted, ensuring authenticity, quality, and care. Every purchase from VYA supports real people — not mass production.
 </p>
 </div>
 </div>
 </section>

 {/* ================= EVERYONE'S FAVORITES ================= */}
 <div data-section="favorites">
 <Suspense fallback={<div className="bg-[#FFFDF8] py-16 sm:py-24 h-64" />}>
 <EditorsPicksSection />
 </Suspense>

 </div>
 {/* ================= EDITORIAL SPLIT PANELS ================= */}
 <section data-section="collections" className="">
 <div className="flex flex-col sm:flex-row">
 <Link
 href="/collections/summer-edit"
 className="relative group overflow-hidden w-full sm:w-1/2"
 style={{ height: "60vw", minHeight: "320px", maxHeight: "100vh" }}
 >
 <Image
 src="/edit-summer.jpg"
 alt="Summer Edit"
 fill
 sizes="(min-width: 640px) 50vw, 100vw"
 className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
 loading="lazy"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
 <div className="absolute bottom-8 left-8 text-[#FFFDF8]">
 <p className="text-[10px] uppercase tracking-[0.2em] mb-1 font-sans opacity-60">Curated by Sophia Tiago</p>
 <h3 className="text-3xl sm:text-4xl font-serif mb-4 leading-none">Summer Edit</h3>
 <span className="text-xs uppercase tracking-[0.15em] border-b border-[#FFFDF8]/60 pb-0.5 font-sans">
 Discover
 </span>
 </div>
 </Link>

 <Link
 href="/collections/bridal-era"
 className="relative group overflow-hidden w-full sm:w-1/2"
 style={{ height: "60vw", minHeight: "320px", maxHeight: "100vh" }}
 >
 <Image
 src="/edit-4.jpg"
 alt="Bridal Edit"
 fill
 sizes="(min-width: 640px) 50vw, 100vw"
 className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
 loading="lazy"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
 <div className="absolute bottom-8 left-8 text-[#FFFDF8]">
 <p className="text-[10px] uppercase tracking-[0.2em] mb-1 font-sans opacity-60">Curated by TheElleCollective</p>
 <h3 className="text-3xl sm:text-4xl font-serif mb-4 leading-none">Bridal Edit</h3>
 <span className="text-xs uppercase tracking-[0.15em] border-b border-[#FFFDF8]/60 pb-0.5 font-sans">
 Discover
 </span>
 </div>
 </Link>
 </div>
 </section>

 {/* ================= SHOP BY STORE ================= */}
 <section data-section="stores" className="bg-[#FFFDF8] py-12 sm:py-16">
 <div className="max-w-7xl mx-auto">
 <div className="px-6 mb-8 flex items-end justify-between">
 <div>
 <p className="text-xs uppercase tracking-[0.15em] text-[#5D0F17]/50 mb-1 font-sans">Shop by</p>
 <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#5D0F17]">Store</h2>
 </div>
 <Link
 href="/stores"
 className="text-sm uppercase tracking-[0.15em] text-[#5D0F17] hover:text-[#5D0F17]/60 transition-colors min-h-[44px] flex items-center font-sans"
 >
 Shop All
 </Link>
 </div>
 <StoreCarousel />
 </div>
 </section>

 {/* ================= FEATURED DESIGNER ================= */}
 <Suspense fallback={<div className="h-[45vw]" />}>
 <FeaturedDesignerSection />
 </Suspense>

 {/* ================= NEW ARRIVALS ================= */}
 <div data-section="new-arrivals">
 <Suspense fallback={<div className="bg-[#FFFDF8] py-16 sm:py-24 h-64" />}>
 <NewArrivalsSection />
 </Suspense>
 </div>

 {/* ================= CATEGORY ================= */}
 <section data-section="categories" className="bg-[#FFFDF8] py-16 sm:py-24">
 <div className="max-w-7xl mx-auto">
 <div className="px-6 mb-10 sm:mb-14 flex items-end justify-between">
 <div>
 <p className="text-xs uppercase tracking-[0.15em] text-[#5D0F17]/50 mb-1 font-sans">Shop by</p>
 <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#5D0F17]">Category</h2>
 </div>
 <Link
 href="/categories"
 className="text-sm uppercase tracking-[0.15em] text-[#5D0F17] hover:text-[#5D0F17]/60 transition-colors min-h-[44px] flex items-center font-sans"
 >
 Shop All
 </Link>
 </div>

 <div className="overflow-x-auto sm:overflow-visible pb-4 sm:pb-0 scrollbar-hide touch-pan-x [&_img]:select-none [&_img]:pointer-events-none">
 <div className="flex gap-4 pl-6 pr-6 sm:px-6 sm:grid sm:grid-cols-2 lg:grid-cols-5 md:grid-cols-3 sm:gap-6">
 {[
 { label: "Clothing", slug: "clothing", image: "/categories/clothes.jpg", position: "object-center" },
 { label: "Bags", slug: "bags", image: "/categories/bags-v2.jpg", position: "object-bottom" },
 { label: "Shoes", slug: "shoes", image: "/categories/shoes-v2.jpg", position: "object-center" },
 { label: "Accessories", slug: "accessories", image: "/categories/accessories-v3.jpg", position: "object-center" },
 { label: "Home", slug: "home", image: "/categories/home.jpg", position: "object-center" },
 ].map((category) => (
 <Link
 key={category.slug}
 href={`/categories/${category.slug}`}
 className="group block w-[72vw] flex-shrink-0 sm:w-auto"
 >
 <div className="aspect-[3/4] relative overflow-hidden bg-[#D8CABD]/30">
 <Image
 src={category.image}
 alt={category.label}
 fill
 sizes="(min-width: 1024px) 20vw, (min-width: 768px) 33vw, 72vw"
 className={`object-cover ${category.position} transition-transform duration-700 ease-out group-hover:scale-105`}
 loading="lazy"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
 <div className="absolute bottom-6 left-6 text-[#FFFDF8]">
 <h3 className="text-xl sm:text-2xl font-serif leading-none">{category.label}</h3>
 <p className="text-[10px] uppercase tracking-[0.15em] font-sans mt-2 opacity-90">Explore</p>
 </div>
 </div>
 </Link>
 ))}
 </div>
 </div>
 </div>
 </section>

 {/* ================= VYA EXPERIENCE ================= */}
 <section className="bg-[#FFFDF8] py-16 sm:py-24">
 <div className="max-w-7xl mx-auto px-6 text-center">
 <p className="text-lg sm:text-xl font-serif italic text-[#5D0F17]/70 mb-4">
 The VYA Experience
 </p>

 <h2 className="text-3xl sm:text-4xl font-serif mb-4 sm:mb-6 text-[#5D0F17]">
 A better way to shop vintage
 </h2>

 <p className="max-w-2xl mx-auto mb-12 sm:mb-16 text-[#5D0F17]/60 text-sm sm:text-base font-sans">
 VYA brings together the best independent vintage and secondhand stores
 into one seamless browsing experience, while keeping checkout
 with the store you love.
 </p>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
 <div>
 <h3 className="text-lg sm:text-xl font-serif mb-2 sm:mb-3 text-[#5D0F17]">Browse across stores</h3>
 <p className="text-[#5D0F17]/60 text-sm sm:text-base font-sans">
 Explore curated inventory from multiple stores at once.
 </p>
 </div>

 <div>
 <h3 className="text-lg sm:text-xl font-serif mb-2 sm:mb-3 text-[#5D0F17]">Discover rare pieces</h3>
 <p className="text-[#5D0F17]/60 text-sm sm:text-base font-sans">
 Find one-of-a-kind items you won&apos;t see everywhere else.
 </p>
 </div>

 <div>
 <h3 className="text-lg sm:text-xl font-serif mb-2 sm:mb-3 text-[#5D0F17]">Checkout with confidence</h3>
 <p className="text-[#5D0F17]/60 text-sm sm:text-base font-sans">
 Purchase directly from the original store, no middlemen.
 </p>
 </div>
 </div>
 </div>
 </section>

 {/* ================= FAQ ================= */}
 <section className="bg-[#FFFDF8] py-16 sm:py-24">
 <div className="max-w-6xl mx-auto px-6">
 <div className="max-w-xl mb-12 sm:mb-16">
 <h2 className="text-3xl sm:text-4xl font-serif mb-4 text-[#5D0F17]">
 Frequently Asked Questions
 </h2>
 <p className="text-[#5D0F17]/60 text-sm sm:text-base font-sans">
 Everything you need to know about shopping, shipping, and how VYA works.
 </p>
 </div>

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

 <div className="mt-10 text-center">
 <Link
 href="/faqs"
 className="inline-block bg-[#5D0F17] text-[#FFFDF8] px-10 py-3.5 text-sm uppercase tracking-[0.15em] hover:bg-[#5D0F17]/85 transition font-sans"
 >
 Explore FAQs
 </Link>
 </div>
 </div>
 </section>

 {/* ================= STORIES ================= */}
 <section className="bg-[#FFFDF8] py-16 sm:py-24">
 <div className="max-w-7xl mx-auto px-6">
 <div className="mb-10 sm:mb-14 flex items-end justify-between">
 <div>
 <p className="text-xs uppercase tracking-[0.15em] text-[#5D0F17]/50 mb-1 font-sans">Featured</p>
 <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#5D0F17]">Stories</h2>
 </div>
 <Link
 href="/stories"
 className="text-sm uppercase tracking-[0.15em] text-[#5D0F17] hover:text-[#5D0F17]/60 transition-colors min-h-[44px] flex items-center font-sans"
 >
 View All
 </Link>
 </div>

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
 {
 slug: "blodas-choice",
 store: "Bloda's Choice",
 teaser: "A creative platform built around the vision of photographer Anna Bloda — vintage fashion, original design, and a singular point of view.",
 image: "/stores/blodas-choice.jpg",
 logo: "/stores/blodas-choice-logo.png",
 logoBg: "#ffffff",
 },
 {
 slug: "source-twenty-four",
 store: "Source Twenty Four",
 teaser: "Founded by a mother–daughter duo in New Jersey, built on the idea that the best fashion already has a story.",
 image: "/stores/source-twenty-four.jpg",
 logo: "/stores/source-twenty-four.jpg",
 logoBg: "#ffffff",
 },
 ]}
 />
 </div>
 </section>

 </main>
 );
}
