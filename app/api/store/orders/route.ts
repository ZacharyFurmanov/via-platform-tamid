import { NextRequest, NextResponse } from "next/server";
import { resolveStoreSlugAny } from "@/app/lib/storeAuth";
import { getSellerBySlug } from "@/app/lib/db/sellers";
import { listSellerOrders } from "@/app/lib/db/orders";

export const dynamic = "force-dynamic";

// GET — the acting store's orders (sales).
export async function GET(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 const seller = await getSellerBySlug(slug);
 const orders = seller ? await listSellerOrders(seller.id) : [];
 return NextResponse.json({ ok: true, orders });
}
