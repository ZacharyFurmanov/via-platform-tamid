"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, Menu, X, ShoppingCart, User } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCart } from "./CartProvider";
import { useFriends } from "./FriendsProvider";

import { stores } from "@/app/lib/stores";
import { resizeImage } from "@/app/lib/imageUtils";
import { COLLECTIONS } from "@/app/lib/collections-config";
import { navCategoryGroups } from "@/app/lib/categoryMap";

type SearchResult =
 | { type: "designer"; name: string; href: string }
 | { type: "category"; name: string; href: string }
 | { type: "store"; name: string; href: string; meta?: string }
 | { type: "product"; name: string; href: string; meta: string; image?: string };

const FONT: React.CSSProperties = { fontFamily: "'Cormorant Garamond', Georgia, serif" };
const HEADER_H = 56;
const MENU_TOP = HEADER_H;

const NAV_ITEM = "text-[12px] uppercase tracking-[0.1em] text-[#5D0F17] hover:text-[#5D0F17]/50 transition-colors duration-200 whitespace-nowrap";
const DROP_PANEL = "bg-white border border-gray-200 shadow-md";
const DROP_LINK = "block px-4 py-1.5 text-[12px] text-[#5D0F17] normal-case tracking-normal hover:bg-gray-50 transition-colors";
const DROP_FOOT = "border-t border-gray-100 px-4 py-2 text-[10px] uppercase tracking-[0.1em] text-[#5D0F17]/50 hover:text-[#5D0F17] hover:bg-gray-50 transition-colors block";

