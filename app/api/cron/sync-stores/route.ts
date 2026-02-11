import { NextResponse } from "next/server";
import { ALL_STORES } from "@/app/lib/storeConfig";
import {
  fetchShopifyProducts,
  fetchShopifyProductsPublic,
  toRSSProductFormat,
} from "@/app/lib/shopifyClient";
import { parseRSSFeed } from "@/app/lib/rssFeedParser";
import { parseSquarespaceJSON } from "@/app/lib/squarespaceClient";
import { syncProducts, initDatabase } from "@/app/lib/db";

export async function GET(request: Request) {
  console.log("[Sync Stores] Cron job triggered");

  const authHeader = request.headers.get("authorization");

  if (!process.env.CRON_SECRET) {
    console.error("[Sync Stores] CRON_SECRET env var is not set!");
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error("[Sync Stores] Auth failed");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await initDatabase();

  const results: { store: string; success: boolean; productCount?: number; error?: string }[] = [];

  for (const store of ALL_STORES) {
    try {
      console.log(`[Sync Stores] Syncing ${store.name}...`);

      const storeSlug = store.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      if (store.type === "shopify") {
        let fetchResult: { products: any[]; skippedCount: number };

        if (store.storefrontAccessToken) {
          fetchResult = await fetchShopifyProducts(
            store.storeDomain,
            store.storefrontAccessToken,
            store.name,
            250
          );
        } else {
          fetchResult = await fetchShopifyProductsPublic(
            store.storeDomain,
            store.name,
            250
          );
        }

        const products = fetchResult.products
          .map(toRSSProductFormat)
          .filter((p) => p.price !== null)
          .map((p) => ({
            title: p.title,
            price: p.price as number,
            image: p.image ?? undefined,
            images: p.images,
            externalUrl: p.externalUrl,
            description: p.description ?? undefined,
          }));

        const productCount = await syncProducts(storeSlug, store.name, products);
        results.push({ store: store.name, success: true, productCount });
      } else {
        // Squarespace
        let rawProducts;
        if (store.shopUrl) {
          const result = await parseSquarespaceJSON(store.shopUrl, store.name);
          rawProducts = result.products;
        } else if (store.rssUrl) {
          const result = await parseRSSFeed(store.rssUrl, store.name);
          rawProducts = result.products;
        } else {
          results.push({ store: store.name, success: false, error: "No URL configured" });
          continue;
        }

        const products = rawProducts
          .filter((p) => p.price !== null)
          .map((p) => ({
            title: p.title,
            price: p.price as number,
            image: p.image ?? undefined,
            images: p.images,
            externalUrl: p.externalUrl,
            description: p.description ?? undefined,
          }));

        const productCount = await syncProducts(storeSlug, store.name, products);
        results.push({ store: store.name, success: true, productCount });
      }

      console.log(`[Sync Stores] ${store.name} synced successfully`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Sync Stores] Failed to sync ${store.name}:`, errMsg);
      results.push({ store: store.name, success: false, error: errMsg });
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`[Sync Stores] Done — ${succeeded} succeeded, ${failed} failed`);

  // Run favorite notifications after sync
  let notificationResult = null;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://theviaplatform.com";
    const res = await fetch(`${baseUrl}/api/cron/favorite-notifications`, {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    notificationResult = await res.json();
    console.log("[Sync Stores] Favorite notifications:", notificationResult);
  } catch (err) {
    console.error("[Sync Stores] Favorite notifications failed:", err);
  }

  return NextResponse.json({
    success: failed === 0,
    stores: results,
    summary: { total: results.length, succeeded, failed },
    notifications: notificationResult,
  });
}
