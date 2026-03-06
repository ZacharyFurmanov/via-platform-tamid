import { NextRequest, NextResponse } from "next/server";
import { generateClickId } from "@/app/lib/track";
import { saveClick, saveProductView } from "@/app/lib/analytics-db";
import { stores } from "@/app/lib/stores";
import { getCollabsLink, getAnyCollabsLinkForStore } from "@/app/lib/db";
import { auth } from "@/app/lib/auth";

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
    if (!location) {
      console.error(`[track] extractDtId: no location header (status ${res.status}) for ${collabsLink}`);
      return null;
    }
    const url = new URL(location);
    const dtId = url.searchParams.get("dt_id");
    if (!dtId) {
      console.error(`[track] extractDtId: location has no dt_id param. location=${location}`);
    }
    return dtId;
  } catch (e) {
    console.error(`[track] extractDtId fetch error for ${collabsLink}:`, e);
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

  // Resolve logged-in user (non-blocking — anonymous clicks still work)
  const session = await auth().catch(() => null);
  const userId = session?.user?.id ?? null;

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
    userId,
  }).catch(console.error);

  // ---- Cart URLs (single and multi-item Shopify checkout) ----
  //
  // Attribution strategy:
  //
  // Single item: always redirect through the product's collabs.shop link.
  //   collabs.shop → store product page (Collabs cookie set on store domain)
  //   → user adds to cart → checks out via any method (Shop Pay included).
  //   Cookie is set before Shop Pay can intercept, so attribution is reliable.
  //   UX tradeoff: user lands on product page and must click "Add to Cart" once.
  //
  // Multi-item cart: can't use a single collabs.shop link, so fall back to
  //   appending dt_id to the cart URL. Shop Pay preserves dt_id (we've seen
  //   it in shop.app URLs), and Shopify should attribute it at order creation.
  //
  if (isCartUrl(parsedUrl) && storeSlug) {
    // Look up the product-specific collabs link (single-item path)
    let productCollabsLink: string | null = null;
    if (productId) {
      const match = productId.match(/(\d+)$/);
      const numericId = match ? parseInt(match[1], 10) : NaN;
      if (!isNaN(numericId)) {
        productCollabsLink = await getCollabsLink(numericId).catch(() => null);
      }
    }

    // ── Single item: go through collabs.shop for reliable cookie attribution ──
    if (productCollabsLink) {
      return NextResponse.redirect(productCollabsLink, 302);
    }

    // ── Multi-item cart: append dt_id to the cart URL ─────────────────────────
    const storeCollabsLink = await getAnyCollabsLinkForStore(storeSlug).catch(() => null);
    if (storeCollabsLink) {
      const dtId = await extractDtId(storeCollabsLink);
      if (dtId) {
        parsedUrl.searchParams.set("dt_id", dtId);
        return NextResponse.redirect(parsedUrl.toString(), 302);
      } else {
        console.error(
          `[track] extractDtId failed for multi-item cart, store "${storeSlug}". Commission may not be tracked. Link: ${storeCollabsLink}`
        );
      }
    } else {
      console.error(
        `[track] No collabs link for store "${storeSlug}" — commission cannot be tracked.`
      );
    }

    // Fallback: discount code redirect (only for stores that actually have one)
    const discount = getDiscountConfig(storeSlug);
    if (discount) {
      const cartPath = parsedUrl.pathname + parsedUrl.search;
      const discountUrl = new URL(`/discount/${discount.discountCode}`, discount.origin);
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
