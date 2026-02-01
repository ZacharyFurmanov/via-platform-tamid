import { NextRequest, NextResponse } from "next/server";
import { parseRSSFeed } from "@/app/lib/rssFeedParser";
import { parseSquarespaceJSON } from "@/app/lib/squarespaceClient";
import { syncProducts, initDatabase } from "@/app/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeName, rssUrl, shopUrl } = body;

    // Validate inputs
    if (!storeName || typeof storeName !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'storeName' parameter" },
        { status: 400 }
      );
    }

    const url = shopUrl || rssUrl;
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'shopUrl' or 'rssUrl' parameter" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Ensure database table exists
    await initDatabase();

    let rawProducts;
    let skippedCount: number;

    if (shopUrl) {
      // Use JSON API (recommended — includes prices from Squarespace Commerce)
      const result = await parseSquarespaceJSON(shopUrl, storeName);
      rawProducts = result.products;
      skippedCount = result.skippedCount;
    } else {
      // Fallback to RSS feed
      const result = await parseRSSFeed(rssUrl, storeName);
      rawProducts = result.products;
      skippedCount = result.skippedCount;
    }

    // Filter out products with null prices and transform for database
    const products = rawProducts
      .filter((p) => p.price !== null)
      .map((p) => ({
        title: p.title,
        price: p.price as number,
        image: p.image ?? undefined,
        externalUrl: p.externalUrl,
      }));

    // Create store slug from store name (kebab-case)
    const storeSlug = storeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Sync products to database
    const productCount = await syncProducts(storeSlug, storeName, products);

    return NextResponse.json({
      success: true,
      message: `Synced ${productCount} products from ${storeName}`,
      productCount,
      skippedCount,
      storeSlug,
      products,
    });
  } catch (error) {
    console.error("Squarespace sync error:", error);
    return NextResponse.json(
      {
        error: "Failed to sync Squarespace store",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Squarespace Sync API",
    usage: {
      method: "POST",
      body: {
        storeName: "Store Display Name",
        shopUrl: "https://example.com/shop (recommended — uses JSON API with prices)",
        rssUrl: "https://example.com/products?format=rss (fallback — may lack prices)",
      },
    },
    example: {
      storeName: "LEI Vintage",
      shopUrl: "https://www.leivintage.com/shop",
    },
  });
}
