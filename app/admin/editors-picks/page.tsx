"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { stores } from "@/app/lib/stores";
import AdminNav from "@/app/components/AdminNav";

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
  position: number;
  product: Product & { images: string | null; size: string | null; externalUrl: string | null };
};

export default function EditorsPicks() {
  const router = useRouter();
  const [picks, setPicks] = useState<Pick[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [storeFilter, setStoreFilter] = useState("");
  const [query, setQuery] = useState("");
  const [loadingPicks, setLoadingPicks] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    } finally {
      setLoadingPicks(false);
    }
  }, [router]);

  useEffect(() => { loadPicks(); }, [loadPicks]);

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
        const res = await fetch("/api/admin/editors-picks", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id }),
        });
        if (!res.ok) {
          const d = await res.json();
          alert(d.error ?? "Failed to remove");
          return;
        }
      } else {
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

  return (
    <main style={{ minHeight: "100vh", background: "#F7F3EA" }}>
      <AdminNav />

      {/* Page title */}
      <section style={{ background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 className="font-serif" style={{ fontSize: 28, color: "#5D0F17", marginBottom: 4 }}>
              Editor&apos;s Picks
            </h1>
            <p style={{ fontSize: 14, color: "rgba(93,15,23,0.5)" }}>
              Curate featured products shown on the homepage.
            </p>
          </div>
          <span style={{ fontSize: 14, color: "#5D0F17", fontWeight: 600 }}>
            {loadingPicks ? "…" : picks.length} selected
          </span>
        </div>
      </section>

      {/* Content */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>

        {/* Selected strip */}
        {!loadingPicks && picks.length > 0 && (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", padding: 20, marginBottom: 24 }}>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: "rgba(93,15,23,0.4)", marginBottom: 12 }}>
              Current Selections
            </p>
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
                  <div className="absolute inset-0 bg-[#5D0F17]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-[#F7F3EA] text-[10px] uppercase tracking-wide">Remove</span>
                  </div>
                  <div className="absolute top-1 left-1 w-4 h-4 bg-[#5D0F17] flex items-center justify-center">
                    <span className="text-[#F7F3EA] text-[9px] leading-none">{pick.position + 1}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", padding: 20, marginBottom: 24 }}>
          <div className="flex gap-3">
            <select
              value={storeFilter}
              onChange={(e) => { setStoreFilter(e.target.value); setQuery(""); }}
              className="border px-4 py-2.5 text-sm outline-none"
              style={{ borderColor: "rgba(93,15,23,0.3)", background: "#fff", color: "#5D0F17" }}
            >
              <option value="">All Stores</option>
              {stores.map((s) => (
                <option key={s.slug} value={s.slug}>{s.name}</option>
              ))}
            </select>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name…"
              className="flex-1 border px-4 py-2.5 text-sm outline-none"
              style={{ borderColor: "rgba(93,15,23,0.3)", background: "#fff", color: "#5D0F17" }}
            />
          </div>
        </div>

        {/* Product grid */}
        {loadingProducts ? (
          <p style={{ fontSize: 13, color: "rgba(93,15,23,0.4)" }}>Loading products…</p>
        ) : products.length === 0 ? (
          <p style={{ fontSize: 13, color: "rgba(93,15,23,0.4)" }}>No products found.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {products.map((product) => {
              const isPicked = pickedIds.has(product.id);
              const isToggling = toggling === product.id;

              return (
                <button
                  key={product.id}
                  onClick={() => handleToggle(product)}
                  disabled={isToggling}
                  className="relative text-left group transition cursor-pointer"
                >
                  <div className={`relative w-full aspect-[3/4] overflow-hidden ${isPicked ? "ring-2 ring-[#5D0F17]" : ""}`}>
                    {product.image
                      ? <img src={product.image} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-[#D8CABD]/30" />
                    }

                    {!isPicked && (
                      <div className="absolute inset-0 bg-[#5D0F17]/0 group-hover:bg-[#5D0F17]/20 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 text-[#F7F3EA] text-[10px] uppercase tracking-wide transition-opacity bg-[#5D0F17] px-2 py-1">
                          + Pick
                        </span>
                      </div>
                    )}

                    {isPicked && (
                      <div className="absolute inset-0 bg-[#5D0F17]/10 group-hover:bg-[#5D0F17]/30 transition-colors flex items-center justify-center">
                        <div className="w-7 h-7 bg-[#5D0F17] flex items-center justify-center opacity-80 group-hover:hidden">
                          <span className="text-[#F7F3EA] text-sm">✓</span>
                        </div>
                        <span className="hidden group-hover:inline text-[#F7F3EA] text-[10px] uppercase tracking-wide bg-[#5D0F17] px-2 py-1">
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
