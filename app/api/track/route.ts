import { NextRequest, NextResponse } from "next/server";
import { generateClickId } from "@/app/lib/track";
import { saveClick } from "@/app/lib/analytics-db";
import { stores } from "@/app/lib/stores";

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
      return NextResponse.json({ error: "Invalid URL protocol" }, { status: 400 });
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

  // Conditional affiliate path rewriting for cart checkout
  const isAffiliate = searchParams.get("affiliate") === "1";
  if (isAffiliate && storeSlug) {
    const storeConfig = stores.find((s) => s.slug === storeSlug);
    if (storeConfig && "affiliatePath" in storeConfig && storeConfig.affiliatePath) {
      // Extract the product handle (last path segment)
      const pathSegments = redirectUrl.pathname.split("/").filter(Boolean);
      const handle = pathSegments[pathSegments.length - 1];
      if (handle) {
        redirectUrl.pathname = `/${storeConfig.affiliatePath}/products/${handle}`;
      }
    }
  }

  // Always append via_click_id for our own conversion attribution
  redirectUrl.searchParams.set("via_click_id", clickId);

  // Redirect to the store with tracking
  return NextResponse.redirect(redirectUrl.toString(), 302);
}
