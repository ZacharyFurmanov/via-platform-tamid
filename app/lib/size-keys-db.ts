import { neon } from "@neondatabase/serverless";
import { deriveSize, expandSizeKeys } from "./inventory";
import { ensureSizeKeysColumn, type DBProduct } from "./db";

// ---------------------------------------------------------------------------
// products.size_keys backfill.
//
// The web grid filters on the DERIVED display size (deriveSize — which reads the
// seller's fit note, so "best fits US 2-4" becomes the shown size). The SQL list
// endpoints (new-arrivals, feed) used to filter on the RAW Shopify variant size,
// so they could neither see the derived fit size nor handle ranges.
//
// This computes, for every product, the set of bare size tokens it should match
// a filter on — the derived size expanded over its range ("US 2-4" → {2,3,4}) —
// and stores it in products.size_keys. The endpoints then filter with a GIN
// array-overlap, matching the EXACT sizes shoppers see, ranges included.
// ---------------------------------------------------------------------------

function db() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("No database URL");
 return neon(url);
}

export async function backfillSizeKeys(
 opts: { onlyMissing?: boolean } = {},
): Promise<{ scanned: number; updated: number; groups: number }> {
 const sql = db();
 await ensureSizeKeysColumn();

 const rows = (opts.onlyMissing
 ? await sql`SELECT id, title, description, size FROM products WHERE size_keys IS NULL`
 : await sql`SELECT id, title, description, size FROM products`) as Array<{
 id: number;
 title: string;
 description: string | null;
 size: string | null;
 }>;

 // Group products by identical key-set so the whole table updates in a handful
 // of statements (most items share a size) rather than one query per row.
 const groups = new Map<string, { keys: string[]; ids: number[] }>();
 for (const r of rows) {
 const derived = deriveSize({ title: r.title, description: r.description, size: r.size } as DBProduct);
 const keys = derived ? expandSizeKeys(derived) : [];
 const sig = JSON.stringify(keys);
 const g = groups.get(sig);
 if (g) g.ids.push(r.id);
 else groups.set(sig, { keys, ids: [r.id] });
 }

 let updated = 0;
 for (const g of groups.values()) {
 await sql`UPDATE products SET size_keys = ${g.keys}::text[] WHERE id = ANY(${g.ids})`;
 updated += g.ids.length;
 }

 return { scanned: rows.length, updated, groups: groups.size };
}
