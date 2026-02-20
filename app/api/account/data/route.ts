import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { auth } from "@/app/lib/auth";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL or POSTGRES_URL not set");
  return url;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const sql = neon(getDatabaseUrl());

  const [userRows, favoriteProducts, favoriteStores, friendships, friendRequests, activity] =
    await Promise.all([
      sql`SELECT id, name, email, phone, created_at, updated_at FROM users WHERE id = ${userId}`,
      sql`SELECT product_id, created_at FROM product_favorites WHERE user_id = ${userId} ORDER BY created_at DESC`,
      sql`SELECT store_slug, created_at FROM store_favorites WHERE user_id = ${userId} ORDER BY created_at DESC`,
      sql`SELECT user_a_id, user_b_id, created_at FROM friendships WHERE user_a_id = ${userId} OR user_b_id = ${userId}`,
      sql`SELECT from_user_id, to_user_id, status, created_at FROM friend_requests WHERE from_user_id = ${userId} OR to_user_id = ${userId}`,
      sql`SELECT activity_type, metadata, created_at FROM friend_activity WHERE user_id = ${userId} ORDER BY created_at DESC`,
    ]);

  const data = {
    exported_at: new Date().toISOString(),
    account: userRows[0] || null,
    favorite_products: favoriteProducts,
    favorite_stores: favoriteStores,
    friendships,
    friend_requests: friendRequests,
    activity,
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="via-data-export-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}
