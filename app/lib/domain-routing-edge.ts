import { neon } from "@neondatabase/serverless";

// Edge-safe: does this custom domain belong to a store that brought its own site
// over (has captured pages)? Returns that store's slug so the middleware can serve
// the captured site on the seller's own domain; null → fall back to the block
// storefront. Cached briefly per warm instance (domain→store mapping rarely moves).
const cache = new Map<string, { slug: string | null; at: number }>();
const TTL_MS = 60_000;

export async function capturedSlugForDomain(host: string): Promise<string | null> {
 const d = host.toLowerCase().trim().replace(/^www\./, "");
 if (!d) return null;
 const hit = cache.get(d);
 if (hit && Date.now() - hit.at < TTL_MS) return hit.slug;

 let slug: string | null = null;
 try {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (url) {
 const sql = neon(url);
 const rows = (await sql`
 SELECT sc.store_slug AS slug
 FROM storefront_settings ss
 JOIN site_captures sc ON sc.store_slug = ss.store_slug
 WHERE (LOWER(ss.custom_domain) = ${d} OR LOWER(ss.custom_domain) = ${"www." + d})
 AND sc.path <> '__vya_custom_css__'
 LIMIT 1
 `) as { slug: string }[];
 slug = rows[0]?.slug ?? null;
 }
 } catch (e) {
 console.error("capturedSlugForDomain failed:", e instanceof Error ? e.message : e);
 slug = null; // any failure → fall back to the block storefront
 }
 cache.set(d, { slug, at: Date.now() });
 return slug;
}
