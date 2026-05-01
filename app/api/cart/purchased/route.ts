import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getPurchasedCartCompositeIds, deletePurchasedCartItems } from "@/app/lib/cart-db";

// Returns compositeIds of purchased cart items for the logged-in user,
// then cleans them up so they're only returned once.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ compositeIds: [] });
  }

  try {
    const compositeIds = await getPurchasedCartCompositeIds(session.user.id);
    if (compositeIds.length > 0) {
      await deletePurchasedCartItems(session.user.id);
    }
    return NextResponse.json({ compositeIds });
  } catch {
    return NextResponse.json({ compositeIds: [] });
  }
}
