import { NextRequest, NextResponse } from "next/server";
import {
  fetchShopifyProducts,
  fetchShopifyProductsPublic,
  fetchShopifyProductsByCollections,
  testShopifyConnection,
  toRSSProductFormat,
} from "@/app/lib/shopifyClient";
import { syncProducts, initDatabase } from "@/app/lib/db";
import { convertCurrencyToUSD } from "@/app/lib/stores";
import { ALL_STORES } from "@/app/lib/storeConfig";

/**
 * Fetches a Shopify product page and extracts metafield sections (h2/p pairs)
 * that aren't in the body_html, such as Condition and Dimensions.
 * Returns appended HTML in a format compatible with splitDescription parsing.
 */
async function scrapeProductPageSections(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "text/html" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "";
    let html = await res.text();

    // Strip script/style/noscript blocks first to avoid matching JSON-LD or embedded JS
    html = html.replace(/<script[\s\S]*?<\/script>/gi, "");
    html = html.replace(/<style[\s\S]*?<\/style>/gi, "");
    html = html.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");

    // Match <h2> followed closely (within 200 chars) by <p>
    const sectionRe = /<h2[^>]*>([\s\S]*?)<\/h2>[\s\S]{0,200}?<p[^>]*>([\s\S]*?)<\/p>/gi;
    let match;
    const sections: string[] = [];

    while ((match = sectionRe.exec(html)) !== null) {
      const heading = match[1]
        .replace(/<[^>]+>/g, "")
        .replace(/[^\x00-\x7F]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      const content = match[2]
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

      if (!heading || !content) continue;
      // Skip anything that looks like JSON or is suspiciously long
      if (content.startsWith("{") || content.startsWith("[") || content.length > 300) continue;

      const h = heading.toLowerCase();
      if (
        h.includes("condition") ||
        h.includes("dimension") ||
        h.includes("material") ||
        h.includes("hardware") ||
        h.includes("include") ||
        h.includes("detail")
      ) {
        sections.push(`<p>${heading}: ${content}</p>`);
      }
    }

    return sections.join("");
  } catch {
    return "";
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeName, storeSlug: providedSlug, storeDomain, storefrontAccessToken, maxProducts, collectionHandles } = body;

    // Validate inputs
    if (!storeName || typeof storeName !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'storeName' parameter" },
        { status: 400 }
      );
    }

    if (!storeDomain || typeof storeDomain !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'storeDomain' parameter" },
        { status: 400 }
      );
    }

    // Ensure database table exists
    await initDatabase();

    let fetchResult: { products: any[]; skippedCount: number };
    let shopName: string | undefined;

    // If collection handles provided, use collection-based fetch (no token required)
    if (Array.isArray(collectionHandles) && collectionHandles.length > 0) {
      fetchResult = await fetchShopifyProductsByCollections(
        storeDomain,
        storeName,
        collectionHandles,
        maxProducts || 5000
      );
    } else if (storefrontAccessToken && typeof storefrontAccessToken === "string") {
      // Test connection first
      const connectionTest = await testShopifyConnection(
        storeDomain,
        storefrontAccessToken
      );

      if (!connectionTest.success) {
        return NextResponse.json(
          {
            error: "Failed to connect to Shopify store",
            details: connectionTest.error,
          },
          { status: 400 }
        );
      }

      shopName = connectionTest.shopName;

      // Fetch products via Storefront API
      fetchResult = await fetchShopifyProducts(
        storeDomain,
        storefrontAccessToken,
        storeName,
        maxProducts || 1000
      );
    } else {
      // Try public products.json endpoint (no token required)
      try {
        fetchResult = await fetchShopifyProductsPublic(
          storeDomain,
          storeName,
          maxProducts || 1000
        );
      } catch (publicError) {
        return NextResponse.json(
          {
            error: "Failed to fetch products from public endpoint",
            details:
              publicError instanceof Error
                ? publicError.message
                : "Unknown error. This store may require a Storefront Access Token.",
          },
          { status: 400 }
        );
      }
    }

    // Use provided slug if available, otherwise derive from store name (kebab-case)
    const storeSlug = (providedSlug && typeof providedSlug === "string")
      ? providedSlug
      : storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    // Look up store config to apply keyword/title exclusions
    const storeConfig = ALL_STORES.find(
      (s) => s.slug === storeSlug || s.name.toLowerCase() === storeName.toLowerCase()
    );
    const excludedTitles = new Set(
      ((storeConfig as any)?.excludeTitles ?? []).map((t: string) => t.toLowerCase())
    );
    const excludedKeywords: string[] = ((storeConfig as any)?.excludeKeywords ?? []).map(
      (k: string) => k.toLowerCase()
    );

    // Convert to standard format for storage, filtering out null prices and excluded titles/keywords
    const rawProducts = fetchResult.products.map(toRSSProductFormat);

    // For stores with scrapeProductPage, enrich descriptions with metafield sections
    // scraped from the product page HTML (e.g. Condition, Dimensions)
    const shouldScrape = (storeConfig as any)?.scrapeProductPage === true;
    if (shouldScrape) {
      await Promise.all(
        rawProducts.map(async (p) => {
          const extra = await scrapeProductPageSections(p.externalUrl);
          if (extra) {
            p.description = (p.description || "") + extra;
          }
        })
      );
    }
    const products = rawProducts
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
        compareAtPrice: p.compareAtPrice ?? undefined,
      }));
    const skippedCount = fetchResult.skippedCount;

    // Sync products to database
    const productCount = await syncProducts(storeSlug, storeName, products);

    return NextResponse.json({
      success: true,
      message: `Synced ${productCount} products from ${storeName}`,
      productCount,
      skippedCount,
      storeSlug,
      shopName,
      products,
    });
  } catch (error) {
    console.error("Shopify sync error:", error);
    return NextResponse.json(
      {
        error: "Failed to sync Shopify store",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Shopify Sync API",
    description:
      "Sync products from any Shopify store using their Storefront API",
    usage: {
      method: "POST",
      body: {
        storeName: "Store Display Name",
        storeDomain: "mystore.myshopify.com",
        storefrontAccessToken: "your-storefront-access-token",
        maxProducts: 250,
      },
    },
    notes: {
      storefrontAccessToken:
        "Get this from your Shopify admin: Settings > Apps and sales channels > Develop apps",
      storeDomain:
        "Can be either mystore.myshopify.com or a custom domain like www.mystore.com",
      maxProducts: "Optional, defaults to 250. Maximum products to fetch.",
    },
  });
}
