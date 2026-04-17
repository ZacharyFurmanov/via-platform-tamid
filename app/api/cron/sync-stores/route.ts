import { NextResponse } from "next/server";
import { ALL_STORES } from "@/app/lib/storeConfig";
import {
  fetchShopifyProducts,
  fetchShopifyProductsPublic,
  fetchShopifyProductsByCollections,
  toRSSProductFormat,
} from "@/app/lib/shopifyClient";
import { parseRSSFeed } from "@/app/lib/rssFeedParser";
import { parseSquarespaceJSON } from "@/app/lib/squarespaceClient";
import { parseBigCartelJSON } from "@/app/lib/bigcartelClient";
import { fetchSquareProducts } from "@/app/lib/squareClient";
import { stores } from "@/app/lib/stores";
import { syncProducts, initDatabase } from "@/app/lib/db";
import { convertCurrencyToUSD, refreshExchangeRates } from "@/app/lib/stores";

export async function GET(request: Request) {
  console.log("[Sync Stores] Cron job triggered");

  // Fetch live exchange rates once before syncing all stores
  await refreshExchangeRates();

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

        if (store.collectionHandles && store.collectionHandles.length > 0) {
          fetchResult = await fetchShopifyProductsByCollections(
            store.storeDomain,
            store.name,
            store.collectionHandles,
            5000
          );
        } else if (store.storefrontAccessToken) {
          fetchResult = await fetchShopifyProducts(
            store.storeDomain,
            store.storefrontAccessToken,
            store.name,
            1000
          );
        } else {
          const storeInfo = stores.find((s) => s.slug === store.slug);
          const storeCurrency = (storeInfo as any)?.currency ?? "USD";
          fetchResult = await fetchShopifyProductsPublic(
            store.storeDomain,
            store.name,
            1000,
            storeCurrency
          );
        }

        const storeSlug = store.slug;
        const excludedTitles = new Set(
          (store.excludeTitles ?? []).map((t) => t.toLowerCase())
        );
        const excludedKeywords = (store.excludeKeywords ?? []).map((k) => k.toLowerCase());
        const products = fetchResult.products
          .map(toRSSProductFormat)
          .filter((p) => p.price !== null)
          .filter((p) => !excludedTitles.has(p.title.toLowerCase()))
          .filter((p) => !excludedKeywords.some((kw) => p.title.toLowerCase().includes(kw)))
          .map((p) => ({
            title: p.title,
            price: convertCurrencyToUSD(p.price as number, p.currency),
            currency: "USD",
            image: p.image ?? undefined,
            images: p.images,
            externalUrl: p.externalUrl,
            description: p.description ?? undefined,
            variantId: p.variantId ?? undefined,
            shopifyProductId: p.shopifyProductId ?? undefined,
            size: p.size ?? undefined,
            compareAtPrice: p.compareAtPrice != null ? convertCurrencyToUSD(p.compareAtPrice as number, p.currency) : undefined,
          }));

        const { count: productCount } = await syncProducts(storeSlug, store.name, products);
        results.push({ store: store.name, success: true, productCount });
      } else if (store.type === "bigcartel") {
        const { products: rawProducts } = await parseBigCartelJSON(
          store.storeSlug,
          store.name
        );

        const products = rawProducts
          .filter((p) => p.price != null)
          .map((p) => ({
            title: p.title,
            price: p.price,
            compareAtPrice: p.compareAtPrice ?? undefined,
            image: p.image ?? undefined,
            images: p.images,
            externalUrl: p.externalUrl,
            description: p.description ?? undefined,
          }));

        const { count: productCount } = await syncProducts(store.slug, store.name, products);
        results.push({ store: store.name, success: true, productCount });
      } else if (store.type === "square") {
        const storeInfo = stores.find((s) => s.slug === store.slug);
        const websiteUrl = storeInfo?.website ?? "https://vyaplatform.com";
        const { products: rawProducts, skippedCount } = await fetchSquareProducts(
          store.locationId,
          store.name,
          websiteUrl,
          store.accessTokenEnvVar,
        );
        const mappedProducts = rawProducts
          .filter((p) => p.price > 0)
          .map((p) => ({
            title: p.title,
            price: p.price,
            compareAtPrice: p.compareAtPrice ?? undefined,
            image: p.image ?? undefined,
            images: p.images,
            externalUrl: p.externalUrl,
            description: p.description ?? undefined,
            size: p.size ?? undefined,
            variantId: p.variantId ?? undefined,
          }));
        const { count: productCount } = await syncProducts(store.slug, store.name, mappedProducts);
        console.log(`[Sync Stores] Square: ${store.name} synced ${productCount} products, skipped ${skippedCount}`);
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
            compareAtPrice: ("compareAtPrice" in p && typeof p.compareAtPrice === "number" ? p.compareAtPrice : null) ?? undefined,
            image: p.image ?? undefined,
            images: p.images,
            externalUrl: p.externalUrl,
            description: p.description ?? undefined,
            size: p.size ?? undefined,
          }));

        const { count: productCount } = await syncProducts(storeSlug, store.name, products);
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
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://vyaplatform.com";
    const res = await fetch(`${baseUrl}/api/cron/favorite-notifications`, {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    notificationResult = await res.json();
    console.log("[Sync Stores] Favorite notifications:", notificationResult);
  } catch (err) {
    console.error("[Sync Stores] Favorite notifications failed:", err);
  }

  // Run collabs link generation after sync so new products get links right away
  let collabsResult = null;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://vyaplatform.com";
    const res = await fetch(`${baseUrl}/api/cron/generate-collabs-links`, {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    collabsResult = await res.json();
    console.log("[Sync Stores] Collabs link generation:", collabsResult);
  } catch (err) {
    console.error("[Sync Stores] Collabs link generation failed:", err);
  }

  return NextResponse.json({
    success: failed === 0,
    stores: results,
    summary: { total: results.length, succeeded, failed },
    notifications: notificationResult,
    collabsLinks: collabsResult,
  });
}
