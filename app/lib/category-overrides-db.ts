import { neon } from "@neondatabase/serverless";

// AI/manual category corrections, per product. A product's displayed + filtered
// category is normally inferred from its title; an override here (written by the
// category sweep, or by an admin) takes precedence so a mis-titled item lands in
// the right family. `family` is a top-level display category.
export type CategoryFamily = "clothing" | "bags" | "shoes" | "accessories" | "home";

function db() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("No database URL");
 return neon(url);
}

export async function ensureCategoryOverridesTable(): Promise<void> {
 const sql = db();
 await sql`
 CREATE TABLE IF NOT EXISTS category_overrides (
 store_slug TEXT NOT NULL,
 product_id INTEGER NOT NULL,
 family TEXT NOT NULL,
 source TEXT NOT NULL DEFAULT 'ai',
 note TEXT,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY (store_slug, product_id)
 )
 `;
}

export type CategoryOverride = {
 storeSlug: string;
 productId: number;
 family: string;
 source: string;
 note: string | null;
 updatedAt: string;
};

// Map keyed by `${store_slug}-${product_id}` → family. Loaded once per request and
// passed into applyJsFilters so category filtering reflects corrections. .catch keeps
// it resilient if the table doesn't exist yet (nothing swept).
export async function getCategoryOverrideMap(): Promise<Map<string, string>> {
 const sql = db();
 const rows = (await sql`SELECT store_slug, product_id, family FROM category_overrides`.catch(() => [])) as
 { store_slug: string; product_id: number; family: string }[];
 const m = new Map<string, string>();
 for (const r of rows) m.set(`${r.store_slug}-${r.product_id}`, r.family);
 return m;
}

export async function setCategoryOverride(
 storeSlug: string,
 productId: number,
 family: CategoryFamily,
 source: "ai" | "manual" = "ai",
 note: string | null = null,
): Promise<void> {
 await ensureCategoryOverridesTable();
 const sql = db();
 await sql`
 INSERT INTO category_overrides (store_slug, product_id, family, source, note)
 VALUES (${storeSlug}, ${productId}, ${family}, ${source}, ${note})
 ON CONFLICT (store_slug, product_id)
 DO UPDATE SET family = EXCLUDED.family, source = EXCLUDED.source, note = EXCLUDED.note, updated_at = NOW()
 `;
}

export async function listCategoryOverrides(): Promise<CategoryOverride[]> {
 await ensureCategoryOverridesTable();
 const sql = db();
 const rows = await sql`
 SELECT store_slug, product_id, family, source, note, updated_at
 FROM category_overrides ORDER BY updated_at DESC LIMIT 2000
 `;
 return rows.map((r) => ({
 storeSlug: r.store_slug as string,
 productId: r.product_id as number,
 family: r.family as string,
 source: r.source as string,
 note: (r.note as string | null) ?? null,
 updatedAt: (r.updated_at as Date)?.toISOString?.() ?? String(r.updated_at),
 }));
}

export async function deleteCategoryOverride(storeSlug: string, productId: number): Promise<void> {
 await ensureCategoryOverridesTable();
 const sql = db();
 await sql`DELETE FROM category_overrides WHERE store_slug = ${storeSlug} AND product_id = ${productId}`;
}
