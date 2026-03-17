"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, Menu, X, ChevronDown, User, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCart } from "./CartProvider";
import { useFriends } from "./FriendsProvider";

import { stores } from "@/app/lib/stores";
import { resizeImage } from "@/app/lib/imageUtils";

type Category = {
  slug: string;
  label: string;
};

type SearchResult =
  | { type: "designer"; name: string; href: string }
  | { type: "category"; name: string; href: string }
  | { type: "store"; name: string; href: string; meta?: string }
  | { type: "product"; name: string; href: string; meta: string; image?: string };

const ANNOUNCEMENTS = [
  { text: "Vintage & Secondhand", href: null },
  { text: "New Arrivals Added Weekly", href: "/new-arrivals" },
  { text: "NYC Pop Up March 29th! Click here for tickets", href: "https://posh.vip/e/via-nyc-pop-up" },
];

function AnnouncementBar() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % ANNOUNCEMENTS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed top-0 z-50 w-full h-8 bg-[#F7F3EA] flex items-center justify-center text-[11px] text-[#5D0F17] tracking-[0.15em] uppercase overflow-hidden">
      <div className="relative h-full flex items-center">
        {ANNOUNCEMENTS.map((item, i) => {
          const isActive = i === index;
          const className = `transition-all duration-500 ease-in-out ${
            isActive ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full absolute"
          }`;
          return item.href ? (
            <Link
              key={i}
              href={item.href}
              target={item.href.startsWith("http") ? "_blank" : undefined}
              rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
              className={`${className} hover:text-[#5D0F17]/70`}
            >
              {item.text}
            </Link>
          ) : (
            <span key={i} className={className}>{item.text}</span>
          );
        })}
      </div>
    </div>
  );
}

