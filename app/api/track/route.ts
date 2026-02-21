import { NextRequest, NextResponse } from "next/server";
import { generateClickId } from "@/app/lib/track";
import { saveClick } from "@/app/lib/analytics-db";
import { stores } from "@/app/lib/stores";

/**
 * Get the affiliate path for a store, if configured.
 */
function getAffiliatePath(storeSlug: string): string | null {
  const storeConfig = stores.find((s) => s.slug === storeSlug);
  if (!storeConfig) return null;
  return "affiliatePath" in storeConfig
    ? (storeConfig as any).affiliatePath
    : null;
}

/**
 * Inject the Shopify Collabs affiliate path into a product URL.
 * Only works for /products/ paths — Shopify doesn't support it on /cart/ etc.
 */
function injectAffiliatePath(url: URL, affiliatePath: string): URL {
  // Don't double-inject
  if (
    url.pathname.startsWith(`/${affiliatePath}/`) ||
    url.pathname === `/${affiliatePath}`
  ) {
    return url;
  }

  // Only inject for product page URLs
  if (url.pathname.startsWith("/products/")) {
    url.pathname = `/${affiliatePath}${url.pathname}`;
  }

  return url;
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

  // Build the redirect URL with tracking parameters
  let redirectUrl = new URL(externalUrl);
  const affiliatePath = storeSlug ? getAffiliatePath(storeSlug) : null;

  if (affiliatePath) {
    const isCartUrl =
      redirectUrl.pathname.startsWith("/cart/") ||
      redirectUrl.pathname.startsWith("/checkouts/");

    if (isCartUrl) {
      // For cart/checkout URLs, Shopify doesn't support the affiliate path
      // in the URL. Instead, redirect to the affiliate landing page first
      // which sets the tracking cookie, then the browser follows to cart.
      // We return an HTML page that visits the affiliate link (setting the
      // cookie) then immediately redirects to the cart URL.
      redirectUrl.searchParams.set("via_click_id", clickId);
      const affiliateLandingUrl = `${redirectUrl.origin}/${affiliatePath}`;
      const cartUrl = redirectUrl.toString();

      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Redirecting...</title>
</head>
<body>
<img src="${affiliateLandingUrl}" style="display:none" onerror="void(0)">
<script>
// Visit affiliate landing page in a hidden iframe to set tracking cookie,
// then redirect to the cart
var iframe = document.createElement('iframe');
iframe.style.display = 'none';
iframe.src = ${JSON.stringify(affiliateLandingUrl)};
document.body.appendChild(iframe);
// Give it a moment to set the cookie, then go to cart
setTimeout(function() {
  window.location.href = ${JSON.stringify(cartUrl)};
}, 800);
</script>
<noscript>
<meta http-equiv="refresh" content="0;url=${cartUrl}">
</noscript>
</body>
</html>`;

      return new NextResponse(html, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    } else {
      // For product URLs, inject affiliate path directly
      redirectUrl = injectAffiliatePath(redirectUrl, affiliatePath);
    }
  }

  // Always append via_click_id for our own conversion attribution
  redirectUrl.searchParams.set("via_click_id", clickId);

  // Redirect to the store with tracking
  return NextResponse.redirect(redirectUrl.toString(), 302);
}
