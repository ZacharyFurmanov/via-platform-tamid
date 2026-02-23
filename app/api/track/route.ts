import { NextRequest, NextResponse } from "next/server";
import { generateClickId } from "@/app/lib/track";
import { saveClick } from "@/app/lib/analytics-db";
import { stores } from "@/app/lib/stores";

/**
 * Get the Shopify Collabs affiliate config for a store.
 */
function getAffiliateConfig(storeSlug: string): {
  affiliatePath: string;
  origin: string;
  discountCode: string | null;
} | null {
  const storeConfig = stores.find((s) => s.slug === storeSlug);
  if (!storeConfig) return null;

  const affiliatePath =
    "affiliatePath" in storeConfig ? (storeConfig as any).affiliatePath : null;
  if (!affiliatePath) return null;

  const discountCode =
    "discountCode" in storeConfig ? (storeConfig as any).discountCode : null;

  try {
    const origin = new URL(storeConfig.website).origin;
    return { affiliatePath, origin, discountCode };
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

  // For stores with Shopify Collabs affiliate tracking, route the user's
  // browser directly through Shopify's affiliate mechanism so Shopify counts
  // the visit server-side (no app embed required).
  if (storeSlug) {
    const affiliate = getAffiliateConfig(storeSlug);
    if (affiliate) {
      const productPath = parsedUrl.pathname + parsedUrl.search;

      if (affiliate.discountCode) {
        // Discount flow (Missi, SCARZ): the affiliate path IS the discount code.
        // /discount/CODE supports a ?redirect= param so the user lands on the
        // specific product after Shopify applies the discount.
        const discountUrl = new URL(
          `/discount/${affiliate.discountCode}`,
          affiliate.origin
        );
        discountUrl.searchParams.set("redirect", productPath);
        return NextResponse.redirect(discountUrl.toString(), 302);
      }

      // Direct flow: send the user's browser to the store affiliate URL.
      // Shopify counts the visit server-side when this URL is hit.
      // The ?redirect= param tells Shopify where to land after tracking —
      // if Shopify passes it through the user goes straight to the product,
      // otherwise they land on the store homepage (visit is still counted).
      const affiliateUrl = new URL(
        `/${affiliate.affiliatePath}`,
        affiliate.origin
      );
      affiliateUrl.searchParams.set("redirect", productPath);
      return NextResponse.redirect(affiliateUrl.toString(), 302);
    }
  }

  // For stores without affiliate tracking, redirect to the product URL directly
  parsedUrl.searchParams.set("via_click_id", clickId);
  return NextResponse.redirect(parsedUrl.toString(), 302);
}
