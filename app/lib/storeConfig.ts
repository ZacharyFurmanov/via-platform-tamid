export type SquarespaceStore = {
  type: "squarespace";
  name: string;
  slug: string;
  shopUrl?: string;
  rssUrl?: string;
};

export type ShopifyStore = {
  type: "shopify";
  name: string;
  slug: string;
  storeDomain: string;
  storefrontAccessToken?: string;
};

export type Store = SquarespaceStore | ShopifyStore;

// Squarespace stores (RSS-based)
export const SQUARESPACE_STORES: SquarespaceStore[] = [
  {
    type: "squarespace",
    name: "LEI Vintage",
    slug: "lei-vintage",
    shopUrl: "https://www.leivintage.com/shop",
  },
];

// Shopify stores (Storefront API)
export const SHOPIFY_STORES: ShopifyStore[] = [
  {
    type: "shopify",
    name: "Vintage Archives LA",
    slug: "vintage-archives-la",
    storeDomain: "vintagearchivesla.com",
  },
  {
    type: "shopify",
    name: "SCARZ Vintage",
    slug: "scarz-vintage",
    storeDomain: "scarzvintage.com",
  },
];

export const ALL_STORES: Store[] = [...SQUARESPACE_STORES, ...SHOPIFY_STORES];
