import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { neon } from "@neondatabase/serverless";
import { isVisionConfigured, identifyCategory } from "@/app/lib/data-layer/vision";
import { inferCategoryFromTitle } from "@/app/lib/loadStoreProducts";
import { normalizeCategory } from "@/app/lib/market-data-db";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function hashPassword(password: string): string {
 return crypto.createHash("sha256").update(password).digest("hex");
}
function isAuthorized(request: NextRequest): boolean {
 const adminPassword = process.env.ADMIN_PASSWORD;
 if (!adminPassword) return false;
 const authHeader = request.headers.get("authorization");
 if (authHeader === `Bearer ${adminPassword}`) return true;
 const token = request.cookies.get("via_admin_token")?.value;
 return !!token && token === hashPassword(adminPassword);
}

function getDatabaseUrl(): string {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("DATABASE_URL not set");
 return url;
}

// GET /api/admin/category-qa?limit=50&offset=0 — for a batch of products, compare
// the STOREFRONT category (inferCategoryFromTitle, what users actually see) against
// an INDEPENDENT vision read of the product photo. Both are folded to a coarse
// family via normalizeCategory (Bags / Shoes / Accessories / Tops / …) so we only
// flag genuine cross-family mismatches (e.g. a bag filed under jewelry), not
// tote-vs-bag subcategory noise. Costs ~1 cheap vision call per product — YOU
// trigger it, in batches (bump offset until scanned hits 0).
export async function GET(request: NextRequest) {
 if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 if (!isVisionConfigured()) {
 return NextResponse.json(
 { ok: false, notConfigured: true, error: "ANTHROPIC_API_KEY not set — vision is off." },
 { status: 503 },
 );
 }

 const limit = Math.min(Math.max(parseInt(request.nextUrl.searchParams.get("limit") ?? "50", 10), 1), 100);
 const offset = Math.max(parseInt(request.nextUrl.searchParams.get("offset") ?? "0", 10), 0);

 const sql = neon(getDatabaseUrl());
 const rows = (await sql`
 SELECT id, title, store_slug, image
 FROM products
 WHERE image IS NOT NULL AND image != ''
 ORDER BY id
 LIMIT ${limit} OFFSET ${offset}
 `) as { id: number; title: string; store_slug: string; image: string }[];

 const mismatches: Array<{
 id: number;
 title: string;
 url: string;
 storefrontCategory: string;
 imageCategory: string;
 }> = [];
 let checked = 0;
 let skipped = 0;

 // Modest concurrency to stay well under vision rate limits.
 const CHUNK = 5;
 for (let i = 0; i < rows.length; i += CHUNK) {
 const chunk = rows.slice(i, i + CHUNK);
 await Promise.all(
 chunk.map(async (p) => {
 const storefrontSlug = inferCategoryFromTitle(p.title);
 const coarseTitle = normalizeCategory(storefrontSlug);
 let visionRaw: string | null = null;
 try {
 visionRaw = await identifyCategory(p.image);
 } catch {
 skipped++;
 return;
 }
 const coarseImage = visionRaw ? normalizeCategory(visionRaw) : null;
 // Only compare when both sides resolve to a known coarse family.
 if (!coarseTitle || !coarseImage) {
 skipped++;
 return;
 }
 checked++;
 if (coarseTitle !== coarseImage) {
 mismatches.push({
 id: p.id,
 title: p.title,
 url: `/products/${p.store_slug}-${p.id}`,
 storefrontCategory: coarseTitle,
 imageCategory: coarseImage,
 });
 }
 }),
 );
 }

 return NextResponse.json({
 ok: true,
 scanned: rows.length,
 checked,
 skipped,
 mismatchCount: mismatches.length,
 nextOffset: rows.length === limit ? offset + limit : null,
 mismatches: mismatches.sort((a, b) => a.id - b.id),
 });
}
