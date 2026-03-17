import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { stores, storeContactEmails } from "@/app/lib/stores";
import { neon } from "@neondatabase/serverless";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

function getStoreSlugFromEmail(email: string): string | null {
  for (const [slug, storeEmail] of Object.entries(storeContactEmails)) {
    if (storeEmail && storeEmail.toLowerCase() === email.toLowerCase()) return slug;
  }
  return null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const storeSlug = getStoreSlugFromEmail(session.user.email);
  if (!storeSlug) {
    return NextResponse.json({ error: "Not a registered store partner" }, { status: 403 });
  }

  // Admin test account — return synthetic store data
  if (storeSlug === "via-admin") {
    return NextResponse.json({
      storeSlug: "via-admin",
      storeName: "VYA Admin",
      location: "New York, NY",
      currency: "USD",
      website: "https://vyaplatform.com",
      logo: "/vya-logo.png",
      logoBg: "#F7F3EA",
      commissionType: "shopify-collabs",
      totalInventoryValue: 0,
      viaCommissionPotential: 0,
    });
  }

  const store = stores.find((s) => s.slug === storeSlug);
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  // Calculate total inventory value, commission potential, store followers, and top favorited products
  let totalInventoryValue = 0;
  let viaCommissionPotential = 0;
  let storeFollowers = 0;
  let topFavoritedProducts: { title: string; favoriteCount: number; price: number }[] = [];

  try {
    const sql = neon(getDatabaseUrl());
    const [inventoryRows, followerRows, favProductRows] = await Promise.all([
      sql`
        SELECT
          COALESCE(SUM(price), 0) AS total_inventory_value,
          COALESCE(SUM(
            CASE
              WHEN price < 1000 THEN price * 0.07
              WHEN price < 5000 THEN price * 0.05
              ELSE price * 0.03
            END
          ), 0) AS via_commission_potential
        FROM products
        WHERE store_slug = ${storeSlug}
          AND (shopify_product_id IS NULL OR collabs_link IS NOT NULL)
      `,
      sql`
        SELECT COUNT(*) AS cnt FROM store_favorites WHERE store_slug = ${storeSlug}
      `,
      sql`
        SELECT p.title, p.price, COUNT(pf.id) AS favorite_count
        FROM products p
        JOIN product_favorites pf ON pf.product_id = p.id
        WHERE p.store_slug = ${storeSlug}
        GROUP BY p.id, p.title, p.price
        ORDER BY favorite_count DESC
        LIMIT 10
      `,
    ]);

    totalInventoryValue = Math.round(Number(inventoryRows[0]?.total_inventory_value ?? 0));
    viaCommissionPotential = Math.round(Number(inventoryRows[0]?.via_commission_potential ?? 0));
    storeFollowers = Number(followerRows[0]?.cnt ?? 0);
    topFavoritedProducts = favProductRows.map((r) => ({
      title: r.title as string,
      price: Math.round(Number(r.price)),
      favoriteCount: Number(r.favorite_count),
    }));
  } catch {
    // Non-fatal — dashboard still loads without these figures
  }

  return NextResponse.json({
    storeSlug: store.slug,
    storeName: store.name,
    location: store.location,
    currency: store.currency,
    website: store.website,
    logo: store.logo,
    logoBg: store.logoBg,
    commissionType: store.commissionType,
    totalInventoryValue,
    viaCommissionPotential,
    storeFollowers,
    topFavoritedProducts,
  });
}
