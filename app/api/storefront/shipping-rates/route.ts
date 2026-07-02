import { NextRequest, NextResponse } from "next/server";
import { getItem } from "@/app/lib/db/inventory";
import { getSellerById } from "@/app/lib/db/sellers";
import { getShippingSettings, hasShipFrom } from "@/app/lib/store-shipping-db";
import { getRates, isShippoConfigured } from "@/app/lib/shippo";

export const dynamic = "force-dynamic";

// POST { itemId, toAddress } — live shipping options for the buyer's address.
// Returns { free: true } when the store covers shipping for this piece, or the
// cheapest 1–2 rates when the buyer pays. Falls back to free if rates can't be
// computed (Shippo off / no ship-from) so a sale is never blocked.
export async function POST(request: NextRequest) {
 const body = await request.json().catch(() => null);
 const itemId = String(body?.itemId || "");
 const to = body?.toAddress || {};
 if (!itemId || !to.street1 || !to.city || !to.zip) return NextResponse.json({ error: "Item and a full address are required." }, { status: 400 });

 const item = await getItem(itemId);
 if (!item || item.status !== "active") return NextResponse.json({ error: "This piece is no longer available." }, { status: 409 });
 const seller = await getSellerById(item.sellerId);
 if (!seller) return NextResponse.json({ error: "Seller not found." }, { status: 404 });

 const shipping = await getShippingSettings(seller.slug);
 const threshold = shipping.freeThresholdCents;
 const free = shipping.mode === "store_pays" || (shipping.mode === "free_over" && threshold != null && item.priceCents >= threshold);
 if (free) return NextResponse.json({ free: true, rates: [] });

 // Buyer pays — quote live rates. If we can't (no key / no ship-from), don't block the sale.
 if (!isShippoConfigured() || !hasShipFrom(shipping)) return NextResponse.json({ free: true, rates: [], note: "rates_unavailable" });

 const f = shipping.shipFrom!;
 const from = { name: f.name, street1: f.street1!, street2: f.street2, city: f.city!, state: f.state!, zip: f.zip!, country: f.country || "US", phone: f.phone };
 const dest = { name: to.name, street1: to.street1, street2: to.street2, city: to.city, state: to.state, zip: to.zip, country: to.country || "US", phone: to.phone };
 const parcel = { weightOz: item.weightOz || 16, lengthIn: item.lengthIn || 12, widthIn: item.widthIn || 9, heightIn: item.heightIn || 3 };

 const rates = await getRates(from, dest, parcel);
 if (!rates.length) return NextResponse.json({ free: true, rates: [], note: "no_rates" });
 return NextResponse.json({ free: false, rates: rates.slice(0, 2).map((r) => ({ provider: r.provider, service: r.service, costCents: r.amountCents, estDays: r.estDays })) });
}
