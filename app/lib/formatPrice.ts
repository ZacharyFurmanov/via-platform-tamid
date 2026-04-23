/**
 * Format a price with the correct currency symbol.
 * Examples:  125, "USD" → "$125"
 *            380, "GBP" → "£380"
 *            195, "AUD" → "A$195"
 *            200, "CAD" → "CA$200"
 *            150, "EUR" → "€150"
 */
export function formatPrice(price: number, currency?: string | null): string {
  const code = currency?.trim().toUpperCase() || "USD";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
    maximumFractionDigits: 0,
  }).format(price);
}
