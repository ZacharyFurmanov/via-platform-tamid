import { NextRequest, NextResponse } from "next/server";
import { generateClickId } from "@/app/lib/track";
import { saveClick, saveProductView } from "@/app/lib/analytics-db";
import { stores } from "@/app/lib/stores";
import { getCollabsLink } from "@/app/lib/db";
import { getSetting } from "@/app/lib/settings-db";
import { auth } from "@/app/lib/auth";

/** POST /api/track — record a product page view (fire-and-forget from client) */
export async function POST(request: NextRequest) {
  try {
    const { productId } = await request.json();
    if (!productId || typeof productId !== "string") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const session = await auth().catch(() => null);
    const userId = session?.user?.id ?? null;
    await saveProductView(productId, userId);
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
  const itemsParam = searchParams.get("items");
  const utmSource = searchParams.get("us");

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

  // Save click to database — must await before returning redirect so the
  // serverless function doesn't terminate before the DB write completes.
  let cartItems: import("@/app/lib/analytics-db").CartItemSnapshot[] | undefined;
  if (itemsParam) {
    try { cartItems = JSON.parse(itemsParam); } catch {}
  }

  await saveClick({
    clickId,
    timestamp: new Date().toISOString(),
    productId: productId || "unknown",
    productName: productName || "unknown",
    store: store || "unknown",
    storeSlug: storeSlug || "unknown",
    externalUrl,
    userAgent: request.headers.get("user-agent") || undefined,
    userId,
    cartItems,
    utmSource: utmSource || null,
  }).catch(console.error);

  // ---- Cart URLs ----
  if (isCartUrl(parsedUrl) && storeSlug) {
    // If the store has a webhook configured, embed via_click_id as a Shopify cart
    // attribute. Shopify passes it through to note_attributes on the order, giving
    // the webhook handler an exact click match — no guessing, no last-click fallback.
    const hasWebhook = !!(await getSetting(`shopify_webhook_secret_${storeSlug}`).catch(() => null));
    if (hasWebhook) {
      parsedUrl.searchParams.set("attributes[via_click_id]", clickId);
      return NextResponse.redirect(parsedUrl.toString(), 302);
    }

    // No webhook → route through the product's collabs.shop link for commission tracking.
    if (productId) {
      const match = productId.match(/(\d+)$/);
      const numericId = match ? parseInt(match[1], 10) : NaN;
      if (!isNaN(numericId)) {
        const productCollabsLink = await getCollabsLink(numericId).catch(() => null);
        if (productCollabsLink && !parsedUrl.pathname.includes(",")) {
          return NextResponse.redirect(productCollabsLink, 302);
        }
      }
    }

    console.error(`[track] No collabs link for product "${productId}" (store: "${storeSlug}") — this product should not be on VYA.`);
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
