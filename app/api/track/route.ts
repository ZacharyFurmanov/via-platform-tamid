import { NextRequest, NextResponse } from "next/server";
import { generateClickId } from "@/app/lib/track";
import { saveClick } from "@/app/lib/analytics-db";
import { stores } from "@/app/lib/stores";
import { getCollabsLink } from "@/app/lib/db";

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

/**
 * Fetch the Shopify Collabs affiliate URL server-side to extract the dt_id
 * tracking parameter. This is appended to the product URL so the Collabs
 * app embed on the store can register the visit and attribute any sale to VIA.
 *
 * Requires the store to have the Collabs app embed (Step 5) enabled.
 */
async function getDtId(affiliateUrl: string): Promise<string | null> {
  try {
    const res = await fetch(affiliateUrl, {
      redirect: "manual",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; VIA/1.0; +https://theviaplatform.com)",
      },
    });
    const location = res.headers.get("location");
    if (!location) return null;
    const url = new URL(location, affiliateUrl);
    return url.searchParams.get("dt_id");
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

  // If this product has a pre-generated per-product collabs.shop link, use it
  // directly. The user's browser hitting collabs.shop registers the visit and
  // sets a 30-day attribution cookie — no app embed required.
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

  // For stores with Shopify Collabs affiliate tracking:
  // Fetch the affiliate URL server-side to extract dt_id, then deep-link the
  // user directly to the product with dt_id appended. The Collabs app embed
  // on the store reads dt_id and registers the visit + 30-day attribution cookie.
  if (storeSlug) {
    const affiliate = getAffiliateConfig(storeSlug);
    if (affiliate) {
      const productPath = parsedUrl.pathname + parsedUrl.search;
      const affiliateUrl = `${affiliate.origin}/${affiliate.affiliatePath}`;
      const dtId = await getDtId(affiliateUrl);

      if (dtId) {
        if (affiliate.discountCode) {
          // Discount flow (Missi, SCARZ): route through /discount/CODE so
          // Shopify applies the discount. Include dt_id in the redirect target
          // since Shopify strips it during the discount redirect.
          const productPathWithDtId = productPath.includes("?")
            ? `${productPath}&dt_id=${dtId}`
            : `${productPath}?dt_id=${dtId}`;
          const discountUrl = new URL(
            `/discount/${affiliate.discountCode}`,
            affiliate.origin
          );
          discountUrl.searchParams.set("dt_id", dtId);
          discountUrl.searchParams.set("redirect", productPathWithDtId);
          return NextResponse.redirect(discountUrl.toString(), 302);
        }

        // Direct flow: append dt_id to the product URL so the Collabs app
        // embed on the product page registers the visit.
        parsedUrl.searchParams.set("dt_id", dtId);
        return NextResponse.redirect(parsedUrl.toString(), 302);
      }

      // Fallback if dt_id fetch fails: redirect to the affiliate URL directly
      // so the user at least lands on the store (visit counted via their browser).
      return NextResponse.redirect(affiliateUrl, 302);
    }
  }

  // For stores without affiliate tracking, redirect to the product URL directly
  parsedUrl.searchParams.set("via_click_id", clickId);
  return NextResponse.redirect(parsedUrl.toString(), 302);
}
