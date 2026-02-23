import { NextRequest, NextResponse } from "next/server";
import { generateClickId } from "@/app/lib/track";
import { saveClick } from "@/app/lib/analytics-db";
import { stores } from "@/app/lib/stores";
import { getCollabsLink } from "@/app/lib/db";

/**
 * Get the discount config for a store (if any).
 */
function getDiscountConfig(storeSlug: string): {
  origin: string;
  discountCode: string;
} | null {
  const storeConfig = stores.find((s) => s.slug === storeSlug);
  if (!storeConfig) return null;

  const discountCode =
    "discountCode" in storeConfig ? (storeConfig as any).discountCode : null;
  if (!discountCode) return null;

  try {
    const origin = new URL(storeConfig.website).origin;
    return { origin, discountCode };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const productId = searchParams.get("pid");
  const productName = searchParams.get("pn");
  const store = searchParams.get("s");
  const storeSlug = searchParams.get("ss");
  const externalUrl = searchParams.get("url");

  // Validate required params
  if (!externalUrl) {
    return NextResponse.json({ error: "Missing URL" }, { status: 400 });
  }

  // Validate URL is safe (must be http/https)
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(externalUrl);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: "Invalid URL protocol" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Generate click ID for attribution
  const clickId = generateClickId();

  // Save click to database (fire and forget)
  saveClick({
    clickId,
    timestamp: new Date().toISOString(),
    productId: productId || "unknown",
    productName: productName || "unknown",
    store: store || "unknown",
    storeSlug: storeSlug || "unknown",
    externalUrl,
    userAgent: request.headers.get("user-agent") || undefined,
  }).catch(console.error);

  // If this product has a per-product collabs.shop link, use it directly.
  // The user's browser hitting collabs.shop registers the visit and sets a
  // 30-day attribution cookie — no app embed or dt_id needed.
  // pid is the composite product ID like "store-slug-123" — extract trailing number.
  if (productId) {
    const match = productId.match(/(\d+)$/);
    const numericId = match ? parseInt(match[1], 10) : NaN;
    if (!isNaN(numericId)) {
      const collabsLink = await getCollabsLink(numericId).catch(() => null);
      if (collabsLink) {
        return NextResponse.redirect(collabsLink, 302);
      }
    }
  }

  // Fallback for products without a collabs.shop link yet:
  // Apply discount code if the store has one, otherwise redirect directly.
  if (storeSlug) {
    const discount = getDiscountConfig(storeSlug);
    if (discount) {
      // Route through /discount/CODE so Shopify applies the discount,
      // then redirect to the product page.
      const productPath = parsedUrl.pathname + parsedUrl.search;
      const discountUrl = new URL(
        `/discount/${discount.discountCode}`,
        discount.origin
      );
      discountUrl.searchParams.set("redirect", productPath);
      return NextResponse.redirect(discountUrl.toString(), 302);
    }
  }

  // For stores without discount codes or collabs links, redirect directly
  parsedUrl.searchParams.set("via_click_id", clickId);
  return NextResponse.redirect(parsedUrl.toString(), 302);
}
