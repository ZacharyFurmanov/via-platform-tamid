import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { addToCart, removeFromCart, getCartItemIds, clearCart } from "@/app/lib/storefront-cart-db";
import { getItem } from "@/app/lib/db/inventory";

export const dynamic = "force-dynamic";
const COOKIE = "via_cart";

// Build the buyer-facing cart view: live item details + availability, plus the
// subtotal. Sold/removed items drop out automatically (one-of-one inventory).
async function cartView(token: string) {
 const ids = await getCartItemIds(token);
 const items: { id: string; sellerId: string; title: string; priceCents: number; currency: string; image: string | null; available: boolean }[] = [];
 for (const id of ids) {
 const it = await getItem(id);
 if (it && it.status !== "sold" && it.status !== "removed") {
 items.push({
 id: it.id,
 sellerId: it.sellerId,
 title: it.title,
 priceCents: it.priceCents,
 currency: it.currency,
 image: it.images?.[0] ?? null,
 available: it.status === "active",
 });
 }
 }
 const subtotalCents = items.reduce((s, i) => s + i.priceCents, 0);
 return { items, count: items.length, subtotalCents };
}

export async function GET(request: NextRequest) {
 const token = request.cookies.get(COOKIE)?.value;
 if (!token) return NextResponse.json({ items: [], count: 0, subtotalCents: 0 });
 return NextResponse.json(await cartView(token));
}

export async function POST(request: NextRequest) {
 const body = await request.json().catch(() => null);
 const itemId = body?.itemId ? String(body.itemId) : "";
 if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

 let token = request.cookies.get(COOKIE)?.value;
 const isNew = !token;
 if (!token) token = randomUUID();
 await addToCart(token, itemId);

 const res = NextResponse.json(await cartView(token));
 if (isNew) res.cookies.set(COOKIE, token, { maxAge: 60 * 60 * 24 * 30, path: "/", httpOnly: true, sameSite: "lax" });
 return res;
}

// DELETE { itemId } removes one; no body clears the whole cart.
export async function DELETE(request: NextRequest) {
 const token = request.cookies.get(COOKIE)?.value;
 if (!token) return NextResponse.json({ items: [], count: 0, subtotalCents: 0 });
 const body = await request.json().catch(() => null);
 const itemId = body?.itemId ? String(body.itemId) : "";
 if (itemId) await removeFromCart(token, itemId);
 else await clearCart(token);
 return NextResponse.json(await cartView(token));
}
