import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { auth } from "@/app/lib/auth";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL or POSTGRES_URL not set");
  return url;
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const sql = neon(getDatabaseUrl());

  // Delete from all tables that reference this user
  // Order matters: delete from leaf tables first, then the user row
  await sql`DELETE FROM favorite_notifications WHERE user_id = ${userId}`;
  await sql`DELETE FROM friend_activity WHERE user_id = ${userId}`;
  await sql`DELETE FROM friend_requests WHERE from_user_id = ${userId} OR to_user_id = ${userId}`;
  await sql`DELETE FROM friendships WHERE user_a_id = ${userId} OR user_b_id = ${userId}`;
  await sql`DELETE FROM product_favorites WHERE user_id = ${userId}`;
  await sql`DELETE FROM store_favorites WHERE user_id = ${userId}`;
  await sql`DELETE FROM accounts WHERE user_id = ${userId}`;
  await sql`DELETE FROM users WHERE id = ${userId}`;

  return NextResponse.json({ ok: true });
}
