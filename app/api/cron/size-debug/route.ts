import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { deriveSize, deriveDisplaySize } from "@/app/lib/inventory";
import { inferCategoryFromTitle } from "@/app/lib/loadStoreProducts";
import type { DBProduct } from "@/app/lib/db";

// Diagnostic (read-only): dump a store's products' raw size fields + what each size-derivation
// step returns, so we can see WHY a size is empty or wrong. CRON_SECRET-gated.
//   /api/cron/size-debug?slug=in-a-past-life&q=heel
export const maxDuration = 60;

function db() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("DATABASE_URL not set");
 return neon(url);
}

export async function GET(request: Request) {
 const authHeader = request.headers.get("authorization");
 const cronSecret = process.env.CRON_SECRET;
 if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 const url = new URL(request.url);
 const slug = url.searchParams.get("slug");
 const q = url.searchParams.get("q");
 const limit = Math.min(Number(url.searchParams.get("limit") ?? 25), 100);
 if (!slug) {
 return NextResponse.json({ error: "pass ?slug=store-slug (optional ?q=title-substring)" }, { status: 400 });
 }

 const sql = db();
 const rows = (q
 ? await sql`SELECT id, title, size, description, product_type FROM products WHERE store_slug = ${slug} AND title ILIKE ${"%" + q + "%"} ORDER BY id DESC LIMIT ${limit}`
 : await sql`SELECT id, title, size, description, product_type FROM products WHERE store_slug = ${slug} ORDER BY id DESC LIMIT ${limit}`) as Array<Record<string, unknown>>;

 const items = rows.map((r) => {
 const product = { title: r.title, size: r.size, description: r.description, product_type: r.product_type } as unknown as DBProduct;
 return {
 id: r.id,
 title: r.title,
 rawSize: r.size ?? null, // what the sync stored in products.size
 productType: r.product_type ?? null,
 category: inferCategoryFromTitle(r.title as string),
 descHead: typeof r.description === "string" ? (r.description as string).slice(0, 220) : null,
 deriveSize: deriveSize(product), // the raw size our logic picks
 displaySize: deriveDisplaySize(product), // what shoppers see (post US-conversion)
 };
 });

 return NextResponse.json({ store: slug, count: items.length, items });
}
