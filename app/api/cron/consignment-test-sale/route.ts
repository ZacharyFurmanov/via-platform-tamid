import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getConsignmentItemByProduct, creditConsignedSale } from "@/app/lib/consignment-db";

// Test helper (CRON_SECRET-gated) — simulate a consigned sale so you can exercise the whole
// ledger + payout flow WITHOUT a real Stripe purchase. Delete once the real webhook is proven.
//   ?slug=lamash        → list this store's consigned items (grab a productId)
//   ?productId=<uuid>   → mark it sold + credit the consignor their split
//   &priceCents=12000   → optional sale price (defaults to the listed price)
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function db() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("DATABASE_URL not set");
 return neon(url);
}

export async function GET(request: Request) {
 const authHeader = request.headers.get("authorization");
 const cronSecret = process.env.CRON_SECRET;
 if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const url = new URL(request.url);
 const productId = url.searchParams.get("productId");

 if (productId) {
 const item = await getConsignmentItemByProduct(productId);
 if (!item) return NextResponse.json({ error: "No consignment item found for that productId." }, { status: 404 });
 const soldPriceCents = Number(url.searchParams.get("priceCents")) || item.listedPriceCents || 0;
 const result = await creditConsignedSale({ productId, orderId: `test-${Date.now()}`, soldPriceCents });
 return NextResponse.json({ ok: true, soldPriceCents, ...result });
 }

 const slug = url.searchParams.get("slug");
 const sql = db();
 const rows = slug
 ? await sql`SELECT store_slug, product_id, consignor_id, split_pct, listed_price_cents, status FROM consignment_items WHERE store_slug = ${slug} ORDER BY created_at DESC LIMIT 30`
 : await sql`SELECT store_slug, product_id, consignor_id, split_pct, listed_price_cents, status FROM consignment_items ORDER BY created_at DESC LIMIT 30`;
 return NextResponse.json({ items: rows });
}
