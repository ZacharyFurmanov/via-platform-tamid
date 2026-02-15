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
    logo: "/stores/lei-vintage-logo.jpg",
    logoBg: "#ffffff",
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
    logo: "/stores/vintage-archives-la-logo.jpg",
    logoBg: "#fdf8d8",
    currency: "USD",
    affiliatePath: "VIAPARTNER", // Shopify Collabs affiliate handle
  },
  {
    slug: "scarz-vintage",
    name: "SCARZ Vintage",
    location: "London, UK",
    description:
      "Scarz Vintage is a curated collection of archival clothing and accessories founded by Scarlett, rooted in a love for timeless design and intentional sourcing. Each piece is hand-selected for its character and story, from rare finds to standout runway pieces, offering distinctive vintage you won't see everywhere else. Guided by sustainability and individuality, Scarz gives exceptional pieces a second life.",
    website: "https://scarzvintage.com",
    dataSource: "scarz-vintage",
    image: "/stores/scarz-vintage.jpg",
    logo: "/stores/scarz-vintage-logo.jpg",
    logoBg: "#ffffff",
    currency: "GBP",
    affiliatePath: "VIAXSCARZ",
    discountCode: "VIAXSCARZ",
    perk: "VIA customers get free shipping",
  },
  {
    slug: "missi-archives",
    name: "Missi Archives",
    location: "New York, NY",
    description:
      "Missi Archives is a curated vintage collection inspired by early 2000s fashion, street style, and model off-duty looks. Based in New York, each piece is hand-selected to feel both nostalgic and current — from standout clothing and bags to shoes and accessories, all chosen with an eye for individuality and timeless cool.",
    website: "https://www.missiarchives.com",
    dataSource: "missi-archives",
    image: "/stores/missi-archives.jpg",
    logo: "/stores/missi-archives-logo.jpg",
    logoBg: "#722f37",
    logoDark: true,
    currency: "USD",
    affiliatePath: "0001",
    discountCode: "0001",
    perk: "VIA customers get free shipping",
  },
  {
    slug: "ascensio-vintage",
    name: "Ascensio Vintage",
    location: "Shropshire, England",
    description:
      "Ascensio's goal is to push away from fast-moving trends and unethically produced fast fashion, championing timeless style that transcends the decades. Our ethos centers on delivering authentic brands while promoting sustainable shopping, celebrating the beauty of pre-loved and archival pieces from the most well-known and loved brands. Each item is thoroughly checked by our team, ensuring quality and authenticity.",
    website: "https://ascensiovintage.com",
    dataSource: "ascensio-vintage",
    image: "/stores/ascensio-vintage.jpg",
    logo: "/stores/ascensio-vintage-logo.jpg",
    logoBg: "#ffffff",
    currency: "GBP",
    affiliatePath: "1234",
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
