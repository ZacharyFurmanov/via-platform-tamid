import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { toggleProductFavorite, getUserProductFavoriteIds } from "@/app/lib/favorites-db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const productIds = await getUserProductFavoriteIds(session.user.id);
  return NextResponse.json({ productIds });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { productId } = await request.json();
  if (typeof productId !== "number") {
    return NextResponse.json({ error: "productId must be a number" }, { status: 400 });
  }

  const isFavorited = await toggleProductFavorite(session.user.id, productId);
  return NextResponse.json({ favorited: isFavorited });
}
