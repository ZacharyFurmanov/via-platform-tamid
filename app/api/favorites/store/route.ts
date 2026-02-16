import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { toggleStoreFavorite, getUserStoreFavoriteIds } from "@/app/lib/favorites-db";
import { logActivity } from "@/app/lib/friends-db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const storeSlugs = await getUserStoreFavoriteIds(session.user.id);
  return NextResponse.json({ storeSlugs });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { storeSlug } = await request.json();
  if (typeof storeSlug !== "string" || !storeSlug) {
    return NextResponse.json({ error: "storeSlug must be a non-empty string" }, { status: 400 });
  }

  const isFavorited = await toggleStoreFavorite(session.user.id, storeSlug);

  if (isFavorited) {
    logActivity(session.user.id, "favorite_store", { storeSlug }).catch(() => {});
  }

  return NextResponse.json({ favorited: isFavorited });
}
