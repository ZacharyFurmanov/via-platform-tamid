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
 * Fetch the Shopify Collabs landing page server-side to extract the dt_id
 * tracking parameter. Shopify redirects e.g. store.com/VIAPLATFORM → store.com/?dt_id=12345.
 * We grab that dt_id and append it to the actual product URL so the user
 * lands on the product page AND the Collabs cookie gets set.
 */
async function getCollabsDtId(
  affiliateUrl: string
): Promise<string | null> {
  try {
    const res = await fetch(affiliateUrl, {
      redirect: "manual",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; VIA/1.0; +https://theviaplatform.com)",
      },
    });

    // Shopify returns a 302 with Location header containing dt_id
    const location = res.headers.get("location");
    if (location) {
      const url = new URL(location, affiliateUrl);
      const dtId = url.searchParams.get("dt_id");
      if (dtId) return dtId;
    }

    return null;
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
  // 1. Fetch the affiliate landing page server-side to get the dt_id
  // 2. Append dt_id to the product URL so Shopify sets the tracking cookie
  // 3. User lands directly on the product page with commission tracking active
  if (storeSlug) {
    const affiliate = getAffiliateConfig(storeSlug);
    if (affiliate) {
      const affiliateUrl = `${affiliate.origin}/${affiliate.affiliatePath}`;
      const dtId = await getCollabsDtId(affiliateUrl);

      if (dtId) {
        // Redirect to the product URL with dt_id — Shopify's Collabs script
        // on the product page reads dt_id and sets the attribution cookie
        parsedUrl.searchParams.set("dt_id", dtId);
        return NextResponse.redirect(parsedUrl.toString(), 302);
      }

      // Fallback: if we couldn't extract dt_id, redirect to the affiliate
      // landing page directly (user lands on homepage but cookie is set)
      return NextResponse.redirect(affiliateUrl, 302);
    }
  }

  // For stores without affiliate tracking, redirect to the product URL directly
  parsedUrl.searchParams.set("via_click_id", clickId);
  return NextResponse.redirect(parsedUrl.toString(), 302);
}
