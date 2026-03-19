import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  // Auth check
  const cookieStore = await cookies();
  const adminToken = cookieStore.get("via_admin_token")?.value;
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.ADMIN_API_KEY;

  const isAuthorized =
    adminToken === expectedToken ||
    authHeader === `Bearer ${expectedToken}`;

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = neon(process.env.DATABASE_URL || process.env.POSTGRES_URL || "");

  // Reset created_at to NULL for all products so the insider page starts fresh.
  // Going forward, only products that are genuinely new to VYA (first-time inserts)
  // will get created_at = NOW() and appear on the insider page.
  const result = await sql`
    UPDATE products SET created_at = NULL, insider_notified = FALSE
    RETURNING id
  `;

  return NextResponse.json({
    ok: true,
    message: `Reset created_at and insider_notified for ${result.length} products. Insider page is now fresh — only new products will appear going forward.`,
    count: result.length,
  });
}
