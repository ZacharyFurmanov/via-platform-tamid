import { NextRequest, NextResponse } from "next/server";
import { incrementProductCartCount, logUserCartItem } from "@/app/lib/cart-db";
import { auth } from "@/app/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as {
    id?: unknown;
    title?: unknown;
    image?: unknown;
    storeName?: unknown;
    storeSlug?: unknown;
    price?: unknown;
    currency?: unknown;
  };
  const id = typeof body.id === "number" ? body.id : null;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await incrementProductCartCount(id);

  // Log user-specific cart item for abandoned cart emails
  const session = await auth();
  if (session?.user?.id && body.title && body.storeName && body.storeSlug) {
    await logUserCartItem({
      userId: session.user.id,
      productId: id,
      productTitle: String(body.title),
      productImage: body.image ? String(body.image) : "",
      storeName: String(body.storeName),
      price: typeof body.price === "number" ? body.price : 0,
      currency: body.currency ? String(body.currency) : "USD",
      storeSlug: String(body.storeSlug),
    }).catch(() => {}); // non-blocking
  }

  return NextResponse.json({ ok: true });
}
