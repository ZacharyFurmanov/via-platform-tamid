import { NextRequest, NextResponse } from "next/server";
import { getItem } from "@/app/lib/db/inventory";
import { getSellerById } from "@/app/lib/db/sellers";
import { getShippingSettings } from "@/app/lib/store-shipping-db";

export const dynamic = "force-dynamic";

// GET ?item=ID — what the buyer checkout page needs: the item, the store, and
// whether shipping is free for this piece (so the page knows to quote a rate or not).
export async function GET(request: NextRequest) {
 const itemId = request.nextUrl.searchParams.get("item") || "";
 if (!itemId) return NextResponse.json({ error: "item required" }, { status: 400 });

 const item = await getItem(itemId);
 if (!item || item.status !== "active") return NextResponse.json({ error: "This piece is no longer available." }, { status: 409 });
 const seller = await getSellerById(item.sellerId);
 const shipping = seller ? await getShippingSettings(seller.slug) : null;

 const mode = shipping?.mode ?? "buyer_pays";
 const threshold = shipping?.freeThresholdCents ?? null;
 const freeShipping = mode === "store_pays" || (mode === "free_over" && threshold != null && item.priceCents >= threshold);

 return NextResponse.json({
 item: { id: item.id, title: item.title, priceCents: item.priceCents, currency: item.currency, image: item.images?.[0] || null },
 storeName: seller?.name || "the store",
 freeShipping,
 });
}
