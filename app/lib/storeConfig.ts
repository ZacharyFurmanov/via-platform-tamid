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
  /** Product titles to exclude from sync (exact match, case-insensitive) */
  excludeTitles?: string[];
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
  {
    type: "squarespace",
    name: "Montrose Edit",
    slug: "montrose-edit",
    shopUrl: "https://www.montroseedit.com/shop",
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
    name: "Club Fleur Vintage",
    slug: "club-fleur",
    storeDomain: "clubfleurvintage.com",
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
    storeDomain: "pgkjey-wq.myshopify.com",
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
  {
    type: "shopify",
    name: "Moonstruck Vintage",
    slug: "moonstruck-vintage",
    storeDomain: "moonstruckvintagenyc.com",
  },
  {
    type: "shopify",
    name: "Bloda's Choice",
    slug: "blodas-choice",
    storeDomain: "blodaschoice.com",
  },
  {
    type: "shopify",
    name: "Rareality Archive",
    slug: "rareality-archive",
    storeDomain: "rarealityarchive.com",
  },
  {
    type: "shopify",
    name: "Sheer Vintage",
    slug: "sheer-vintage",
    storeDomain: "shopsheervintage.com",
  },
  {
    type: "shopify",
    name: "Petria Vintage",
    slug: "petria-vintage",
    storeDomain: "petriavintage.com",
  },
  {
    type: "shopify",
    name: "Promised Vintage",
    slug: "promised-vintage",
    storeDomain: "promisedvintage.com",
  },
  {
    type: "shopify",
    name: "The VNTG Collective",
    slug: "the-vntg-collective",
    storeDomain: "thevntgcollective.com",
  },
  {
    type: "shopify",
    name: "Dayton Jane",
    slug: "dayton-jane",
    storeDomain: "www.daytonjane.com",
  },
  {
    type: "shopify",
    name: "Front Page Finds",
    slug: "front-page-finds",
    storeDomain: "frontpagefinds.com",
  },
  {
    type: "shopify",
    name: "Vintage Girlfriend",
    slug: "vintage-girlfriend",
    storeDomain: "vintage-girlfriend.com",
  },
  {
    type: "shopify",
    name: "Porter's Preloved",
    slug: "porters-preloved",
    storeDomain: "porterspreloved.com",
  },
  {
    type: "shopify",
    name: "For The Globe",
    slug: "for-the-globe",
    storeDomain: "shopfortheglobe.com",
  },
];

// Big Cartel stores (public JSON API — no token required)
export const BIGCARTEL_STORES: BigCartelStore[] = [];

export const ALL_STORES: Store[] = [
  ...SQUARESPACE_STORES,
  ...SHOPIFY_STORES,
  ...BIGCARTEL_STORES,
];