export default function HeaderClient({
 categories,
 activeCollectionSlugs,
 topDesigners = [],
}: {
 categories: { slug: string; label: string }[];
 activeCollectionSlugs: Set<string>;
 topDesigners?: { slug: string; label: string }[];
}) {

 // ── UI state ─────────────────────────────────────────────────
 const [activeDrawer, setActiveDrawer] = useState<"search" | "cart" | "account" | null>(null);
 const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
 const [scrolled, setScrolled] = useState(false);
 const [isHovered, setIsHovered] = useState(false);
 const pathname = usePathname();
 const [query, setQuery] = useState("");
 const [activeIndex, setActiveIndex] = useState(-1);
 const searchInputRef = useRef<HTMLInputElement>(null);
 const [storesOpen, setStoresOpen] = useState(false);
 const [catsOpen, setCatsOpen] = useState(false);
 const [designersOpen, setDesignersOpen] = useState(false);
 const [colsOpen, setColsOpen] = useState(false);
 const [mobileStores, setMobileStores] = useState(false);
 const [mobileCats, setMobileCats] = useState(false);
 const [mobileDesigners, setMobileDesigners] = useState(false);
 const [mobileCols, setMobileCols] = useState(false);
 const router = useRouter();
 const { data: session } = useSession();
 const { items: cartItems, itemCount, removeItem } = useCart();
 const { pendingCount } = useFriends();

 const storesRef = useRef<HTMLDivElement>(null);
 const catsRef = useRef<HTMLDivElement>(null);
 const designersRef = useRef<HTMLDivElement>(null);
 const colsRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
 const h = (e: MouseEvent) => {
 if (storesRef.current && !storesRef.current.contains(e.target as Node)) setStoresOpen(false);
 if (catsRef.current && !catsRef.current.contains(e.target as Node)) setCatsOpen(false);
 if (designersRef.current && !designersRef.current.contains(e.target as Node)) setDesignersOpen(false);
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
 const onScroll = () => setScrolled(window.scrollY > window.innerHeight * 0.75);
 onScroll();
 window.addEventListener("scroll", onScroll, { passive: true });
 return () => window.removeEventListener("scroll", onScroll);
 }, []);

 useEffect(() => {
 document.body.style.overflow = (mobileMenuOpen || activeDrawer !== null) ? "hidden" : "";
 return () => { document.body.style.overflow = ""; };
 }, [mobileMenuOpen, activeDrawer]);

 const isTransparent = pathname === "/" && scrolled && !isHovered;

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
 if (activeDrawer !== "search") return;
 const onKey = (e: KeyboardEvent) => {
 if (e.key === "Escape") setActiveDrawer(null);
 if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)); }
 if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, -1)); }
 if (e.key === "Enter" && query.trim()) {
 e.preventDefault();
 setActiveDrawer(null);
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
 }, [activeDrawer, results, activeIndex, router, query]);

 useEffect(() => { if (activeDrawer !== "search") { setQuery(""); setActiveIndex(-1); } }, [activeDrawer]);

 const closeSearch = (href?: string) => {
 searchInputRef.current?.blur();
 setActiveDrawer(null);
 setQuery("");
 if (href) router.push(href);
 };

 const closeDropdowns = () => { setStoresOpen(false); setCatsOpen(false); setDesignersOpen(false); setColsOpen(false); };

 return (
 <>
 {/* ── Header ───────────────────────────────────────────── */}
 <div
 className={`fixed top-0 z-[60] w-full transition-colors duration-300 ${isTransparent ? "bg-transparent" : "bg-[#FFFDF8]"}`}
 style={{ height: HEADER_H }}
 onMouseEnter={() => setIsHovered(true)}
 onMouseLeave={() => setIsHovered(false)}
 >
 <div className="max-w-7xl mx-auto px-6 h-full flex items-center gap-6 relative">

 {/* Mobile logo — always left */}
 <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex-shrink-0 flex items-start gap-1.5 md:hidden">
 <img src="/vya-logo.png" alt="VYA" className="h-7 w-auto" />
 <span className="text-[9px] uppercase tracking-[0.2em] text-[#5D0F17]/50 font-cormorant mt-0.5">pilot</span>
 </Link>

 {/* Desktop logo — left only when not scrolled */}
 {!scrolled && (
 <Link href="/" onClick={() => setMobileMenuOpen(false)} className="hidden md:flex flex-shrink-0 items-start gap-1.5">
 <img src="/vya-logo.png" alt="VYA" className="h-8 w-auto" />
 <span className="text-[9px] uppercase tracking-[0.2em] text-[#5D0F17]/50 font-cormorant mt-0.5">pilot</span>
 </Link>
 )}

 {/* Desktop Nav */}
 <nav className="hidden md:flex items-center gap-7 flex-1" style={FONT}>

 {/* Stores */}
 <div
 className="relative flex items-center"
 ref={storesRef}
 onMouseEnter={() => { setStoresOpen(true); setCatsOpen(false); setDesignersOpen(false); setColsOpen(false); }}
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
 className="relative flex items-center"
 ref={catsRef}
 onMouseEnter={() => { setCatsOpen(true); setStoresOpen(false); setDesignersOpen(false); setColsOpen(false); }}
 onMouseLeave={() => setCatsOpen(false)}
 >
 <button onClick={() => { closeDropdowns(); setCatsOpen(true); }} className={NAV_ITEM}>
 Categories
 </button>
 <div className={`absolute left-0 top-full pt-3 z-50 transition-all duration-200 ${catsOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-1"}`}>
 <div className={`${DROP_PANEL} w-max`}>
 <div className="flex gap-0 py-4 px-2">
 {navCategoryGroups.map((group) => (
 <div key={group.slug} className="px-4 min-w-[130px]">
 <Link
 href={`/categories/${group.slug}`}
 onClick={() => setCatsOpen(false)}
 className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-[#5D0F17] mb-2 hover:text-[#5D0F17]/60 transition-colors"
 >
 {group.label}
 </Link>
 <div className="space-y-0.5">
 {group.subs.map((sub) => (
 <Link
 key={sub.slug}
 href={`/categories/${sub.slug}`}
 onClick={() => setCatsOpen(false)}
 className="block py-1 text-[12px] text-[#5D0F17]/70 normal-case tracking-normal hover:text-[#5D0F17] transition-colors"
 >
 {sub.label}
 </Link>
 ))}
 </div>
 </div>
 ))}
 </div>
 <Link href="/categories" onClick={() => setCatsOpen(false)} className={DROP_FOOT}>All Categories</Link>
 </div>
 </div>
 </div>

 {/* Designers */}
 <div
  className="relative flex items-center"
  ref={designersRef}
  onMouseEnter={() => { setDesignersOpen(true); setStoresOpen(false); setCatsOpen(false); setColsOpen(false); }}
  onMouseLeave={() => setDesignersOpen(false)}
 >
  <button onClick={() => { closeDropdowns(); setDesignersOpen(true); }} className={NAV_ITEM}>
   Designers
  </button>
  <div className={`absolute left-0 top-full pt-3 z-50 transition-all duration-200 ${designersOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-1"}`}>
   <div className={`${DROP_PANEL} min-w-[160px]`}>
    <div className="py-1">
     {topDesigners.map((d) => (
      <Link key={d.slug} href={`/brands/${d.slug}`} onClick={() => setDesignersOpen(false)} className={DROP_LINK}>
       {d.label}
      </Link>
     ))}
    </div>
    <Link href="/brands" onClick={() => setDesignersOpen(false)} className={DROP_FOOT}>All Designers</Link>
   </div>
  </div>
 </div>

 {/* Collections */}
 <div
 className="relative flex items-center"
 ref={colsRef}
 onMouseEnter={() => { setColsOpen(true); setStoresOpen(false); setCatsOpen(false); setDesignersOpen(false); }}
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

 {/* Center logo — desktop only when scrolled */}
 {scrolled && (
 <div className="hidden md:block absolute left-1/2 -translate-x-1/2">
 <Link href="/" onClick={() => setMobileMenuOpen(false)}>
 <img src="/via-logo-mark.png" alt="VYA" className="h-9 w-auto" />
 </Link>
 </div>
 )}

 {/* Right actions */}
 <div className="flex items-center gap-2 ml-auto">

 {/* Inline search — desktop */}
 <button
 aria-label="Search"
 onClick={() => setActiveDrawer("search")}
 className="hidden md:flex items-center gap-2 px-2 py-1 text-[11px] uppercase tracking-[0.12em] text-[#5D0F17]/50 hover:text-[#5D0F17] transition-colors duration-200 group"
 style={FONT}
 >
 <Search size={13} strokeWidth={1.5} />
 <span className="border-b border-transparent group-hover:border-[#5D0F17]/40 transition-colors duration-200">Search</span>
 </button>

 {/* Search icon — mobile */}
 <button
 aria-label="Search"
 onClick={() => setActiveDrawer("search")}
 className="md:hidden p-2 text-[#5D0F17] min-w-[44px] min-h-[44px] flex items-center justify-center"
 >
 <Search size={20} />
 </button>

 {/* Cart */}
 <button
 aria-label="Cart"
 onClick={() => setActiveDrawer("cart")}
 className="relative p-2 text-[#5D0F17] min-w-[44px] min-h-[44px] flex items-center justify-center hover:text-[#5D0F17]/60 transition-colors"
 >
 <ShoppingCart size={18} strokeWidth={1.5} />
 {itemCount > 0 && (
 <span className="absolute -top-0.5 -right-0.5 bg-[#5D0F17] text-white text-[10px] font-medium min-w-[17px] min-h-[17px] flex items-center justify-center rounded-full leading-none px-0.5">
 {itemCount}
 </span>
 )}
 </button>

 {/* Sign In / Account — desktop */}
 <button
 aria-label={session ? "Account" : "Sign in"}
 onClick={() => setActiveDrawer("account")}
 className="hidden md:flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-[#5D0F17] hover:text-[#5D0F17]/50 transition-colors"
 style={FONT}
 >
 {session?.user?.image
 ? <img src={session.user.image} alt="" className="w-5 h-5 rounded-full" />
 : <User size={17} strokeWidth={1.5} />
 }
 {pendingCount > 0 && <span className="w-1.5 h-1.5 bg-[#5D0F17] rounded-full flex-shrink-0" />}
 </button>

 {/* Account icon — mobile */}
 <Link
 href={session ? "/account" : "/login"}
 className="md:hidden p-2 text-[#5D0F17] min-w-[44px] min-h-[44px] flex items-center justify-center"
 >
 {session?.user?.image
 ? <img src={session.user.image} alt="" className="w-5 h-5 rounded-full" />
 : <User size={20} strokeWidth={1.5} />
 }
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
 <div className={`overflow-hidden transition-all duration-300 ease-out ${mobileCats ? "max-h-[9999px] opacity-100" : "max-h-0 opacity-0"}`}>
 <div className="pb-4 pl-4 space-y-3">
 {navCategoryGroups.map((group) => (
 <div key={group.slug}>
 <Link
 href={`/categories/${group.slug}`}
 onClick={() => setMobileMenuOpen(false)}
 className="block py-1.5 text-[13px] font-semibold text-[#5D0F17] uppercase tracking-[0.06em]"
 >
 {group.label}
 </Link>
 {group.subs.map((sub) => (
 <Link
 key={sub.slug}
 href={`/categories/${sub.slug}`}
 onClick={() => setMobileMenuOpen(false)}
 className="block py-1 pl-3 text-[12px] text-[#5D0F17]/65 normal-case hover:text-[#5D0F17] transition-colors"
 >
 {sub.label}
 </Link>
 ))}
 </div>
 ))}
 <Link href="/categories" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-[11px] uppercase tracking-[0.08em] text-[#5D0F17]/40">All Categories</Link>
 </div>
 </div>
 </li>

 <li className="border-b border-gray-100">
 <button onClick={() => setMobileDesigners(!mobileDesigners)} className="w-full flex items-center justify-between py-4 text-[13px] text-[#5D0F17] uppercase tracking-[0.08em]">
  Designers <span className={`text-[#5D0F17]/40 text-xs transition-transform duration-200 ${mobileDesigners ? "rotate-180" : ""}`}>▾</span>
 </button>
 <div className={`overflow-hidden transition-all duration-300 ease-out ${mobileDesigners ? "max-h-[9999px] opacity-100" : "max-h-0 opacity-0"}`}>
  <div className="pb-4 pl-4 space-y-1">
   {topDesigners.map((d) => (
    <Link key={d.slug} href={`/brands/${d.slug}`} onClick={() => setMobileMenuOpen(false)} className="block py-2 text-[13px] text-[#5D0F17]/70 hover:text-[#5D0F17] transition-colors">{d.label}</Link>
   ))}
   <Link href="/brands" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-[11px] uppercase tracking-[0.08em] text-[#5D0F17]/40 hover:text-[#5D0F17] transition-colors">All Designers</Link>
  </div>
 </div>
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

 {/* ── Right-side Drawer (Search / Cart / Account) ───────── */}
 {activeDrawer && (
 <>
  {/* Backdrop */}
  <div
  className="fixed inset-0 z-[65] bg-black/20"
  onClick={() => { setActiveDrawer(null); setQuery(""); }}
  />
  {/* Panel */}
  <div className="fixed right-0 top-0 bottom-0 z-[70] w-full max-w-sm bg-white shadow-2xl flex flex-col" style={FONT}>
  {/* Drawer header */}
  <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
   <span className="text-[11px] uppercase tracking-[0.15em] text-[#5D0F17]">
   {activeDrawer === "search" ? "Search" : activeDrawer === "cart" ? `Cart (${itemCount})` : session?.user?.name ?? "Account"}
   </span>
   <button onClick={() => { setActiveDrawer(null); setQuery(""); }} className="text-[#5D0F17]/40 hover:text-[#5D0F17] transition-colors">
   <X size={16} strokeWidth={1.5} />
   </button>
  </div>

  {/* ── Search panel ── */}
  {activeDrawer === "search" && (
   <div className="flex flex-col flex-1 min-h-0">
   <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 flex-shrink-0">
    <Search size={13} strokeWidth={1.5} className="text-gray-400 flex-shrink-0" />
    <input
    ref={searchInputRef}
    autoFocus
    value={query}
    onChange={(e) => setQuery(e.target.value)}
    placeholder="Search items or stores..."
    className="flex-1 text-[14px] outline-none bg-transparent text-[#5D0F17] placeholder:text-gray-400"
    />
   </div>
   <div className="overflow-y-auto flex-1 pb-4">
    {!query.trim() && (
    <div>
     <p className="px-6 pt-4 pb-2 text-[9px] uppercase tracking-[0.18em] text-gray-400 font-medium">Browse by Category</p>
     <div className="px-6 pb-4 grid grid-cols-2 gap-2">
     {[{ slug: "clothing", label: "Clothing" }, { slug: "bags", label: "Bags" }, { slug: "shoes", label: "Shoes" }, { slug: "accessories", label: "Accessories" }].map((c) => (
      <button key={c.slug} onClick={() => closeSearch(`/categories/${c.slug}`)} className="border border-gray-200 py-2 text-[11px] uppercase tracking-[0.1em] text-center text-gray-600 hover:bg-[#5D0F17] hover:text-white hover:border-[#5D0F17] transition-colors">{c.label}</button>
     ))}
     </div>
     <p className="px-6 py-2 text-[9px] uppercase tracking-[0.18em] text-gray-400 font-medium border-t border-gray-100">Our Stores</p>
     {stores.map((s) => (
     <button key={s.slug} onClick={() => closeSearch(`/stores/${s.slug}`)} className="w-full text-left px-6 py-2.5 hover:bg-gray-50 flex items-center justify-between text-[#5D0F17] transition-colors">
      <span className="text-[13px]">{s.name}</span>
      <span className="text-[11px] text-gray-400">{s.location}</span>
     </button>
     ))}
    </div>
    )}
    {searchLoading && results.length === 0 && <p className="text-[13px] text-gray-400 px-6 py-4">Searching...</p>}
    {!searchLoading && query.trim().length >= 2 && results.length === 0 && <p className="text-[13px] text-gray-400 px-6 py-4">No results found</p>}
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
     <button key={`${r.type}-${idx}`} onClick={() => closeSearch(r.href)} className={`w-full text-left px-6 py-2.5 flex items-center gap-3 text-[#5D0F17] transition-colors ${idx === activeIndex ? "bg-[#5D0F17] text-white" : "hover:bg-gray-50"}`}>
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
     {designers.length > 0 && <div className="mb-1"><p className="px-6 pt-3 pb-1 text-[9px] uppercase tracking-[0.18em] text-gray-400 font-medium">Designers</p>{designers.map(renderItem)}</div>}
     {cats.length > 0 && <div className="mb-1"><p className="px-6 pt-3 pb-1 text-[9px] uppercase tracking-[0.18em] text-gray-400 font-medium">Categories</p>{cats.map(renderItem)}</div>}
     {storeResults.length > 0 && <div className="mb-1"><p className="px-6 pt-3 pb-1 text-[9px] uppercase tracking-[0.18em] text-gray-400 font-medium">Stores</p>{storeResults.map(renderItem)}</div>}
     {products.length > 0 && <div className="mb-1"><p className="px-6 pt-3 pb-1 text-[9px] uppercase tracking-[0.18em] text-gray-400 font-medium">Products</p>{products.map(renderItem)}</div>}
     {results.length > 0 && query.trim() && (
      <button onClick={() => closeSearch(`/search?q=${encodeURIComponent(query.trim())}`)} className="w-full text-left px-6 py-3 mt-2 border-t border-gray-100 text-[12px] text-gray-500 hover:text-[#5D0F17] transition-colors">
      See all results for &ldquo;{query.trim()}&rdquo;
      </button>
     )}
     </>
    );
    })()}
   </div>
   </div>
  )}

  {/* ── Cart panel ── */}
  {activeDrawer === "cart" && (
   <div className="flex flex-col flex-1 min-h-0">
   {cartItems.length === 0 ? (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
    <ShoppingCart size={32} strokeWidth={1} className="text-[#5D0F17]/20" />
    <p className="text-[13px] text-[#5D0F17]/50">Your shopping cart is empty</p>
    <Link href="/categories/clothing" onClick={() => setActiveDrawer(null)} className="border border-[#5D0F17] px-6 py-2.5 text-[11px] uppercase tracking-[0.12em] text-[#5D0F17] hover:bg-[#5D0F17] hover:text-white transition-colors">
     Explore Products
    </Link>
    </div>
   ) : (
    <>
    <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
     {cartItems.map((item) => (
     <div key={item.compositeId} className="flex gap-3 px-6 py-4">
      {item.image && <img src={resizeImage(item.image, 160)} alt={item.title} className="w-16 h-20 object-cover flex-shrink-0" />}
      <div className="flex-1 min-w-0">
      <p className="text-[12px] text-[#5D0F17] leading-snug line-clamp-2">{item.title}</p>
      <p className="text-[11px] text-[#5D0F17]/50 mt-0.5">{item.storeName}</p>
      <p className="text-[12px] text-[#5D0F17] mt-1">${item.price}</p>
      </div>
      <button onClick={() => removeItem(item.compositeId)} className="text-[#5D0F17]/30 hover:text-[#5D0F17] transition-colors flex-shrink-0 self-start mt-0.5">
      <X size={14} />
      </button>
     </div>
     ))}
    </div>
    <div className="border-t border-gray-100 px-6 py-4 flex-shrink-0">
     <Link href="/cart" onClick={() => setActiveDrawer(null)} className="block w-full text-center bg-[#5D0F17] text-white py-3 text-[11px] uppercase tracking-[0.12em] hover:bg-[#5D0F17]/90 transition-colors">
     View Full Cart
     </Link>
    </div>
    </>
   )}
   </div>
  )}

  {/* ── Account panel ── */}
  {activeDrawer === "account" && (
   <div className="flex flex-col flex-1 min-h-0 px-6 py-6">
   {session ? (
    <>
    {session.user?.name && (
     <p className="text-[15px] text-[#5D0F17] font-serif mb-5">{session.user.name}</p>
    )}
    <div className="divide-y divide-gray-100 flex-1">
     <Link href="/account" onClick={() => setActiveDrawer(null)} className="block py-3.5 text-[12px] text-[#5D0F17] hover:text-[#5D0F17]/50 transition-colors uppercase tracking-[0.1em]">Account</Link>
     <Link href="/account/favorites" onClick={() => setActiveDrawer(null)} className="block py-3.5 text-[12px] text-[#5D0F17] hover:text-[#5D0F17]/50 transition-colors uppercase tracking-[0.1em]">Favorites</Link>
     <Link href="/you-might-like" onClick={() => setActiveDrawer(null)} className="block py-3.5 text-[12px] text-[#5D0F17] hover:text-[#5D0F17]/50 transition-colors uppercase tracking-[0.1em]">You Might Like</Link>
    </div>
    <Link href="/api/auth/signout" className="block w-full text-center border border-gray-200 py-2.5 text-[11px] uppercase tracking-[0.12em] text-[#5D0F17]/50 hover:border-[#5D0F17] hover:text-[#5D0F17] transition-colors mt-4">
     Log Out
    </Link>
    </>
   ) : (
    <div className="flex flex-col gap-3">
    <Link href="/login" onClick={() => setActiveDrawer(null)} className="block w-full text-center bg-[#5D0F17] text-white py-3 text-[11px] uppercase tracking-[0.12em] hover:bg-[#5D0F17]/90 transition-colors">
     Sign In
    </Link>
    </div>
   )}
   </div>
  )}
  </div>
 </>
 )}
 </>
 );
}
