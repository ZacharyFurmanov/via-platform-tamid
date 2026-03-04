import { NextRequest, NextResponse } from "next/server";
import { generateClickId } from "@/app/lib/track";
import { saveClick, saveProductView } from "@/app/lib/analytics-db";
import { stores } from "@/app/lib/stores";
import { getCollabsLink, getAnyCollabsLinkForStore } from "@/app/lib/db";

/** POST /api/track — record a product page view (fire-and-forget from client) */
export async function POST(request: NextRequest) {
  try {
    const { productId } = await request.json();
    if (!productId || typeof productId !== "string") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    await saveProductView(productId);
  } catch {
    // Silently swallow — view tracking should never break the page
  }
  return NextResponse.json({ ok: true });
}

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

/**
 * Follow a collabs.shop link and extract the dt_id tracking parameter
 * from the redirect URL. Returns null if it can't be extracted.
 */
async function extractDtId(collabsLink: string): Promise<string | null> {
  try {
    const res = await fetch(collabsLink, { redirect: "manual" });
    const location = res.headers.get("location");
    if (!location) return null;
    const url = new URL(location);
    return url.searchParams.get("dt_id");
  } catch {
    return null;
  }
}

/**
 * Check if a URL is a Shopify cart URL (e.g. /cart/VARIANT:1,VARIANT:1)
 */
function isCartUrl(url: URL): boolean {
  return /^\/cart\/\d+:\d+/.test(url.pathname);
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

  // ---- Cart URLs (single and multi-item Shopify checkout) ----
  // Extract the dt_id tracking parameter from a collabs.shop link and append
  // it to the cart URL. The Collabs embed on the store reads dt_id and sets
  // the 30-day attribution cookie. This sends users directly to cart (not the
  // product page that collabs.shop redirects to).
  if (isCartUrl(parsedUrl) && storeSlug) {
    // For single items, prefer the product-specific collabs link (more reliable)
    let collabsLink: string | null = null;
    if (productId) {
      const match = productId.match(/(\d+)$/);
      const numericId = match ? parseInt(match[1], 10) : NaN;
      if (!isNaN(numericId)) {
        collabsLink = await getCollabsLink(numericId).catch(() => null);
      }
    }
    // Fall back to any store collabs link (for multi-item carts)
    if (!collabsLink) {
      collabsLink = await getAnyCollabsLinkForStore(storeSlug).catch(() => null);
    }

    if (collabsLink) {
      const dtId = await extractDtId(collabsLink);
      if (dtId) {
        parsedUrl.searchParams.set("dt_id", dtId);
        return NextResponse.redirect(parsedUrl.toString(), 302);
      } else {
        console.error(
          `[track] extractDtId failed for store "${storeSlug}" — collabs link: ${collabsLink}. Commission will NOT be tracked for this checkout.`
        );
      }
    } else {
      console.error(
        `[track] No collabs link found in DB for store "${storeSlug}" — cannot extract dt_id. Commission will NOT be tracked. Run generate-collabs-links for this store.`
      );
    }

    // Fallback: try discount code for cart URLs
    const discount = getDiscountConfig(storeSlug);
    if (discount) {
      const cartPath = parsedUrl.pathname + parsedUrl.search;
      const discountUrl = new URL(
        `/discount/${discount.discountCode}`,
        discount.origin
      );
      discountUrl.searchParams.set("redirect", cartPath);
      return NextResponse.redirect(discountUrl.toString(), 302);
    }

    parsedUrl.searchParams.set("via_click_id", clickId);
    return NextResponse.redirect(parsedUrl.toString(), 302);
  }

  // ---- Single product URLs (no variant_id → can't build cart URL) ----
  // Redirect through the product's collabs.shop link so dt_id is set.
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

  // Fallback: apply discount code if store has one, otherwise redirect directly.
  if (storeSlug) {
    const discount = getDiscountConfig(storeSlug);
    if (discount) {
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
