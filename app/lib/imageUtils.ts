/**
 * Resize a Shopify CDN image by appending width/quality params.
 * Shopify supports on-the-fly resizing via query params — no extra service needed.
 * Non-Shopify URLs are returned unchanged.
 */
export function resizeImage(
  url: string | null | undefined,
  width: number,
  quality = 75
): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (
      u.hostname.includes("cdn.shopify.com") ||
      u.hostname.includes("shopifycdn.com") ||
      u.hostname.endsWith(".myshopify.com")
    ) {
      u.searchParams.set("width", String(width));
      u.searchParams.set("quality", String(quality));
      return u.toString();
    }
  } catch {
    // Invalid URL — return as-is
  }
  return url;
}
