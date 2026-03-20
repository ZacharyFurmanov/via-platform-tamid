import { NextRequest, NextResponse } from "next/server";
import { stores } from "@/app/lib/stores";
import { getStoreAnalytics } from "@/app/lib/analytics-db";
import { neon } from "@neondatabase/serverless";

function hashPassword(password: string): string {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(password).digest("hex");
}
function isAuthorized(request: NextRequest): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${adminPassword}`) return true;
  const token = request.cookies.get("via_admin_token")?.value;
  return token === hashPassword(adminPassword);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;
  const store = stores.find((s) => s.slug === slug);
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const range = request.nextUrl.searchParams.get("range") || "all";
  const analytics = await getStoreAnalytics(slug, range);

  // Also fetch inventory + followers
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  let totalInventoryValue = 0;
  let viaCommissionPotential = 0;
  let storeFollowers = 0;
  let topFavoritedProducts: { title: string; price: number; favoriteCount: number }[] = [];

  if (dbUrl) {
    const sql = neon(dbUrl);
    try {
      const [inventoryRows, followerRows, favRows] = await Promise.all([
        sql`
          SELECT
            COALESCE(SUM(price), 0) AS total_inventory_value,
            COALESCE(SUM(
              CASE WHEN price < 1000 THEN price * 0.07 WHEN price < 5000 THEN price * 0.05 ELSE price * 0.03 END
            ), 0) AS via_commission_potential
          FROM products WHERE store_slug = ${slug}
        `,
        sql`SELECT COUNT(*) AS cnt FROM store_favorites WHERE store_slug = ${slug}`,
        sql`
          SELECT p.title, p.price, COUNT(pf.id) AS favorite_count
          FROM products p
          JOIN product_favorites pf ON pf.product_id = p.id
          WHERE p.store_slug = ${slug}
          GROUP BY p.id, p.title, p.price
          ORDER BY favorite_count DESC LIMIT 10
        `,
      ]);
      totalInventoryValue = Math.round(Number(inventoryRows[0]?.total_inventory_value ?? 0));
      viaCommissionPotential = Math.round(Number(inventoryRows[0]?.via_commission_potential ?? 0));
      storeFollowers = Number(followerRows[0]?.cnt ?? 0);
      topFavoritedProducts = favRows.map((r) => ({
        title: r.title as string,
        price: Math.round(Number(r.price)),
        favoriteCount: Number(r.favorite_count),
      }));
    } catch {}
  }

  return NextResponse.json({
    store: {
      slug: store.slug,
      name: store.name,
      location: store.location,
      currency: store.currency,
      website: store.website,
      commissionType: store.commissionType,
    },
    totalInventoryValue,
    viaCommissionPotential,
    storeFollowers,
    topFavoritedProducts,
    analytics,
  });
}
