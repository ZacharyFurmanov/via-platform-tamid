import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { neon } from "@neondatabase/serverless";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { phone } = await request.json();
  if (typeof phone !== "string") {
    return NextResponse.json({ error: "phone must be a string" }, { status: 400 });
  }

  // Normalize to digits only
  const normalized = phone.replace(/\D/g, "");
  if (normalized.length < 10 || normalized.length > 15) {
    return NextResponse.json({ error: "Invalid phone number" }, { status: 400 });
  }

  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const sql = neon(url);

  // Check if phone is already taken by another user
  const existing = await sql`SELECT id FROM users WHERE phone = ${normalized} AND id != ${session.user.id}`;
  if (existing.length > 0) {
    return NextResponse.json({ error: "Phone number already in use" }, { status: 409 });
  }

  await sql`
    UPDATE users SET phone = ${normalized}, updated_at = NOW()
    WHERE id = ${session.user.id}
  `;

  return NextResponse.json({ ok: true, phone: normalized });
}
