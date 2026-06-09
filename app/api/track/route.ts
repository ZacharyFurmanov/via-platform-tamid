import { NextRequest, NextResponse } from "next/server";
import { generateClickId } from "@/app/lib/track";
import { saveClick, saveProductView } from "@/app/lib/analytics-db";
import { stores } from "@/app/lib/stores";
import { getCollabsLink } from "@/app/lib/db";
import { getSetting } from "@/app/lib/settings-db";
import { auth } from "@/app/lib/auth";
import {
 getDtIdForProduct,
 buildCartUrlWithDtId,
 buildMultiCartUrlWithDtId,
} from "@/app/lib/collabsDtId";

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
 const rawUtmSource = searchParams.get("us");
 const SOURCE_ALIASES: Record<string, string> = { ig: "instagram", fb: "facebook", tw: "twitter", tt: "tiktok", yt: "youtube", li: "linkedin" };
 const utmSource = rawUtmSource ? (SOURCE_ALIASES[rawUtmSource.toLowerCase()] ?? rawUtmSource.toLowerCase()) : null;

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

 const storeHasWebhook = storeSlug
 ? !!(await getSetting(`shopify_webhook_secret_${storeSlug}`).catch(() => null))
 : false;

 // Some stores use Shop Pay express checkout, which auto-redirects the cart into
 // shop.app before the Collabs visit pixel can fire — so the dt_id-cart shortcut
 // silently loses the visit AND the commission. For these we route through
 // collabs.shop instead, which logs the visit server-side BEFORE any redirect.
 const forceCollabs = storeSlug
 ? (stores.find((s) => s.slug === storeSlug) as { collabsRedirect?: boolean } | undefined)?.collabsRedirect === true
 : false;

 // Resolve product DB id from the composite "store-slug-123" → 123
 const numericProductId: number | null = (() => {
 if (!productId) return null;
 const m = productId.match(/(\d+)$/);
 const n = m ? parseInt(m[1], 10) : NaN;
 return Number.isFinite(n) ? n : null;
 })();

 // ============ PRIMARY: Shopify Collabs + direct-to-cart ============
 // We do NOT redirect through `collabs.shop` anymore. Instead we extract the
 // product's `dt_id` value (the Shopify Collabs attribution token) from the
 // collabs link and append it to the cart URL directly. This drops the Collabs
 // tracking cookie via Shopify's own pixel AND lands the buyer at the cart
 // with the item already added — one tap to checkout.
 //
 // Confirmed: a URL like `store.com/cart/{variantId}:1?dt_id=X` registers a
 // Collabs visit just as if the buyer came from `collabs.shop`.
 //
 // The webhook (if configured) still fires on checkout — it handles the rich
 // order data (customer, items, total). Two systems complement each other.
 if (numericProductId != null && isCartUrl(parsedUrl) && !forceCollabs) {
 const dtId = await getDtIdForProduct(numericProductId).catch(() => null);
 if (dtId) {
 const isMulti = parsedUrl.pathname.includes(",");
 const variantSpec = parsedUrl.pathname.replace(/^\/cart\//, "");
 const cartWithDtId = isMulti
  ? buildMultiCartUrlWithDtId({
   storeOrigin: parsedUrl.origin,
   variantSpec,
   dtId,
  })
  : buildCartUrlWithDtId({
   storeOrigin: parsedUrl.origin,
   variantId: variantSpec.split(":")[0],
   dtId,
  });
 if (cartWithDtId) {
  // Also attach via_click_id if the store has a webhook — gives webhook
  // handler an exact click match in addition to Collabs cookie.
  const final = new URL(cartWithDtId);
  if (storeHasWebhook) {
  final.searchParams.set("attributes[via_click_id]", clickId);
  }
  return NextResponse.redirect(final.toString(), 302);
 }
 }
 // No dt_id found but we have a cart URL — fall through to the legacy
 // collabs.shop redirect below.
 }

 // If the destination isn't a cart URL (single product page), legacy redirect
 // through collabs.shop is still the right move so the cookie drops on a real
 // store page.
 if (numericProductId != null) {
 const collabsLink = await getCollabsLink(numericProductId).catch(() => null);
 if (collabsLink) {
 return NextResponse.redirect(collabsLink, 302);
 }
 }

 // ============ FALLBACK: no collabs_link / no dt_id ============
 if (isCartUrl(parsedUrl) && storeSlug) {
 if (storeHasWebhook) {
 parsedUrl.searchParams.set("attributes[via_click_id]", clickId);
 return NextResponse.redirect(parsedUrl.toString(), 302);
 }
 console.error(`[track] No collabs link for product "${productId}" (store: "${storeSlug}") — this product should not be on VYA.`);
 parsedUrl.searchParams.set("via_click_id", clickId);
 return NextResponse.redirect(parsedUrl.toString(), 302);
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

 // Stripe Payment Links (buy.stripe.com) — append client_reference_id for exact order attribution
 if (parsedUrl.hostname === "buy.stripe.com") {
 parsedUrl.searchParams.set("client_reference_id", clickId);
 return NextResponse.redirect(parsedUrl.toString(), 302);
 }

 // For stores without discount codes or collabs links, redirect directly
 parsedUrl.searchParams.set("via_click_id", clickId);
 return NextResponse.redirect(parsedUrl.toString(), 302);
}