export default function HeaderClient({
  categories,
}: {
  categories: { slug: string; label: string }[];
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [storesDropdownOpen, setStoresDropdownOpen] = useState(false);
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false);
  const [mobileStoresExpanded, setMobileStoresExpanded] = useState(false);
  const [mobileCategoriesExpanded, setMobileCategoriesExpanded] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();
  const { itemCount } = useCart();
  const { pendingCount } = useFriends();

  const storesDropdownRef = useRef<HTMLDivElement>(null);
  const categoriesDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (storesDropdownRef.current && !storesDropdownRef.current.contains(e.target as Node)) {
        setStoresDropdownOpen(false);
      }
      if (categoriesDropdownRef.current && !categoriesDropdownRef.current.contains(e.target as Node)) {
        setCategoriesDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setActiveIndex(-1);

    if (!query.trim()) {
      setResults([]);
      return;
    }

    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          const allResults: SearchResult[] = [
            ...(data.designers || []).map(
              (d: { slug: string; label: string }) => ({
                type: "designer" as const,
                name: d.label,
                href: `/brands/${d.slug}`,
              })
            ),
            ...(data.categories || []).map(
              (c: { slug: string; label: string }) => ({
                type: "category" as const,
                name: c.label,
                href: `/categories/${c.slug}`,
              })
            ),
            ...(data.stores || []).map(
              (s: { slug: string; name: string; location: string }) => ({
                type: "store" as const,
                name: s.name,
                href: `/stores/${s.slug}`,
                meta: s.location,
              })
            ),
            ...(data.products || []).slice(0, 8).map(
              (p: { name: string; storeSlug: string; id: number; storeName: string; price: string; image?: string }) => ({
                type: "product" as const,
                name: p.name,
                href: `/products/${p.storeSlug}-${p.id}`,
                meta: `${p.storeName} · ${p.price}`,
                image: p.image,
              })
            ),
          ];
          setResults(allResults);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query]);

  useEffect(() => {
    if (!searchOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchOpen(false);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, -1));
      }
      if (e.key === "Enter" && query.trim()) {
        e.preventDefault();
        setSearchOpen(false);
        if (activeIndex >= 0 && results[activeIndex]) {
          router.push(results[activeIndex].href);
        } else {
          const q = query.trim().toLowerCase();
          const matchedStore = stores.find(
            (s) => s.name.toLowerCase() === q || s.slug === q
          );
          if (matchedStore) {
            router.push(`/stores/${matchedStore.slug}`);
          } else {
            router.push(`/search?q=${encodeURIComponent(query.trim())}`);
          }
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen, results, activeIndex, router, query]);

  useEffect(() => {
    if (!searchOpen) {
      setQuery("");
      setActiveIndex(-1);
    }
  }, [searchOpen]);

  return (
    <>
      {/* Announcement bar */}
      <AnnouncementBar />

      {/* Header */}
      <header className="fixed top-8 z-50 w-full bg-[#D8CABD]">
        <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">

          {/* LOGO */}
          <Link href="/" className="flex items-start gap-1.5" onClick={() => setMobileMenuOpen(false)}>
            <img src="/vya-logo.png" alt="VYA" className="h-7 sm:h-9 w-auto" />
            <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.15em] text-[#5D0F17]/60 font-sans">pilot</span>
          </Link>

          <div className="flex items-center gap-3 md:gap-8">
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8 text-[15px] text-[#5D0F17]" style={{ fontFamily: "'PP Eiko', Georgia, serif" }}>
              {/* STORES DROPDOWN */}
              <div className="relative" ref={storesDropdownRef}>
                <button
                  onClick={() => {
                    setStoresDropdownOpen(!storesDropdownOpen);
                    setCategoriesDropdownOpen(false);
                  }}
                  className="flex items-center gap-1 hover:text-[#5D0F17]/60 transition-colors duration-300"
                >
                  Stores
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${storesDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                <div
                  className={`absolute left-1/2 -translate-x-1/2 top-full pt-4 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    storesDropdownOpen
                      ? 'opacity-100 visible translate-y-0'
                      : 'opacity-0 invisible -translate-y-2'
                  }`}
                >
                  <div style={{ minWidth: `${Math.ceil(stores.length / 7) * 210}px`, fontFamily: "'Almarai', sans-serif" }} className="bg-[#F7F3EA] text-[#5D0F17] shadow-xl border border-[#5D0F17]/10">
                    <div className="py-2 grid grid-flow-col" style={{ gridTemplateRows: 'repeat(7, auto)' }}>
                      {stores.map((store) => (
                        <Link
                          key={store.slug}
                          href={`/stores/${store.slug}`}
                          onClick={() => setStoresDropdownOpen(false)}
                          className="block px-6 py-3 text-sm normal-case tracking-normal hover:bg-[#D8CABD]/50 transition-colors"
                        >
                          <span className="font-medium">{store.name}</span>
                          <span className="block text-xs text-[#5D0F17]/50 mt-0.5">{store.location}</span>
                        </Link>
                      ))}
                    </div>
                    <div className="border-t border-[#5D0F17]/10">
                      <Link
                        href="/stores"
                        onClick={() => setStoresDropdownOpen(false)}
                        className="block px-6 py-3 text-xs uppercase tracking-wide text-[#5D0F17]/60 hover:text-[#5D0F17] hover:bg-[#D8CABD]/50 transition-colors"
                      >
                        View All Stores
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* CATEGORIES DROPDOWN */}
              <div className="relative" ref={categoriesDropdownRef}>
                <button
                  onClick={() => {
                    setCategoriesDropdownOpen(!categoriesDropdownOpen);
                    setStoresDropdownOpen(false);
                  }}
                  className="flex items-center gap-1 hover:text-[#5D0F17]/60 transition-colors duration-300"
                >
                  Categories
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${categoriesDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                <div
                  className={`absolute left-1/2 -translate-x-1/2 top-full pt-4 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    categoriesDropdownOpen
                      ? 'opacity-100 visible translate-y-0'
                      : 'opacity-0 invisible -translate-y-2'
                  }`}
                >
                  <div className="bg-[#F7F3EA] text-[#5D0F17] min-w-[180px] shadow-xl border border-[#5D0F17]/10" style={{ fontFamily: "'Almarai', sans-serif" }}>
                    <div className="py-2">
                      {[
                        { slug: "clothing", label: "Clothing" },
                        { slug: "bags", label: "Bags" },
                        { slug: "shoes", label: "Shoes" },
                        { slug: "accessories", label: "Accessories" },
                      ].map((cat) => (
                        <Link
                          key={cat.slug}
                          href={`/categories/${cat.slug}`}
                          onClick={() => setCategoriesDropdownOpen(false)}
                          className="block px-6 py-2.5 text-sm normal-case tracking-normal hover:bg-[#D8CABD]/50 transition-colors"
                        >
                          {cat.label}
                        </Link>
                      ))}
                    </div>
                    <div className="border-t border-[#5D0F17]/10">
                      <Link
                        href="/categories"
                        onClick={() => setCategoriesDropdownOpen(false)}
                        className="block px-6 py-3 text-xs uppercase tracking-wide text-[#5D0F17]/60 hover:text-[#5D0F17] hover:bg-[#D8CABD]/50 transition-colors"
                      >
                        All Categories
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* DESIGNERS LINK */}
              <Link
                href="/brands"
                className="hover:text-[#5D0F17]/60 transition-colors duration-300"
              >
                Designers
              </Link>

              {/* EDITORS PICKS LINK */}
              <Link
                href="/editors-picks"
                className="hover:text-[#5D0F17]/60 transition-colors duration-300"
              >
                Editor&apos;s Picks
              </Link>

              {/* SOURCING REQUESTS LINK */}
              <Link
                href="/sourcing"
                className="hover:text-[#5D0F17]/60 transition-colors duration-300"
              >
                Sourcing Requests
              </Link>
            </nav>

            {/* Search Button */}
            <button
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
              className="p-2 text-[#5D0F17] min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <Search size={20} />
            </button>

            {/* Cart Button */}
            <Link
              href="/cart"
              className="relative p-2 text-[#5D0F17] min-w-[44px] min-h-[44px] flex items-center justify-center hover:text-[#5D0F17]/60 transition-colors"
              aria-label="Cart"
            >
              <ShoppingCart size={20} />
              {itemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-[#5D0F17] text-[#F7F3EA] text-[10px] font-medium min-w-[18px] min-h-[18px] flex items-center justify-center rounded-full leading-none px-1">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Account Button */}
            <Link
              href={session ? "/account" : "/login"}
              className="relative p-2 text-[#5D0F17] min-w-[44px] min-h-[44px] flex items-center justify-center hover:text-[#5D0F17]/60 transition-colors"
              aria-label={session ? "Account" : "Sign in"}
            >
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt=""
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <User size={20} />
              )}
              {pendingCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-[#5D0F17] rounded-full border-2 border-[#D8CABD]" />
              )}
            </Link>

            {/* Mobile Menu Button */}
            <button
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#5D0F17] min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-[#5D0F17]/30"
            onClick={() => setMobileMenuOpen(false)}
          />

          <nav className="absolute top-[104px] left-0 right-0 bottom-0 bg-[#F7F3EA] overflow-y-auto" style={{ fontFamily: "'PP Eiko', Georgia, serif" }}>
            <div className="px-6 py-8">
              <ul className="space-y-1">
                {/* Mobile Stores Accordion */}
                <li className="border-b border-[#5D0F17]/15">
                  <button
                    onClick={() => setMobileStoresExpanded(!mobileStoresExpanded)}
                    className="w-full flex items-center justify-between py-4 text-lg text-[#5D0F17]"
                  >
                    Stores
                    <ChevronDown
                      size={20}
                      className={`transition-transform duration-300 ${mobileStoresExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <div
                    className={`transition-all duration-300 ease-out ${
                      mobileStoresExpanded ? 'max-h-[60vh] opacity-100 overflow-y-auto' : 'max-h-0 opacity-0 overflow-hidden'
                    }`}
                  >
                    <div className="pb-4 pl-4 space-y-1">
                      {stores.map((store) => (
                        <Link
                          key={store.slug}
                          href={`/stores/${store.slug}`}
                          onClick={() => setMobileMenuOpen(false)}
                          className="block py-2 text-[#5D0F17]/70 hover:text-[#5D0F17] transition-colors"
                        >
                          {store.name}
                        </Link>
                      ))}
                      <Link
                        href="/stores"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block py-2 text-xs uppercase tracking-wide text-[#5D0F17]/50 hover:text-[#5D0F17] transition-colors"
                      >
                        View All Stores
                      </Link>
                    </div>
                  </div>
                </li>

                {/* Mobile Categories Accordion */}
                <li className="border-b border-[#5D0F17]/15">
                  <button
                    onClick={() => setMobileCategoriesExpanded(!mobileCategoriesExpanded)}
                    className="w-full flex items-center justify-between py-4 text-lg text-[#5D0F17]"
                  >
                    Categories
                    <ChevronDown
                      size={20}
                      className={`transition-transform duration-300 ${mobileCategoriesExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-out ${
                      mobileCategoriesExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="pb-4 pl-4 space-y-1">
                      {[
                        { slug: "clothing", label: "Clothing" },
                        { slug: "bags", label: "Bags" },
                        { slug: "shoes", label: "Shoes" },
                      ].map((cat) => (
                        <Link
                          key={cat.slug}
                          href={`/categories/${cat.slug}`}
                          onClick={() => setMobileMenuOpen(false)}
                          className="block py-2 text-[#5D0F17]/70 hover:text-[#5D0F17] transition-colors"
                        >
                          {cat.label}
                        </Link>
                      ))}

                        <Link
                        href="/categories/accessories"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block py-2 text-[#5D0F17]/70 hover:text-[#5D0F17] transition-colors"
                      >
                        Accessories
                      </Link>

                      <Link
                        href="/categories"
                        onClick={() => setMobileMenuOpen(false)}
                        className="block py-2 text-xs uppercase tracking-wide text-[#5D0F17]/50 hover:text-[#5D0F17] transition-colors"
                      >
                        All Categories
                      </Link>
                    </div>
                  </div>
                </li>
              </ul>

              <ul className="space-y-1">
                <li className="border-b border-[#5D0F17]/15">
                  <Link
                    href="/brands"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-4 text-lg text-[#5D0F17]"
                  >
                    Designers
                  </Link>
                </li>
                <li className="border-b border-[#5D0F17]/15">
                  <Link
                    href="/editors-picks"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-4 text-lg text-[#5D0F17]"
                  >
                    Editor&apos;s Picks
                  </Link>
                </li>
                <li className="border-b border-[#5D0F17]/15">
                  <Link
                    href="/sourcing"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-4 text-lg text-[#5D0F17]"
                  >
                    Sourcing Requests
                  </Link>
                </li>
              </ul>

              <div className="mt-8 pt-8 border-t border-[#5D0F17]/15">
                <Link
                  href={session ? "/account" : "/login"}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-3 text-[#5D0F17]/70 hover:text-[#5D0F17]"
                >
                  {session ? "My Account" : "Sign In"}
                </Link>
              </div>
            </div>
          </nav>
        </div>
      )}

      {/* SEARCH OVERLAY */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-[#5D0F17]/30 backdrop-blur-sm flex items-start justify-center md:pt-24">
          <div className="bg-[#F7F3EA] w-full h-full md:h-auto md:max-h-[80vh] md:max-w-2xl p-6 relative flex flex-col">
            <button
              onClick={() => setSearchOpen(false)}
              className="absolute top-4 right-4 text-xs uppercase text-[#5D0F17]/60 hover:text-[#5D0F17] transition-colors"
            >
              Close
            </button>

            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items or stores..."
              className="w-full border-b border-[#5D0F17] pb-3 text-lg outline-none flex-shrink-0 bg-transparent text-[#5D0F17] placeholder:text-[#5D0F17]/40"
            />

            <div className="mt-4 overflow-y-auto flex-1 min-h-0">
              {!query.trim() && (
                <div className="pt-1">
                  <p className="px-3 pt-2 pb-2 text-[10px] uppercase tracking-widest text-[#5D0F17]/40">Browse by Category</p>
                  <div className="px-3 pb-5 grid grid-cols-2 gap-2">
                    {[
                      { slug: "clothing", label: "Clothing" },
                      { slug: "bags", label: "Bags" },
                      { slug: "shoes", label: "Shoes" },
                      { slug: "accessories", label: "Accessories" },
                    ].map((cat) => (
                      <button
                        key={cat.slug}
                        onClick={() => { setSearchOpen(false); router.push(`/categories/${cat.slug}`); }}
                        className="border border-[#5D0F17]/30 py-3 text-sm text-center text-[#5D0F17] hover:bg-[#5D0F17] hover:text-[#F7F3EA] hover:border-[#5D0F17] transition-colors"
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  <p className="px-3 py-2 text-[10px] uppercase tracking-widest text-[#5D0F17]/40 border-t border-[#5D0F17]/10">Our Stores</p>
                  {stores.map((store) => (
                    <button
                      key={store.slug}
                      onClick={() => { setSearchOpen(false); router.push(`/stores/${store.slug}`); }}
                      className="w-full text-left px-3 py-3 hover:bg-[#D8CABD]/40 flex items-center justify-between text-[#5D0F17]"
                    >
                      <span className="text-sm">{store.name}</span>
                      <span className="text-xs text-[#5D0F17]/40">{store.location}</span>
                    </button>
                  ))}
                </div>
              )}

              {searchLoading && results.length === 0 && (
                <p className="text-sm text-[#5D0F17]/40 px-3 py-2">Searching...</p>
              )}
              {!searchLoading && query.trim().length >= 2 && results.length === 0 && (
                <p className="text-sm text-[#5D0F17]/40 px-3 py-2">No results found</p>
              )}

              {(() => {
                const designers = results.filter((r) => r.type === "designer");
                const cats = results.filter((r) => r.type === "category");
                const storeResults = results.filter((r) => r.type === "store");
                const products = results.filter((r) => r.type === "product");
                let flatIndex = -1;

                const renderItem = (r: SearchResult) => {
                  flatIndex++;
                  const idx = flatIndex;
                  return (
                    <button
                      key={`${r.type}-${idx}`}
                      onClick={() => {
                        setSearchOpen(false);
                        router.push(r.href);
                      }}
                      className={`w-full text-left px-3 py-2.5 flex items-center gap-3 text-[#5D0F17] ${
                        idx === activeIndex
                          ? "bg-[#5D0F17] text-[#F7F3EA]"
                          : "hover:bg-[#D8CABD]/40"
                      }`}
                    >
                      {r.type === "product" && r.image && (
                        <img
                          src={resizeImage(r.image, 120)}
                          alt=""
                          className="w-10 h-13 object-cover flex-shrink-0"
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                      <div className="flex-1 flex justify-between items-center min-w-0">
                        <span className="truncate">{r.name}</span>
                        {"meta" in r && r.meta && (
                          <span className="text-xs opacity-50 flex-shrink-0 ml-2">
                            {r.meta}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                };

                return (
                  <>
                    {designers.length > 0 && (
                      <div className="mb-2">
                        <p className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-[0.15em] text-[#5D0F17]/40 font-medium">Designers</p>
                        {designers.map(renderItem)}
                      </div>
                    )}
                    {cats.length > 0 && (
                      <div className="mb-2">
                        <p className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-[0.15em] text-[#5D0F17]/40 font-medium">Categories</p>
                        {cats.map(renderItem)}
                      </div>
                    )}
                    {storeResults.length > 0 && (
                      <div className="mb-2">
                        <p className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-[0.15em] text-[#5D0F17]/40 font-medium">Stores</p>
                        {storeResults.map(renderItem)}
                      </div>
                    )}
                    {products.length > 0 && (
                      <div className="mb-2">
                        <p className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-[0.15em] text-[#5D0F17]/40 font-medium">Products</p>
                        {products.map(renderItem)}
                      </div>
                    )}
                    {results.length > 0 && query.trim() && (
                      <button
                        onClick={() => {
                          setSearchOpen(false);
                          router.push(`/search?q=${encodeURIComponent(query.trim())}`);
                        }}
                        className="w-full text-left px-3 py-3 mt-2 border-t border-[#5D0F17]/10 text-sm text-[#5D0F17]/60 hover:text-[#5D0F17] transition-colors"
                      >
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
