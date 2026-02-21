import { NextRequest, NextResponse } from "next/server";
import { generateClickId } from "@/app/lib/track";
import { saveClick } from "@/app/lib/analytics-db";
import { stores } from "@/app/lib/stores";

/**
 * Get the Shopify Collabs affiliate config for a store.
 */
function getAffiliateConfig(
  storeSlug: string
): { affiliatePath: string; origin: string } | null {
  const storeConfig = stores.find((s) => s.slug === storeSlug);
  if (!storeConfig) return null;

  const affiliatePath =
    "affiliatePath" in storeConfig
      ? (storeConfig as any).affiliatePath
      : null;
  if (!affiliatePath) return null;

  try {
    const origin = new URL(storeConfig.website).origin;
    return { affiliatePath, origin };
  } catch {
    return null;
  }
}

/**
 * Fetch the Shopify Collabs landing page server-side to determine the
 * redirect type and extract the dt_id tracking parameter.
 *
 * Some stores redirect directly: store.com/AFFILIATE → store.com/?dt_id=123
 * Others go through a discount flow: store.com/AFFILIATE → /discount/CODE?dt_id=123&redirect=/...
 *
 * Returns the dt_id and whether it uses the discount flow.
 */
async function getCollabsRedirect(
  affiliateUrl: string
): Promise<{ dtId: string; discountPath: string | null } | null> {
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
    const dtId = url.searchParams.get("dt_id");
    if (!dtId) return null;

    // Check if the redirect goes through /discount/ path
    const isDiscountFlow = url.pathname.startsWith("/discount/");
    return {
      dtId,
      discountPath: isDiscountFlow ? url.pathname : null,
    };
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

  // For stores with Shopify Collabs affiliate tracking:
  if (storeSlug) {
    const affiliate = getAffiliateConfig(storeSlug);
    if (affiliate) {
      const affiliateUrl = `${affiliate.origin}/${affiliate.affiliatePath}`;
      const collabs = await getCollabsRedirect(affiliateUrl);

      if (collabs) {
        // Extract the product path (e.g. /products/some-product)
        const productPath = parsedUrl.pathname + parsedUrl.search;

        if (collabs.discountPath) {
          // Discount flow (Missi, SCARZ): redirect through /discount/ path
          // with the product page as the redirect destination. This lets
          // Shopify apply the discount AND carry the dt_id to the product page
          // through its own redirect chain, which is more reliable than
          // appending dt_id ourselves.
          const discountUrl = new URL(collabs.discountPath, affiliate.origin);
          discountUrl.searchParams.set("dt_id", collabs.dtId);
          discountUrl.searchParams.set("redirect", productPath);
          return NextResponse.redirect(discountUrl.toString(), 302);
        }

        // Direct flow: append dt_id to the product URL
        parsedUrl.searchParams.set("dt_id", collabs.dtId);
        return NextResponse.redirect(parsedUrl.toString(), 302);
      }

      // Fallback: redirect to the affiliate landing page directly
      return NextResponse.redirect(affiliateUrl, 302);
    }
  }

  // For stores without affiliate tracking, redirect to the product URL directly
  parsedUrl.searchParams.set("via_click_id", clickId);
  return NextResponse.redirect(parsedUrl.toString(), 302);
}
