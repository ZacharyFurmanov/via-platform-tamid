import { NextRequest, NextResponse } from "next/server";
import { generateClickId } from "@/app/lib/track";
import { saveClick } from "@/app/lib/analytics-db";
import { stores } from "@/app/lib/stores";

/**
 * Get the Shopify Collabs affiliate landing URL for a store.
 * Returns e.g. "https://store.com/VIAPLATFORM" or null if no affiliate.
 */
function getAffiliateLandingUrl(
  storeUrl: URL,
  storeSlug: string
): string | null {
  const storeConfig = stores.find((s) => s.slug === storeSlug);
  if (!storeConfig) return null;

  const affiliatePath =
    "affiliatePath" in storeConfig ? (storeConfig as any).affiliatePath : null;
  if (!affiliatePath) return null;

  return `${storeUrl.origin}/${affiliatePath}`;
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

  // Check if this store has a Shopify Collabs affiliate link.
  // If so, redirect to the affiliate landing page (e.g. store.com/VIAPLATFORM)
  // which sets the tracking cookie. The user lands on the store with the
  // cookie active — any purchase within the attribution window earns commission.
  if (storeSlug) {
    const affiliateUrl = getAffiliateLandingUrl(parsedUrl, storeSlug);
    if (affiliateUrl) {
      return NextResponse.redirect(affiliateUrl, 302);
    }
  }

  // For stores without affiliate tracking, redirect to the product URL directly
  parsedUrl.searchParams.set("via_click_id", clickId);
  return NextResponse.redirect(parsedUrl.toString(), 302);
}
