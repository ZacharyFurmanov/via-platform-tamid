import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { logActivity } from "@/app/lib/friends-db";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { productId, productTitle, productImage, storeName, storeSlug, price } = await request.json();

  await logActivity(session.user.id, "shop_click", {
    productId,
    productTitle,
    productImage,
    storeName,
    storeSlug,
    price,
  });

  return NextResponse.json({ ok: true });
}
