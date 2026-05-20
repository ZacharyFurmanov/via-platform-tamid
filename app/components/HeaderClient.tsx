"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, Menu, X, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCart } from "./CartProvider";
import { useFriends } from "./FriendsProvider";

import { stores } from "@/app/lib/stores";
import { resizeImage } from "@/app/lib/imageUtils";
import { COLLECTIONS } from "@/app/lib/collections-config";

type SearchResult =
  | { type: "designer"; name: string; href: string }
  | { type: "category"; name: string; href: string }
  | { type: "store"; name: string; href: string; meta?: string }
  | { type: "product"; name: string; href: string; meta: string; image?: string };

const ANNOUNCEMENTS = [
  { text: "New Arrivals Added Weekly", short: "New Arrivals Weekly", href: "/new-arrivals" },
  { text: "All stores are trusted & verified by VYA", short: "Trusted & Verified Stores", href: "/trust" },
];

function AnnouncementBar() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIndex((p) => (p + 1) % ANNOUNCEMENTS.length), 5000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="fixed top-0 z-[60] w-full h-8 bg-white flex items-center justify-center text-[11px] text-[#5D0F17] tracking-[0.15em] uppercase overflow-hidden px-4">
      <div className="relative h-full flex items-center w-full justify-center">
        {ANNOUNCEMENTS.map((item, i) => {
          const active = i === index;
          const cls = `whitespace-nowrap transition-all duration-500 ease-in-out ${active ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full absolute"}`;
          const content = <><span className="hidden sm:inline">{item.text}</span><span className="sm:hidden">{item.short ?? item.text}</span></>;
          return item.href
            ? <Link key={i} href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined} className={`${cls} hover:text-[#5D0F17]/70`}>{content}</Link>
            : <span key={i} className={cls}>{content}</span>;
        })}
      </div>
    </div>
  );
}

const FONT: React.CSSProperties = { fontFamily: "'Almarai', system-ui, sans-serif" };
const HEADER_H = 56;
const ANNOUNCE_H = 32;
const MENU_TOP = ANNOUNCE_H + HEADER_H;

const NAV_ITEM = "text-[12px] uppercase tracking-[0.1em] text-[#5D0F17] hover:text-[#5D0F17]/50 transition-colors duration-200 whitespace-nowrap";
const DROP_PANEL = "bg-white border border-gray-200 shadow-md";
const DROP_LINK = "block px-6 py-3 text-[13px] text-[#5D0F17] normal-case tracking-normal hover:bg-gray-50 transition-colors";
const DROP_FOOT = "border-t border-gray-100 px-6 py-3 text-[11px] uppercase tracking-[0.1em] text-[#5D0F17]/50 hover:text-[#5D0F17] hover:bg-gray-50 transition-colors block";

