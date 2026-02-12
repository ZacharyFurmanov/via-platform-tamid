export const stores = [
  {
    slug: "lei-vintage",
    name: "LEI Vintage",
    location: "Boston, MA",
    description:
      "LEI was born from the belief that the best style already exists. Rooted in vintage and sustainability, we curate timeless pieces with history and character. Reviving the past to create modern staples meant to be worn again and again.",
    website: "https://www.leivintage.com",
    dataSource: "lei-vintage",
    image: "/stores/LEI.jpg",
    currency: "USD",
    // No affiliatePath — uses Squarespace pixel for conversion tracking
  },
  {
    slug: "vintage-archives-la",
    name: "Vintage Archives LA",
    location: "Los Angeles, CA",
    description:
      "Vintage Archives LA is a curated collection of vintage designer shoes, from iconic classics to hidden gems. Rooted in sustainability and a love for fashion with history, each piece is hand-selected to offer something unique. Based in LA, the shop is dedicated to giving quality pieces a second life while helping you find something that feels just right.",
    website: "https://vintagearchivesla.com",
    dataSource: "vintage-archives-la",
    image: "/stores/VintageArchivesLA.jpg",
    currency: "USD",
    affiliatePath: "VIAPARTNER", // Shopify Collabs affiliate handle
  },
  {
    slug: "scarz-vintage",
    name: "SCARZ Vintage",
    location: "London, UK",
    description: "",
    website: "https://scarzvintage.com",
    dataSource: "scarz-vintage",
    image: "/stores/placeholder.svg",
    currency: "GBP",
    affiliatePath: "VIAXSCARZ",
    perk: "VIA customers get free shipping",
  },
];

// Approximate exchange rates to USD (update periodically)
const exchangeRatesToUSD: Record<string, number> = {
  USD: 1,
  GBP: 1.26,
  EUR: 1.08,
  CAD: 0.74,
  AUD: 0.65,
};

/**
 * Convert a price to USD based on the store's currency.
 * Uses the store slug to determine the source currency.
 */
export function convertToUSD(price: number, storeSlug: string): number {
  const store = stores.find((s) => s.slug === storeSlug);
  const currency = store?.currency ?? "USD";
  if (currency === "USD") return price;
  const rate = exchangeRatesToUSD[currency] ?? 1;
  return Math.round(price * rate * 100) / 100;
}
  