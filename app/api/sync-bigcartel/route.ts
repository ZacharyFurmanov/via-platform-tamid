import { NextRequest, NextResponse } from "next/server";
import { parseBigCartelJSON } from "@/app/lib/bigcartelClient";
import { syncProducts, initDatabase } from "@/app/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeName, storeSlug } = body;

    if (!storeName || typeof storeName !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'storeName' parameter" },
        { status: 400 }
      );
    }

    if (!storeSlug || typeof storeSlug !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'storeSlug' parameter (Big Cartel subdomain slug)" },
        { status: 400 }
      );
    }

    await initDatabase();

    const { products: rawProducts, skippedCount } = await parseBigCartelJSON(
      storeSlug,
      storeName
    );

    const products = rawProducts
      .filter((p) => p.price != null)
      .map((p) => ({
        title: p.title,
        price: p.price,
        image: p.image ?? undefined,
        images: p.images,
        externalUrl: p.externalUrl,
        description: p.description ?? undefined,
      }));

    const dbSlug = storeName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const productCount = await syncProducts(dbSlug, storeName, products);

    return NextResponse.json({
      success: true,
      message: `Synced ${productCount} products from ${storeName}`,
      productCount,
      skippedCount,
      storeSlug: dbSlug,
    });
  } catch (error) {
    console.error("Big Cartel sync error:", error);
    return NextResponse.json(
      {
        error: "Failed to sync Big Cartel store",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
