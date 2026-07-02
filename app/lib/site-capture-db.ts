import { neon } from "@neondatabase/serverless";

// Storage for high-fidelity site captures — one row per page of a seller's real
// site, hosted on VYA. (store_slug, path) → the self-contained HTML.
function sql() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("No database URL configured");
 return neon(url);
}

let ready = false;
async function ensure() {
 if (ready) return;
 const q = sql();
 await q`CREATE TABLE IF NOT EXISTS site_captures (
 store_slug TEXT NOT NULL,
 path TEXT NOT NULL,
 html TEXT NOT NULL,
 source_url TEXT,
 captured_at TIMESTAMPTZ DEFAULT now(),
 PRIMARY KEY (store_slug, path)
 )`;
 ready = true;
}

export async function saveCapturePage(slug: string, path: string, html: string, sourceUrl: string): Promise<void> {
 await ensure();
 await sql()`INSERT INTO site_captures (store_slug, path, html, source_url) VALUES (${slug}, ${path}, ${html}, ${sourceUrl})
 ON CONFLICT (store_slug, path) DO UPDATE SET html = ${html}, source_url = ${sourceUrl}, captured_at = now()`;
}

export async function getCapturePage(slug: string, path: string): Promise<string | null> {
 await ensure();
 const r = (await sql()`SELECT html FROM site_captures WHERE store_slug = ${slug} AND path = ${path} LIMIT 1`) as { html: string }[];
 return r[0]?.html ?? null;
}

export async function listCapturePaths(slug: string): Promise<string[]> {
 await ensure();
 const r = (await sql()`SELECT path FROM site_captures WHERE store_slug = ${slug} ORDER BY path`) as { path: string }[];
 return r.map((x) => x.path).filter((p) => !p.startsWith("__")); // hide reserved rows (e.g. custom CSS)
}

export async function hasCaptures(slug: string): Promise<boolean> {
 await ensure();
 const r = (await sql()`SELECT path FROM site_captures WHERE store_slug = ${slug}`) as { path: string }[];
 return r.some((x) => !x.path.startsWith("__"));
}

// ── Editing a captured site over time ────────────────────────────────────────
// Captured pages stay editable: update one page's HTML in place, or store a blob
// of custom CSS that's injected into every served page (site-wide restyling).
export async function updateCapturePageHtml(slug: string, path: string, html: string): Promise<boolean> {
 await ensure();
 const r = (await sql()`UPDATE site_captures SET html = ${html}, captured_at = now() WHERE store_slug = ${slug} AND path = ${path} RETURNING store_slug`) as unknown[];
 return r.length > 0;
}

const CSS_PATH = "__vya_custom_css__";
export async function getSiteCss(slug: string): Promise<string> {
 return (await getCapturePage(slug, CSS_PATH).catch(() => null)) || "";
}
export async function setSiteCss(slug: string, css: string): Promise<void> {
 await saveCapturePage(slug, CSS_PATH, css, "");
}

export async function deleteCaptures(slug: string): Promise<void> {
 await ensure();
 await sql()`DELETE FROM site_captures WHERE store_slug = ${slug}`;
}

/** The original site origin for a captured store (from any stored page's source_url). */
export async function getCaptureOrigin(slug: string): Promise<string | null> {
 await ensure();
 const r = (await sql()`SELECT source_url FROM site_captures WHERE store_slug = ${slug} AND source_url IS NOT NULL LIMIT 1`) as { source_url: string }[];
 try { return r[0]?.source_url ? new URL(r[0].source_url).origin : null; } catch { return null; }
}
