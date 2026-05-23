import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { SQUARESPACE_STORES } from "@/app/lib/storeConfig";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) return NextResponse.json({ error: "No database URL" }, { status: 500 });

  const sql = neon(dbUrl);
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const slugs = SQUARESPACE_STORES.map((s) => s.slug);

  // Find which Squarespace stores have had at least one click in the past 3 days
  const activeRows = await sql`
    SELECT DISTINCT store_slug
    FROM clicks
    WHERE store_slug = ANY(${slugs})
    AND timestamp >= ${cutoff}::timestamptz
  `;
  const activeSlugs = new Set((activeRows as Array<{ store_slug: string }>).map((r) => r.store_slug));

  const inactiveSlugs = slugs.filter((s) => !activeSlugs.has(s));

  const results: { slug: string; deleted: number }[] = [];

  for (const slug of inactiveSlugs) {
    const deleted = await sql`DELETE FROM products WHERE store_slug = ${slug}`;
    results.push({ slug, deleted: deleted.length ?? 0 });
    console.log(`[cleanup-squarespace] Deleted products for ${slug} (no clicks in 3 days)`);
  }

  console.log(`[cleanup-squarespace] Active: [${[...activeSlugs].join(", ")}], Purged: [${inactiveSlugs.join(", ")}]`);

  return NextResponse.json({
    checked: slugs,
    active: [...activeSlugs],
    purged: results,
  });
}
