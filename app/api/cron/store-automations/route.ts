import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { sendNewListingsDigest } from "@/app/lib/automation-engine";

export const maxDuration = 300;

// Daily: for each store that published new listings in the last 24h, send a single
// new-arrivals digest to its subscribed customers — if "new arrivals" (built-in) or a
// custom "new_listing" automation is on. Batched, so a whole drop is one email.
export async function GET(request: Request) {
 const cronSecret = process.env.CRON_SECRET;
 if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }
 const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!dbUrl) return NextResponse.json({ error: "No database" }, { status: 500 });
 const sql = neon(dbUrl);

 // Newly published pieces per store in the last day.
 const rows = (await sql`
  SELECT s.slug AS slug, i.title AS title
  FROM items i JOIN sellers s ON s.id = i.seller_id
  WHERE i.created_at >= now() - interval '24 hours' AND i.status = 'active' AND i.title IS NOT NULL
  ORDER BY s.slug
 `.catch(() => [])) as { slug: string; title: string }[];

 const byStore = new Map<string, { title: string }[]>();
 for (const r of rows) {
 const arr = byStore.get(r.slug) || [];
 arr.push({ title: r.title });
 byStore.set(r.slug, arr);
 }

 let storesEmailed = 0, totalSent = 0;
 for (const [slug, items] of byStore) {
 const res = await sendNewListingsDigest(slug, items).catch(() => null);
 if (res && res.sent > 0) { storesEmailed++; totalSent += res.sent; }
 }

 return NextResponse.json({ ok: true, storesWithNewListings: byStore.size, storesEmailed, totalSent });
}
