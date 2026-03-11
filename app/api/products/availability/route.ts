import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get("ids");
  if (!idsParam) return NextResponse.json({ available: [] });

  const ids = idsParam
    .split(",")
    .map(Number)
    .filter((n) => !isNaN(n) && n > 0);

  if (ids.length === 0) return NextResponse.json({ available: [] });

  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return NextResponse.json({ available: ids }); // fail open

  const sql = neon(url);
  const rows = await sql`SELECT id FROM products WHERE id = ANY(${ids})`;
  const available = rows.map((r) => r.id as number);

  return NextResponse.json({ available });
}
