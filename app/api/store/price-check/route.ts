import { NextRequest, NextResponse } from "next/server";
import { resolveStoreSlugAny } from "@/app/lib/storeAuth";
import { getMarketReferenceFast, computePriceFlag } from "@/app/lib/price-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Lightweight always-on price check for the listing form. Given what the seller has entered so
// far, price the item off our OWN data first (cache / benchmark / VYA sold + listings) and return
// the market range + an over/under-market flag. No drafting, no reverse-image — cheap and fast,
// meant to fire on price blur. The market value is item-level, so the client caches it and
// recomputes the flag instantly as the seller edits the price (no repeat server calls).
export async function POST(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const body = await request.json().catch(() => null);
 const price = Number(body?.price);
 const brand = typeof body?.brand === "string" ? body.brand.trim() : "";
 const title = typeof body?.title === "string" ? body.title.trim() : "";
 const era = typeof body?.era === "string" ? body.era.trim() : "";
 const material = typeof body?.material === "string" ? body.material.trim() : "";
 const category = typeof body?.category === "string" ? body.category.trim() : "";

 const baseTitle = title || [era, material, category].filter(Boolean).join(" ");
 const query = brand && !baseTitle.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${baseTitle}` : baseTitle;
 if (!query.trim()) return NextResponse.json({ estimate: null, priceFlag: null }); // not enough context yet

 // Fast owned-data reference only (no Claude, no live comps) — the flag must feel instant.
 const estimate = await getMarketReferenceFast({ query, brand: brand || null }).catch(() => null);

 const sellerCents = Math.round(price * 100);
 const priceFlag = estimate?.marketCents && sellerCents > 0
 ? computePriceFlag(sellerCents, estimate.marketCents, estimate.lowCents, estimate.highCents)
 : null;

 return NextResponse.json({
 estimate: estimate?.marketCents
 ? { marketCents: estimate.marketCents, lowCents: estimate.lowCents, highCents: estimate.highCents, suggestedCents: estimate.suggestedCents }
 : null,
 priceFlag,
 });
}
