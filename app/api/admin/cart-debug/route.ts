import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import crypto from "crypto";
import { getDtIdForProduct } from "@/app/lib/collabsDtId";

function getDb() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  return neon(url);
}
function hashPassword(p: string): string {
  return crypto.createHash("sha256").update(p).digest("hex");
}
function isAuthorized(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${adminPassword}`) return true;
  const adminToken = request.cookies.get("via_admin_token")?.value;
  return !!adminToken && adminToken === hashPassword(adminPassword);
}

// Replicate exactly what the app's resolveShopifyCartUrl does: fetch
// {external_url}.json and read product.variants[0].id.
async function tryProductJson(externalUrl: string) {
  try {
    const jsonUrl = externalUrl.split(/[?#]/)[0].replace(/\/+$/, "") + ".json";
    const res = await fetch(jsonUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return { jsonUrl, ok: false, status: res.status };
    const data = await res.json();
    const v = data?.product?.variants;
    return { jsonUrl, ok: true, variantCount: Array.isArray(v) ? v.length : 0, firstVariantId: v?.[0]?.id ?? null };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const store = request.nextUrl.searchParams.get("store") ?? "stone-studio-vintage";
  const sql = getDb();

  const counts = (await sql`
    SELECT COUNT(*)::int AS total,
           COUNT(variant_id)::int AS with_variant_id,
           COUNT(collabs_link)::int AS with_collabs_link,
           COUNT(collabs_dt_id)::int AS with_dt_id
    FROM products WHERE store_slug = ${store}
  `)[0];

  const rows = await sql`
    SELECT id, title, variant_id, external_url, collabs_link, collabs_dt_id
    FROM products WHERE store_slug = ${store} ORDER BY id DESC LIMIT 4
  `;

  const samples = [];
  for (const r of rows) {
    const jsonTest = r.external_url
      ? await tryProductJson(r.external_url as string)
      : { ok: false, error: "no external_url in DB" };
    const resolvedVariant =
      r.variant_id ?? (jsonTest.ok ? jsonTest.firstVariantId : null);
    samples.push({
      id: r.id,
      title: r.title,
      db_variant_id: r.variant_id,
      external_url: r.external_url,
      has_collabs_link: !!r.collabs_link,
      db_collabs_dt_id: r.collabs_dt_id,
      productJsonFetch: jsonTest,
      wouldResolveTo: resolvedVariant ? `cart/${resolvedVariant}:1` : "NULL → falls back to product page",
    });
  }

  // Trace the Collabs dt_id resolution for the first product — this is the piece
  // /api/track depends on to keep all items in the cart with attribution. If it
  // can't extract a dt_id from the collabs.shop redirect chain, /api/track falls
  // back to a single-product collabs.shop redirect (collapsing a multi-item cart).
  const first = rows[0] as { id: number; collabs_link: string | null; variant_id: string | null };
  const dtIdTest: Record<string, unknown> = {
    firstProductId: first?.id,
    collabsLink: first?.collabs_link,
  };
  if (first?.collabs_link) {
    let url = first.collabs_link;
    const trace: unknown[] = [];
    for (let i = 0; i < 6; i++) {
      try {
        const res = await fetch(url, {
          method: "GET",
          redirect: "manual",
          headers: { "User-Agent": "Mozilla/5.0 VYA-Bot/1.0" },
        });
        const loc = res.headers.get("location");
        trace.push({ hop: i, url, status: res.status, urlHasDtId: url.includes("dt_id"), location: loc });
        if (!loc) break;
        url = new URL(loc, url).toString();
      } catch (e) {
        trace.push({ hop: i, url, error: String(e) });
        break;
      }
    }
    dtIdTest.redirectTrace = trace;
    dtIdTest.resolvedDtId = await getDtIdForProduct(first.id).catch((e) => `ERROR: ${String(e)}`);
  }
  const multiSpec = (rows as { variant_id: string | null }[])
    .slice(0, 2)
    .filter((r) => r.variant_id)
    .map((r) => `${r.variant_id}:1`)
    .join(",");
  dtIdTest.multiVariantCartUrl = multiSpec ? `cart/${multiSpec}` : null;

  return NextResponse.json({ store, counts, samples, dtIdTest }, { status: 200 });
}