export default function HeaderClient({
  categories,
  activeCollectionSlugs,
}: {
  categories: { slug: string; label: string }[];
  activeCollectionSlugs: Set<string>;
}) {

  // ── UI state ─────────────────────────────────────────────────
  // ── UI state ─────────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [storesOpen, setStoresOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const [colsOpen, setColsOpen] = useState(false);
  const [mobileStores, setMobileStores] = useState(false);
  const [mobileCats, setMobileCats] = useState(false);
  const [mobileCols, setMobileCols] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();
  const { itemCount } = useCart();
  const { pendingCount } = useFriends();

  const storesRef = useRef<HTMLDivElement>(null);
  const catsRef = useRef<HTMLDivElement>(null);
  const colsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (storesRef.current && !storesRef.current.contains(e.target as Node)) setStoresOpen(false);
      if (catsRef.current && !catsRef.current.contains(e.target as Node)) setCatsOpen(false);
      if (colsRef.current && !colsRef.current.contains(e.target as Node)) setColsOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const h = () => { if (window.innerWidth >= 768) setMobileMenuOpen(false); };
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  // ── Search ───────────────────────────────────────────────────
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setActiveIndex(-1);
    if (!query.trim()) { setResults([]); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults([
            ...(data.designers || []).map((d: { slug: string; label: string }) => ({ type: "designer" as const, name: d.label, href: `/brands/${d.slug}` })),
            ...(data.categories || []).map((c: { slug: string; label: string }) => ({ type: "category" as const, name: c.label, href: `/categories/${c.slug}` })),
            ...(data.stores || []).map((s: { slug: string; name: string; location: string }) => ({ type: "store" as const, name: s.name, href: `/stores/${s.slug}`, meta: s.location })),
            ...(data.products || []).slice(0, 8).map((p: { name: string; storeSlug: string; id: number; storeName: string; price: string; image?: string }) => ({ type: "product" as const, name: p.name, href: `/products/${p.storeSlug}-${p.id}`, meta: `${p.storeName} · ${p.price}`, image: p.image })),
          ]);
        } else setResults([]);
      } catch { setResults([]); }
      finally { setSearchLoading(false); }
    }, 250);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query]);

  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, -1)); }
      if (e.key === "Enter" && query.trim()) {
        e.preventDefault();
        setSearchOpen(false);
        if (activeIndex >= 0 && results[activeIndex]) {
          router.push(results[activeIndex].href);
        } else {
          const q = query.trim().toLowerCase();
          const match = stores.find((s) => s.name.toLowerCase() === q || s.slug === q);
          router.push(match ? `/stores/${match.slug}` : `/search?q=${encodeURIComponent(query.trim())}`);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen, results, activeIndex, router, query]);

  useEffect(() => { if (!searchOpen) { setQuery(""); setActiveIndex(-1); } }, [searchOpen]);

  const closeSearch = (href?: string) => {
    searchInputRef.current?.blur();
    setSearchOpen(false);
    setQuery("");
    if (href) router.push(href);
  };

  const closeDropdowns = () => { setStoresOpen(false); setCatsOpen(false); setColsOpen(false); };

  return (
    <>
      <AnnouncementBar />

      {/* ── Header ───────────────────────────────────────────── */}
      <div
        className="fixed top-8 z-[60] w-full bg-[#F7F3EA] border-b border-[#5D0F17]/10"
        style={{ height: HEADER_H }}
      >
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center gap-6">

          {/* Logo — left */}
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex-shrink-0 flex items-center gap-1"
          >
            <img src="/vya-logo.png" alt="VYA" className="h-7 sm:h-8 w-auto" />
            <span className="text-[8px] uppercase tracking-[0.2em] text-[#5D0F17]/40 font-sans">pilot</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-7 flex-1" style={FONT}>

            {/* Stores */}
            <div
              className="relative"
              ref={storesRef}
              onMouseEnter={() => { setStoresOpen(true); setCatsOpen(false); setColsOpen(false); }}
              onMouseLeave={() => setStoresOpen(false)}
            >
              <button onClick={() => { closeDropdowns(); setStoresOpen(true); }} className={NAV_ITEM}>
                Stores
              </button>
              <div className={`absolute left-0 top-full pt-3 z-50 transition-all duration-200 ${storesOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-1"}`}>
                <div className={DROP_PANEL} style={{ minWidth: `${Math.ceil(stores.length / 8) * 200}px` }}>
                  <div className="py-2 grid grid-flow-col" style={{ gridTemplateRows: "repeat(8, auto)" }}>
                    {stores.map((s) => (
                      <Link key={s.slug} href={`/stores/${s.slug}`} onClick={() => setStoresOpen(false)} className={DROP_LINK}>
                        <span className="font-medium">{s.name}</span>
                        <span className="block text-[11px] text-[#5D0F17]/40 mt-0.5">{s.location}</span>
                      </Link>
                    ))}
                  </div>
                  <Link href="/stores" onClick={() => setStoresOpen(false)} className={DROP_FOOT}>View All Stores</Link>
                </div>
              </div>
            </div>

            {/* Categories */}
            <div
              className="relative"
              ref={catsRef}
              onMouseEnter={() => { setCatsOpen(true); setStoresOpen(false); setColsOpen(false); }}
              onMouseLeave={() => setCatsOpen(false)}
            >
              <button onClick={() => { closeDropdowns(); setCatsOpen(true); }} className={NAV_ITEM}>
                Categories
              </button>
              <div className={`absolute left-1/2 -translate-x-1/2 top-full pt-3 z-50 transition-all duration-200 ${catsOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-1"}`}>
                <div className={`${DROP_PANEL} min-w-[160px]`}>
                  <div className="py-2">
                    {[
                      { slug: "clothing", label: "Clothing" },
                      { slug: "bags", label: "Bags" },
                      { slug: "shoes", label: "Shoes" },
                      { slug: "accessories", label: "Accessories" },
                      { slug: "home", label: "Home" },
                    ].map((c) => (
                      <Link key={c.slug} href={`/categories/${c.slug}`} onClick={() => setCatsOpen(false)} className={DROP_LINK}>{c.label}</Link>
                    ))}
                  </div>
                  <Link href="/categories" onClick={() => setCatsOpen(false)} className={DROP_FOOT}>All Categories</Link>
                </div>
              </div>
            </div>

            {/* Designers */}
            <Link href="/brands" className={NAV_ITEM}>Designers</Link>

            {/* Collections */}
            <div
              className="relative"
              ref={colsRef}
              onMouseEnter={() => { setColsOpen(true); setStoresOpen(false); setCatsOpen(false); }}
              onMouseLeave={() => setColsOpen(false)}
            >
              <button onClick={() => { closeDropdowns(); setColsOpen(true); }} className={NAV_ITEM}>
                Collections
              </button>
              <div className={`absolute left-1/2 -translate-x-1/2 top-full pt-3 z-50 transition-all duration-200 ${colsOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-1"}`}>
                <div className={`${DROP_PANEL} min-w-[200px]`}>
                  <div className="py-2">
                    {COLLECTIONS.filter((col, i) => activeCollectionSlugs.has(col.slug) || i === COLLECTIONS.length - 1).map((col) => (
                      <Link key={col.slug} href={col.href ?? `/collections/${col.slug}`} onClick={() => setColsOpen(false)} className={DROP_LINK}>
                        {col.name}
                        {col.curatedBy && <span className="block text-[10px] text-[#5D0F17]/40 mt-0.5">by {col.curatedBy}</span>}
                      </Link>
                    ))}
                  </div>
                  <Link href="/collections" onClick={() => setColsOpen(false)} className={DROP_FOOT}>View All Collections</Link>
                </div>
              </div>
            </div>

          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto">

            {/* Inline search — desktop */}
            <button
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-2 px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-[#5D0F17]/50 hover:text-[#5D0F17] transition-colors duration-200 group"
              style={FONT}
            >
              <Search size={13} strokeWidth={1.5} />
              <span className="border-b border-transparent group-hover:border-[#5D0F17]/40 transition-colors duration-200">Search</span>
            </button>

            {/* Search icon — mobile */}
            <button
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
              className="md:hidden p-2 text-[#5D0F17] min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Search size={20} />
            </button>

            {/* Cart */}
            <Link
              href="/cart"
              aria-label="Cart"
              className="relative p-2 text-[#5D0F17] min-w-[44px] min-h-[44px] flex items-center justify-center hover:text-[#5D0F17]/60 transition-colors"
            >
              <ShoppingCart size={18} strokeWidth={1.5} />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#5D0F17] text-white text-[10px] font-medium min-w-[17px] min-h-[17px] flex items-center justify-center rounded-full leading-none px-0.5">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Sign In / Account — desktop */}
            <Link
              href={session ? "/account" : "/login"}
              aria-label={session ? "Account" : "Sign in"}
              className="hidden md:flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-[#5D0F17] hover:text-[#5D0F17]/50 transition-colors"
              style={FONT}
            >
              {session?.user?.image
                ? <img src={session.user.image} alt="" className="w-5 h-5 rounded-full" />
                : session ? "Account" : "Sign In"
              }
              {pendingCount > 0 && <span className="w-1.5 h-1.5 bg-[#5D0F17] rounded-full flex-shrink-0" />}
            </Link>

            {/* Mobile menu toggle */}
            <button
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#5D0F17] min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Menu ───────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute left-0 right-0 bottom-0 bg-black/10"
            style={{ top: MENU_TOP }}
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav
            className="absolute left-0 right-0 bottom-0 bg-white overflow-y-auto"
            style={{ top: MENU_TOP, ...FONT }}
          >
            <div className="px-6 py-8">
              <ul className="space-y-1">

                <li className="border-b border-gray-100">
                  <button onClick={() => setMobileStores(!mobileStores)} className="w-full flex items-center justify-between py-4 text-[13px] text-[#5D0F17] uppercase tracking-[0.08em]">
                    Stores <span className={`text-[#5D0F17]/40 text-xs transition-transform duration-200 ${mobileStores ? "rotate-180" : ""}`}>▾</span>
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ease-out ${mobileStores ? "max-h-[9999px] opacity-100" : "max-h-0 opacity-0"}`}>
                    <div className="pb-4 pl-4 space-y-1">
                      {stores.map((s) => (
                        <Link key={s.slug} href={`/stores/${s.slug}`} onClick={() => setMobileMenuOpen(false)} className="block py-2 text-[13px] text-[#5D0F17]/70 hover:text-[#5D0F17] transition-colors">{s.name}</Link>
                      ))}
                      <Link href="/stores" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-[11px] uppercase tracking-[0.08em] text-[#5D0F17]/40 hover:text-[#5D0F17] transition-colors">View All Stores</Link>
                    </div>
                  </div>
                </li>

                <li className="border-b border-gray-100">
                  <button onClick={() => setMobileCats(!mobileCats)} className="w-full flex items-center justify-between py-4 text-[13px] text-[#5D0F17] uppercase tracking-[0.08em]">
                    Categories <span className={`text-[#5D0F17]/40 text-xs transition-transform duration-200 ${mobileCats ? "rotate-180" : ""}`}>▾</span>
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ease-out ${mobileCats ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"}`}>
                    <div className="pb-4 pl-4 space-y-1">
                      {[{ slug: "clothing", label: "Clothing" }, { slug: "bags", label: "Bags" }, { slug: "shoes", label: "Shoes" }, { slug: "accessories", label: "Accessories" }, { slug: "home", label: "Home" }].map((c) => (
                        <Link key={c.slug} href={`/categories/${c.slug}`} onClick={() => setMobileMenuOpen(false)} className="block py-2 text-[13px] text-[#5D0F17]/70 hover:text-[#5D0F17] transition-colors">{c.label}</Link>
                      ))}
                      <Link href="/categories" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-[11px] uppercase tracking-[0.08em] text-[#5D0F17]/40">All Categories</Link>
                    </div>
                  </div>
                </li>

                <li className="border-b border-gray-100">
                  <Link href="/brands" onClick={() => setMobileMenuOpen(false)} className="block py-4 text-[13px] text-[#5D0F17] uppercase tracking-[0.08em]">Designers</Link>
                </li>

                <li className="border-b border-gray-100">
                  <button onClick={() => setMobileCols(!mobileCols)} className="w-full flex items-center justify-between py-4 text-[13px] text-[#5D0F17] uppercase tracking-[0.08em]">
                    Collections <span className={`text-[#5D0F17]/40 text-xs transition-transform duration-200 ${mobileCols ? "rotate-180" : ""}`}>▾</span>
                  </button>
                  {mobileCols && (
                    <div className="pb-2 pl-4">
                      {COLLECTIONS.filter((col, i) => activeCollectionSlugs.has(col.slug) || i === COLLECTIONS.length - 1).map((col) => (
                        <Link key={col.slug} href={col.href ?? `/collections/${col.slug}`} onClick={() => setMobileMenuOpen(false)} className="block py-2.5 text-[13px] text-[#5D0F17]/70">{col.name}</Link>
                      ))}
                      <Link href="/collections" onClick={() => setMobileMenuOpen(false)} className="block py-2.5 text-[11px] uppercase tracking-[0.08em] text-[#5D0F17]/40">View All</Link>
                    </div>
                  )}
                </li>

              </ul>

              <div className="mt-8 pt-8 border-t border-gray-100">
                <Link href={session ? "/account" : "/login"} onClick={() => setMobileMenuOpen(false)} className="block py-3 text-[13px] uppercase tracking-[0.08em] text-[#5D0F17]/70 hover:text-[#5D0F17]">
                  {session ? "My Account" : "Sign In"}
                </Link>
              </div>
            </div>
          </nav>
        </div>
      )}

      {/* ── Search Overlay ────────────────────────────────────── */}
      {searchOpen && (
        <div className="fixed inset-0 z-[70] bg-black/20 backdrop-blur-sm flex items-start justify-center md:pt-20" onClick={() => closeSearch()}>
          <div className="bg-white w-full h-full md:h-auto md:max-h-[78vh] md:max-w-xl shadow-2xl relative flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-5 pt-5 pb-0 flex-shrink-0">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" strokeWidth="1.5" /><line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="1.5" />
              </svg>
              <input
                ref={searchInputRef}
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search items or stores..."
                className="flex-1 text-[15px] outline-none bg-transparent text-[#5D0F17] placeholder:text-gray-400 py-1"
                style={FONT}
              />
              <button onClick={() => closeSearch()} className="text-[10px] uppercase tracking-[0.12em] text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">Esc</button>
            </div>

            <div className="mx-5 mt-3 border-b border-gray-200 flex-shrink-0" />

            <div className="mt-3 overflow-y-auto flex-1 min-h-0 pb-4">
              {!query.trim() && (
                <div>
                  <p className="px-5 pt-2 pb-2.5 text-[9px] uppercase tracking-[0.18em] text-gray-400 font-medium">Browse by Category</p>
                  <div className="px-5 pb-4 grid grid-cols-4 gap-2">
                    {[{ slug: "clothing", label: "Clothing" }, { slug: "bags", label: "Bags" }, { slug: "shoes", label: "Shoes" }, { slug: "accessories", label: "Accessories" }].map((c) => (
                      <button key={c.slug} onClick={() => closeSearch(`/categories/${c.slug}`)} className="border border-gray-200 py-2 text-[11px] uppercase tracking-[0.1em] text-center text-gray-600 hover:bg-[#5D0F17] hover:text-white hover:border-[#5D0F17] transition-colors">{c.label}</button>
                    ))}
                  </div>
                  <p className="px-5 py-2 text-[9px] uppercase tracking-[0.18em] text-gray-400 font-medium border-t border-gray-100">Our Stores</p>
                  {stores.map((s) => (
                    <button key={s.slug} onClick={() => closeSearch(`/stores/${s.slug}`)} className="w-full text-left px-5 py-2.5 hover:bg-gray-50 flex items-center justify-between text-[#5D0F17] transition-colors">
                      <span className="text-[13px]">{s.name}</span>
                      <span className="text-[11px] text-gray-400">{s.location}</span>
                    </button>
                  ))}
                </div>
              )}

              {searchLoading && results.length === 0 && <p className="text-[13px] text-gray-400 px-5 py-3">Searching...</p>}
              {!searchLoading && query.trim().length >= 2 && results.length === 0 && <p className="text-[13px] text-gray-400 px-5 py-3">No results found</p>}

              {(() => {
                const designers = results.filter((r) => r.type === "designer");
                const cats = results.filter((r) => r.type === "category");
                const storeResults = results.filter((r) => r.type === "store");
                const products = results.filter((r) => r.type === "product");
                let flat = -1;
                const renderItem = (r: SearchResult) => {
                  flat++;
                  const idx = flat;
                  return (
                    <button key={`${r.type}-${idx}`} onClick={() => closeSearch(r.href)} className={`w-full text-left px-5 py-2.5 flex items-center gap-3 text-[#5D0F17] transition-colors ${idx === activeIndex ? "bg-[#5D0F17] text-white" : "hover:bg-gray-50"}`}>
                      {r.type === "product" && r.image && <img src={resizeImage(r.image, 120)} alt="" className="w-9 h-12 object-cover flex-shrink-0" loading="lazy" decoding="async" />}
                      <div className="flex-1 flex justify-between items-center min-w-0">
                        <span className="truncate text-[13px]">{r.name}</span>
                        {"meta" in r && r.meta && <span className="text-[11px] opacity-40 flex-shrink-0 ml-2">{r.meta}</span>}
                      </div>
                    </button>
                  );
                };
                return (
                  <>
                    {designers.length > 0 && <div className="mb-1"><p className="px-5 pt-3 pb-1 text-[9px] uppercase tracking-[0.18em] text-gray-400 font-medium">Designers</p>{designers.map(renderItem)}</div>}
                    {cats.length > 0 && <div className="mb-1"><p className="px-5 pt-3 pb-1 text-[9px] uppercase tracking-[0.18em] text-gray-400 font-medium">Categories</p>{cats.map(renderItem)}</div>}
                    {storeResults.length > 0 && <div className="mb-1"><p className="px-5 pt-3 pb-1 text-[9px] uppercase tracking-[0.18em] text-gray-400 font-medium">Stores</p>{storeResults.map(renderItem)}</div>}
                    {products.length > 0 && <div className="mb-1"><p className="px-5 pt-3 pb-1 text-[9px] uppercase tracking-[0.18em] text-gray-400 font-medium">Products</p>{products.map(renderItem)}</div>}
                    {results.length > 0 && query.trim() && (
                      <button onClick={() => closeSearch(`/search?q=${encodeURIComponent(query.trim())}`)} className="w-full text-left px-3 py-3 mt-2 border-t border-gray-100 text-sm text-gray-500 hover:text-[#5D0F17] transition-colors">
                        See all results for &ldquo;{query.trim()}&rdquo;
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
