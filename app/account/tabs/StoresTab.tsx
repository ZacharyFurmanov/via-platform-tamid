"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { stores as allStores } from "@/app/lib/stores";

type FavStore = { slug: string; name: string; location: string; image?: string };

export default function StoresTab({ userId: _userId }: { userId: string }) {
 const [stores, setStores] = useState<FavStore[]>([]);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 fetch("/api/favorites/store")
 .then((r) => r.json())
 .then((data) => {
 const slugs: string[] = data.storeSlugs ?? [];
 const enriched = slugs
 .map((slug) => {
 const s = allStores.find((st) => st.slug === slug);
 return s ? { slug: s.slug, name: s.name, location: s.location, image: s.image } : null;
 })
 .filter(Boolean) as FavStore[];
 setStores(enriched);
 })
 .catch(() => {})
 .finally(() => setLoading(false));
 }, []);

 if (loading) {
 return (
 <div className="flex flex-col gap-3">
 {[...Array(3)].map((_, i) => (
 <div key={i} className="h-16 bg-[#5D0F17]/10 animate-pulse rounded" />
 ))}
 </div>
 );
 }

 if (stores.length === 0) {
 return (
 <div className="text-center py-12">
 <div className="w-12 h-12 mx-auto mb-4 border border-[#5D0F17]/20 flex items-center justify-center">
 <svg className="w-5 h-5 text-[#5D0F17]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
 </svg>
 </div>
 <p className="font-serif text-lg mb-1">No stores saved</p>
 <p className="text-sm text-[#5D0F17]/50 mb-6">Follow stores to stay updated on their new arrivals.</p>
 <Link href="/stores" className="inline-block bg-[#5D0F17] text-[#FFFDF8] px-6 py-3 text-xs uppercase tracking-[0.15em] hover:bg-[#5D0F17]/85 transition">
 Explore Stores
 </Link>
 </div>
 );
 }

 return (
 <div className="flex flex-col gap-2">
 {stores.map((store) => (
 <Link
 key={store.slug}
 href={`/stores/${store.slug}`}
 className="flex items-center gap-4 p-4 border border-[#5D0F17]/10 hover:border-[#5D0F17]/30 transition"
 >
 <div className="w-10 h-10 bg-[#D8CABD]/40 overflow-hidden shrink-0">
 {store.image ? (
 <img src={store.image} alt={store.name} className="w-full h-full object-cover" />
 ) : (
 <div className="w-full h-full" />
 )}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium text-[#5D0F17] truncate">{store.name}</p>
 <p className="text-[10px] text-[#5D0F17]/40 uppercase tracking-wide">{store.location}</p>
 </div>
 <svg className="w-4 h-4 text-[#5D0F17]/30 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
 </svg>
 </Link>
 ))}
 </div>
 );
}
