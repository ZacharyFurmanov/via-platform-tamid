"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { stores } from "@/app/lib/stores";

type Product = {
  id: number;
  storeSlug: string;
  storeName: string;
  title: string;
  price: number;
  image: string | null;
};

type Pick = {
  pickId: number;
  weekStart: string;
  position: number;
  product: Product & { images: string | null; size: string | null; externalUrl: string | null };
};

export default function EditorsPicks() {
  const router = useRouter();
  const [picks, setPicks] = useState<Pick[]>([]);
  const [weekStart, setWeekStart] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [storeFilter, setStoreFilter] = useState(stores[0]?.slug ?? "");
  const [query, setQuery] = useState("");
  const [loadingPicks, setLoadingPicks] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);


  // Load current picks
  const loadPicks = useCallback(async () => {
    setLoadingPicks(true);
    try {
      const res = await fetch("/api/admin/editors-picks");
      if (res.status === 401) {
        router.replace("/admin/login?redirect=/admin/editors-picks");
        return;
      }
      const data = await res.json();
      setPicks(data.picks ?? []);
      setWeekStart(data.weekStart ?? "");
    } finally {
      setLoadingPicks(false);
    }
  }, [router]);

  useEffect(() => { loadPicks(); }, [loadPicks]);

  // Load products when store changes (browse mode) or query changes (search mode)
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);

    const doLoad = async () => {
      setLoadingProducts(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (storeFilter) params.set("store", storeFilter);
        const res = await fetch(`/api/admin/editors-picks/search?${params}`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products ?? []);
        }
      } finally {
        setLoadingProducts(false);
      }
    };

    // Debounce search queries, but load store browse immediately
    if (query.trim()) {
      searchTimer.current = setTimeout(doLoad, 250);
    } else {
      doLoad();
    }

    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [query, storeFilter]);

  const pickedIds = new Set(picks.map((p) => p.product.id));

  const handleToggle = async (product: Product) => {
    if (toggling !== null) return;
    setToggling(product.id);
    try {
      if (pickedIds.has(product.id)) {
        // Remove
        const pick = picks.find((p) => p.product.id === product.id);
        if (!pick) return;
        const res = await fetch("/api/admin/editors-picks", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id, weekStart: pick.weekStart }),
        });
        if (!res.ok) {
          const d = await res.json();
          alert(d.error ?? "Failed to remove");
          return;
        }
      } else {
        // Add
        if (picks.length >= 20) { alert("Maximum of 20 picks reached."); return; }
        const res = await fetch("/api/admin/editors-picks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id }),
        });
        if (!res.ok) {
          const d = await res.json();
          alert(d.error ?? "Failed to add");
          return;
        }
      }
      await loadPicks();
    } finally {
      setToggling(null);
    }
  };

  function formatWeek(dateStr: string) {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T00:00:00Z");
    return d.toLocaleDateString("en-US", {
      weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
    });
  }

  return (
    <main className="min-h-screen bg-[#F7F3EA] text-[#5D0F17] p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-6 mb-8">
          <Link href="/admin" className="text-xs uppercase tracking-widest text-[#5D0F17]/50 hover:text-[#5D0F17] transition">
            ← Back
          </Link>
          <h1 className="text-2xl font-serif">Editor&apos;s Picks</h1>
          {weekStart && (
            <span className="text-sm text-[#5D0F17]/50">Week of {formatWeek(weekStart)}</span>
          )}
          <span className="ml-auto text-sm font-medium">
            {loadingPicks ? "…" : picks.length} / 20 selected
          </span>
        </div>

        {/* Selected strip */}
        {!loadingPicks && picks.length > 0 && (
          <div className="mb-8">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[#5D0F17]/40 mb-3">Current Selections</p>
            <div className="flex flex-wrap gap-2">
              {picks.map((pick) => (
                <div
                  key={pick.pickId}
                  className="relative group cursor-pointer"
                  onClick={() => handleToggle(pick.product)}
                  title={pick.product.title}
                >
                  <div className="w-16 h-20 bg-[#D8CABD]/30 overflow-hidden">
                    {pick.product.image
                      ? <img src={pick.product.image} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full" />
                    }
                  </div>
                  {/* Remove overlay */}
                  <div className="absolute inset-0 bg-[#5D0F17]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-[#F7F3EA] text-[10px] uppercase tracking-wide">Remove</span>
                  </div>
                  {/* Position badge */}
                  <div className="absolute top-1 left-1 w-4 h-4 bg-[#5D0F17] flex items-center justify-center">
                    <span className="text-[#F7F3EA] text-[9px] leading-none">{pick.position + 1}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <select
            value={storeFilter}
            onChange={(e) => { setStoreFilter(e.target.value); setQuery(""); }}
            className="border border-[#5D0F17]/30 bg-[#F7F3EA] px-4 py-2.5 text-sm outline-none focus:border-[#5D0F17] text-[#5D0F17]"
          >
            {stores.map((s) => (
              <option key={s.slug} value={s.slug}>{s.name}</option>
            ))}
          </select>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name…"
            className="flex-1 border border-[#5D0F17]/30 bg-transparent px-4 py-2.5 text-sm outline-none focus:border-[#5D0F17] placeholder:text-[#5D0F17]/30"
          />
        </div>

        {/* Product grid */}
        {loadingProducts ? (
          <p className="text-sm text-[#5D0F17]/40">Loading products…</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-[#5D0F17]/40">No products found.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {products.map((product) => {
              const isPicked = pickedIds.has(product.id);
              const isToggling = toggling === product.id;
              const atLimit = picks.length >= 20 && !isPicked;

              return (
                <button
                  key={product.id}
                  onClick={() => !atLimit && handleToggle(product)}
                  disabled={isToggling || atLimit}
                  className={`relative text-left group transition ${
                    atLimit ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  {/* Image */}
                  <div className={`relative w-full aspect-[3/4] overflow-hidden ${
                    isPicked ? "ring-2 ring-[#5D0F17]" : ""
                  }`}>
                    {product.image
                      ? <img src={product.image} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-[#D8CABD]/30" />
                    }

                    {/* Hover overlay */}
                    {!isPicked && !atLimit && (
                      <div className="absolute inset-0 bg-[#5D0F17]/0 group-hover:bg-[#5D0F17]/20 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 text-[#F7F3EA] text-[10px] uppercase tracking-wide transition-opacity bg-[#5D0F17] px-2 py-1">
                          + Pick
                        </span>
                      </div>
                    )}

                    {/* Selected checkmark */}
                    {isPicked && (
                      <div className="absolute inset-0 bg-[#5D0F17]/10 group-hover:bg-[#5D0F17]/30 transition-colors flex items-center justify-center">
                        <div className="w-7 h-7 bg-[#5D0F17] flex items-center justify-center opacity-80 group-hover:opacity-0 transition-opacity">
                          <span className="text-[#F7F3EA] text-sm">✓</span>
                        </div>
                        <span className="absolute opacity-0 group-hover:opacity-100 text-[#F7F3EA] text-[10px] uppercase tracking-wide transition-opacity bg-[#5D0F17] px-2 py-1">
                          Remove
                        </span>
                      </div>
                    )}

                    {isToggling && (
                      <div className="absolute inset-0 bg-[#F7F3EA]/60 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-[#5D0F17] border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Caption */}
                  <div className="pt-1.5">
                    <p className="text-[10px] leading-snug text-[#5D0F17] line-clamp-2">{product.title}</p>
                    <p className="text-[9px] text-[#5D0F17]/50 mt-0.5">${Math.round(product.price)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
