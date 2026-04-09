import { NextResponse } from "next/server";
import { fetchSquareProducts } from "@/app/lib/squareClient";
import { syncProducts, initDatabase } from "@/app/lib/db";
import { SQUARE_STORES } from "@/app/lib/storeConfig";
import { stores } from "@/app/lib/stores";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeSlug, locationId } = body as { storeSlug: string; locationId?: string };

    if (!storeSlug) {
      return NextResponse.json({ error: "storeSlug is required" }, { status: 400 });
    }

    const storeConfig = SQUARE_STORES.find((s) => s.slug === storeSlug);
    if (!storeConfig) {
      return NextResponse.json({ error: "Store not found in config" }, { status: 404 });
    }

    const storeInfo = stores.find((s) => s.slug === storeSlug);
    const websiteUrl = storeInfo?.website ?? "https://vyaplatform.com";

    await initDatabase();

    const { products: rawProducts, skippedCount } = await fetchSquareProducts(
      locationId ?? storeConfig.locationId,
      storeConfig.name,
      websiteUrl,
    );

    const mapped = rawProducts
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

    const productCount = await syncProducts(storeSlug, storeConfig.name, mapped);

    return NextResponse.json({ success: true, productCount, skippedCount });
  } catch (err) {
    console.error("[sync-square] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
