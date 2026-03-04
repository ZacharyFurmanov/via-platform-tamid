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

export type BigCartelStore = {
  type: "bigcartel";
  name: string;
  slug: string;
  /** The store's Big Cartel subdomain slug (e.g. "kikiddesignandconsign") */
  storeSlug: string;
};

export type Store = SquarespaceStore | ShopifyStore | BigCartelStore;

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
  {
    type: "shopify",
    name: "Missi Archives",
    slug: "missi-archives",
    storeDomain: "www.missiarchives.com",
  },
  {
    type: "shopify",
    name: "Ascensio Vintage",
    slug: "ascensio-vintage",
    storeDomain: "ascensiovintage.com",
  },
  {
    type: "shopify",
    name: "Lover Girl Vintage",
    slug: "lover-girl-vintage",
    storeDomain: "lovergirlvintage.com",
  },
  {
    type: "shopify",
    name: "Source Twenty Four",
    slug: "source-twenty-four",
    storeDomain: "sourcetwentyfour.com",
  },
  {
    type: "shopify",
    name: "The Objects of Affection",
    slug: "the-objects-of-affection",
    storeDomain: "theobjectsofaffection.com",
  },
  {
    type: "shopify",
    name: "Vintari Vault",
    slug: "vintari-vault",
    storeDomain: "vintarivault.com",
  },
  {
    type: "shopify",
    name: "Vangie",
    slug: "vangie",
    storeDomain: "vangie.co",
  },
  {
    type: "shopify",
    name: "House on a Chain",
    slug: "house-on-a-chain",
    storeDomain: "www.houseonachain.com",
  },
  {
    type: "shopify",
    name: "To Us Vintage",
    slug: "to-us-vintage",
    storeDomain: "tousvintage.com",
  },
  {
    type: "shopify",
    name: "Sourced by Scottie",
    slug: "sourced-by-scottie",
    storeDomain: "sourcedbyscottie.com",
  },
  {
    type: "shopify",
    name: "Maison Optimism Vintage",
    slug: "maison-optimism-vintage",
    storeDomain: "maisonoptimismvintage.com",
  },
];

// Big Cartel stores (public JSON API — no token required)
export const BIGCARTEL_STORES: BigCartelStore[] = [];

export const ALL_STORES: Store[] = [
  ...SQUARESPACE_STORES,
  ...SHOPIFY_STORES,
  ...BIGCARTEL_STORES,
];
