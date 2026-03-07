export const stores = [
  {
    slug: "ascensio-vintage",
    dashboardToken: "av-2b7c9d1e4f8a",
    name: "Ascensio Vintage",
    location: "London, UK",
    description:
      "Ascensio's goal is to push away from fast-moving trends and unethically produced fast fashion, championing timeless style that transcends the decades. Our ethos centers on delivering authentic brands while promoting sustainable shopping, celebrating the beauty of pre-loved and archival pieces from the most well-known and loved brands. Each item is thoroughly checked by our team, ensuring quality and authenticity.",
    website: "https://ascensiovintage.com",
    dataSource: "ascensio-vintage",
    image: "/stores/ascensio-vintage.jpg",
    logo: "/stores/ascensio-vintage-logo.jpg",
    logoBg: "#ffffff",
    currency: "USD",
    commissionType: "shopify-collabs" as const,
    affiliatePath: "1234",
    collabsStoreId: "228601",
    authenticityPolicy:
      "Each item is thoroughly checked by our team for quality and authenticity before listing. We specialize in archival pieces from well-known brands, hand-selected with an eye for craftsmanship and condition — every listing is accurate, detailed, and exactly as described.",
    shippingPolicy:
      "Ships from Shropshire, England. Shipping rates and delivery times are calculated at checkout. International customers may be responsible for customs duties and taxes.",
    returnPolicy:
      "All sales are final. As a vintage and pre-loved retailer, items are one-of-a-kind. Please review all item details and photos carefully before purchasing.",
  },
  {
    slug: "lei-vintage",
    dashboardToken: "lv-f4a8b2c1d9e3",
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
    authenticityPolicy:
      "Every piece at LEI is personally curated and inspected before it reaches you. We stand behind the accuracy of each listing — if your item arrives significantly different from its description, reach out within 48 hours of delivery and we'll make it right.",
    shippingPolicy:
      "Shipping rates are calculated at checkout. Orders ship to the address provided at checkout.",
    returnPolicy:
      "All sales are final. If your item arrives significantly damaged or materially different from its description, contact info@shoplei.com within 48 hours of delivery with photos for review.",
    commissionType: "squarespace-manual" as const,
    // No affiliatePath — uses Squarespace pixel for conversion tracking
  },
  {
    slug: "lover-girl-vintage",
    dashboardToken: "lgv-9e3f1a8b2c7d",
    name: "Lover Girl Vintage",
    location: "Newport Beach, CA",
    description:
      "Lover Girl Vintage is a curated collection of vintage and pre-loved fashion, hand-selected with a feminine, romantic eye. Based in Newport Beach, each piece is chosen for its charm, character, and timeless appeal.",
    website: "https://lovergirlvintage.com",
    dataSource: "lover-girl-vintage",
    image: "/stores/lover-girl-vintage.jpg",
    logo: "/stores/lover-girl-vintage.jpg",
    logoBg: "#ffffff",
    currency: "USD",
    commissionType: "shopify-collabs" as const,
    affiliatePath: "VIAPARTNER",
    collabsStoreId: "229026",
    authenticityPolicy:
      "Each piece is hand-selected with careful attention to quality and condition. Any notable wear or flaws are disclosed in individual item descriptions so you always know exactly what you're getting.",
    shippingPolicy:
      "Ships from Newport Beach, CA. Shipping rates are calculated at checkout.",
    returnPolicy:
      "All sales are final — no returns under any circumstances. All vintage items may show signs of wear consistent with age. Any notable wear is disclosed in the item description. Please review carefully before purchasing.",
  },
  {
    slug: "missi-archives",
    dashboardToken: "ma-1c9d4e7f2b8a",
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
    commissionType: "shopify-collabs" as const,
    affiliatePath: "0001",
    collabsStoreId: "228526",
    discountCode: "0001",
    perk: "VIA customers get free shipping — use code 0001 at checkout",
    authenticityPolicy:
      "Every item at Missi Archives is hand-picked and personally inspected before listing. Each piece is described accurately and transparently — if you have any concerns about your order, the team is available directly via email.",
    shippingPolicy:
      "Orders are processed within 2–5 business days. Delivery times vary by destination and chosen shipping service. A confirmation email with tracking details is sent once your order is dispatched.",
    returnPolicy:
      "All sales are final — no returns or refunds. If you experience any issues with your order, email missiarchives@gmail.com and the team will do their best to help.",
  },
  {
    slug: "scarz-vintage",
    dashboardToken: "sv-8a2c4b9d1e7f",
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
    commissionType: "shopify-collabs" as const,
    affiliatePath: "VIAXSCARZ",
    collabsStoreId: "228153",
    discountCode: "VIAXSCARZ",
    perk: "VIA customers get free shipping — use code VIAXSCARZ at checkout",
    authenticityPolicy:
      "All items are hand-selected and personally authenticated by Scarlett, with a focus on rare archival pieces from Chanel, Gucci, Prada, Versace, and other iconic houses. Every listing includes detailed condition notes — if an item doesn't match its description, contact within 7 days of receiving your order.",
    shippingPolicy:
      "Orders are processed within 1–2 business days. UK Standard: £4 (2–4 days). EU International: £15 (2–11 days). Rest of World: £30 (3–17 days). Free shipping on orders over £500. International customers are responsible for customs duties and taxes.",
    returnPolicy:
      "All sales are final. Refunds or exchanges are only issued if the wrong item was sent or if there is a significant discrepancy from the product description. Contact contact@scarzvintage.com within 7 days of receiving your order.",
  },
  {
    slug: "house-on-a-chain",
    dashboardToken: "hoac-2f7e1b9d4c3a",
    name: "House on a Chain",
    location: "London, UK",
    description:
      "House on a Chain is a London-based curated vintage store specialising in rare archival designer and elevated wardrobe pieces. The curation centres on 90s and early 2000s luxury — from Galliano-era Dior and Prada to Chanel and La Perla — chosen for craftsmanship, femininity and elevation.",
    website: "https://www.houseonachain.com",
    dataSource: "house-on-a-chain",
    image: "/stores/house-on-a-chain.jpg",
    logo: "/stores/placeholder.svg",
    logoBg: "#ffffff",
    currency: "USD",
    commissionType: "shopify-collabs" as const,
    affiliatePath: "VIA-7",
    collabsStoreId: "230455",
    authenticityPolicy:
      "Every piece at House on a Chain is personally sourced and curated for authenticity and quality. Specialising in rare archival designer pieces from the 90s and early 2000s, each item is carefully selected and accurately described before listing.",
    shippingPolicy:
      "Orders ship from London, UK. Shipping rates and delivery times are calculated at checkout. International customers may be responsible for customs duties and taxes.",
    returnPolicy:
      "All sales are final. Please review all item details and photos carefully before purchasing.",
  },
  {
    slug: "source-twenty-four",
    dashboardToken: "s24-7d1f8c4a2b9e",
    name: "Source Twenty Four",
    location: "New Jersey",
    description:
      "Source Twenty Four is a curated collection of pre-owned luxury handbags, wallets, and accessories from iconic designer houses. Each piece is authenticated and hand-selected, offering timeless style from brands like Chanel, Celine, Dior, and Bottega Veneta.",
    website: "https://sourcetwentyfour.com",
    dataSource: "source-twenty-four",
    image: "/stores/source-twenty-four.jpg",
    logo: "/stores/placeholder.svg",
    logoBg: "#ffffff",
    currency: "USD",
    commissionType: "shopify-collabs" as const,
    affiliatePath: "VIAPLATFORM",
    collabsStoreId: "229322",
    authenticityPolicy:
      "Every piece at Source Twenty Four is authenticated and hand-selected before listing. Specializing in pre-owned luxury from Chanel, Celine, Dior, and Bottega Veneta, each item undergoes careful inspection to verify quality and authenticity prior to sale.",
    shippingPolicy:
      "Free shipping on all items. Orders ship from the United States.",
    returnPolicy:
      "All sales are final. Please review all item details and photos carefully before purchasing.",
  },
  {
    slug: "vintage-archives-la",
    dashboardToken: "vala-4b8e1c9a7d2f",
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
    commissionType: "shopify-collabs" as const,
    affiliatePath: "VIAPARTNER", // Shopify Collabs affiliate handle
    collabsStoreId: "227548",
    authenticityPolicy:
      "Every item is personally sourced and inspected before listing. As specialists in vintage designer shoes and accessories, each piece is accurately described with any notable condition details clearly disclosed — you'll always know exactly what you're receiving.",
    shippingPolicy:
      "Orders are processed within 3–7 business days. Delivery takes an additional 3–7 business days depending on location. Shipping rates are calculated at checkout based on destination and package weight. US shipping only.",
    returnPolicy:
      "All sales are final — no refunds, exchanges, or returns. Please review all item details carefully before purchasing.",
  },
  {
    slug: "the-objects-of-affection",
    dashboardToken: "tooa-2f9a4c8b1e7d",
    name: "The Objects of Affection",
    location: "New Hope, Pennsylvania",
    description:
      "Founded by Mackenzie, The Objects of Affection is a curated vintage and archival fashion house specializing in luxury handbags, clothing, shoes, and accessories from the designers and houses that defined eras. With an archival mindset and an editorial eye, each piece is sourced not for trend but for reverence — hand-selected for craftsmanship, condition, rarity, and the emotional pull a truly remarkable piece gives.",
    website: "https://theobjectsofaffection.com",
    dataSource: "the-objects-of-affection",
    image: "/stores/the-objects-of-affection.jpg",
    logo: "/stores/placeholder.svg",
    logoBg: "#ffffff",
    currency: "USD",
    commissionType: "shopify-collabs" as const,
    affiliatePath: "001",
    collabsStoreId: "5662739",
    authenticityPolicy:
      "Every item is authenticated and transparently presented before being listed. Founded with an archival and editorial eye, each piece is individually assessed for craftsmanship, condition, and rarity — what you see is exactly what you'll receive.",
    shippingPolicy:
      "Ships from New Hope, Pennsylvania. Shipping rates are calculated at checkout.",
    returnPolicy:
      "All sales are final. Every item is authenticated and transparently presented. Please review all item details and photos carefully before purchasing.",
  },
  {
    slug: "vangie",
    dashboardToken: "vng-3a8c1d5e9b4f",
    name: "Vangie",
    location: "Philadelphia, PA",
    description:
      "Vangie is a Philadelphia-based vintage studio curating collectible, investment-worthy fashion — bold statement pieces and art-to-wear with real design integrity. Founded by Evan Noll after more than a decade in tech, Vangie is rooted in craftsmanship, sustainability, and personal storytelling. Named for Evan's grandmother (short for Evangeline), the studio honors a legacy of fearless self-expression — clothing as confidence and personality. Explore clothing, jewelry, and accessories ranging from the 1950s to Y2K.",
    website: "https://vangie.co",
    dataSource: "vangie",
    image: "/stores/vangie.jpg",
    logo: "/stores/vangie-logo.jpg",
    logoBg: "#ffffff",
    currency: "USD",
    commissionType: "shopify-collabs" as const,
    affiliatePath: "1",
    collabsStoreId: "230072",
    authenticityPolicy:
      "Every piece at Vangie is personally sourced and authenticated by Evan before listing. Specializing in collectible and investment-worthy vintage, each item is hand-selected for craftsmanship, condition, and design integrity — bold statement pieces chosen to be treasured for a lifetime.",
    shippingPolicy:
      "Ships from Philadelphia, PA. Shipping rates are calculated at checkout.",
    returnPolicy:
      "All sales are final. Please review all item details and photos carefully before purchasing.",
  },
  {
    slug: "sourced-by-scottie",
    dashboardToken: "sbs-3e7a1c5d9f2b",
    name: "Sourced by Scottie",
    location: "Washington, DC",
    description:
      "Sourced by Scottie is a Washington, DC-based vintage and secondhand shop specializing in hand-picked designer and statement pieces. Each item is personally sourced and selected for quality, character, and style — bringing standout vintage finds to modern wardrobes.",
    website: "https://sourcedbyscottie.com",
    dataSource: "sourced-by-scottie",
    image: "/stores/sourced-by-scottie.jpg",
    logo: "/stores/placeholder.svg",
    logoBg: "#ffffff",
    currency: "USD",
    commissionType: "shopify-collabs" as const,
    affiliatePath: "VIACONNECT",
    collabsStoreId: "230428",
    authenticityPolicy:
      "Every piece is personally sourced and inspected before listing. Each item is accurately described with any notable condition details clearly disclosed.",
    shippingPolicy:
      "Ships from Washington, DC. Shipping rates are calculated at checkout.",
    returnPolicy:
      "All sales are final. Please review all item details and photos carefully before purchasing.",
  },
  {
    slug: "to-us-vintage",
    dashboardToken: "tuv-5d2a8c1e9b7f",
    name: "To Us Vintage",
    location: "New York, NY",
    description:
      "To Us Vintage is a vintage boutique specializing in timeless designer and statement pieces. From iconic Thierry Mugler tailored blazers to rare Dolce & Gabbana Y2K mini dresses and elevated accessories, each item is hand-selected for quality, character, and individuality. To Us Vintage celebrates fashion with history, bringing standout pieces from the past into modern wardrobes spearheaded by founder and head curator, Kathleen Scarrone.",
    website: "https://tousvintage.com",
    dataSource: "to-us-vintage",
    image: "/stores/to-us-vintage.jpg",
    logo: "/stores/placeholder.svg",
    logoBg: "#ffffff",
    currency: "USD",
    commissionType: "shopify-collabs" as const,
    affiliatePath: "HANA",
    collabsStoreId: "228807",
    authenticityPolicy:
      "Every piece at To Us Vintage is hand-selected and personally inspected by Kathleen before listing. Specializing in timeless designer and statement pieces, each item is accurately described with any notable condition details clearly disclosed.",
    shippingPolicy:
      "Ships from New York, NY. Shipping rates are calculated at checkout.",
    returnPolicy:
      "All sales are final. Please review all item details and photos carefully before purchasing.",
  },
  {
    slug: "moonstruck-vintage",
    dashboardToken: "mv-7e2a9c4b1d8f",
    name: "Moonstruck Vintage",
    location: "New York, NY",
    description:
      "Moonstruck Vintage is dedicated to curating unique accessories for everyone. We aim to promote sustainability and give pieces a second life. Every piece tells a story, and adding to it is so special. We focus on bags, but also love a good pair of shoes. Each piece is handpicked with care, authenticity, and style in mind so you can enjoy the thrill of discovering treasure, too!",
    website: "https://moonstruckvintagenyc.com",
    dataSource: "moonstruck-vintage",
    image: "/stores/placeholder.svg",
    logo: "/stores/placeholder.svg",
    logoBg: "#ffffff",
    currency: "USD",
    commissionType: "shopify-collabs" as const,
    affiliatePath: "VIA",
    collabsStoreId: "230452",
    authenticityPolicy:
      "Every piece at Moonstruck Vintage is handpicked with care, authenticity, and style in mind. Specializing in bags and shoes, each item is personally selected and accurately described before listing.",
    shippingPolicy:
      "Ships from New York, NY. Shipping rates are calculated at checkout.",
    returnPolicy:
      "All sales are final. Please review all item details and photos carefully before purchasing.",
  },
  {
    slug: "maison-optimism-vintage",
    dashboardToken: "mo-6b3d9f1c8e2a",
    name: "Maison Optimism Vintage",
    location: "Houston, TX",
    description:
      "Maison Optimism Vintage is a Houston-based luxury vintage brand specializing in 90s and early 2000s designer bags, shoes, and accessories. Each piece is hand-picked and curated for an iconic, timeless style.",
    website: "https://www.maisonoptimismvintage.com",
    dataSource: "maison-optimism-vintage",
    image: "/stores/maison-optimism.jpg",
    logo: "/stores/placeholder.svg",
    logoBg: "#ffffff",
    currency: "USD",
    commissionType: "shopify-collabs" as const,
    affiliatePath: "VIA2026",
    collabsStoreId: "230654",
    authenticityPolicy:
      "Every piece at Maison Optimism Vintage is hand-picked and personally curated before listing. Specializing in 90s and early 2000s luxury designer bags, shoes, and accessories, each item is selected for its iconic style and accurately described with any notable condition details disclosed.",
    shippingPolicy:
      "Ships from Houston, TX. Shipping rates are calculated at checkout.",
    returnPolicy:
      "All sales are final. Please review all item details and photos carefully before purchasing.",
  },
  {
    slug: "vintari-vault",
    dashboardToken: "vv-9c1e7a4d2f8b",
    name: "Vintari Vault",
    location: "Dallas, Texas",
    description:
      "Vintari Vault is a Dallas-based seller of vintage designer handbags founded by two best friends, one with a deep love for designer handbags and the other with a passion for vintage fashion history. What began as sourcing pieces for personal collections grew into a mission to provide a curated selection of authentic, timeless designer bags that celebrate the history of vintage fashion while bringing it to the everyday wardrobe. Operating primarily online with select Dallas pop-ups, their mission is to make timeless luxury accessible and inclusive — unlocking vintage one bag at a time.",
    website: "https://vintarivault.com",
    dataSource: "vintari-vault",
    image: "/stores/vintari-vault.png",
    logo: "/stores/placeholder.svg",
    logoBg: "#ffffff",
    currency: "USD",
    commissionType: "shopify-collabs" as const,
    affiliatePath: "VIA",
    collabsStoreId: "5668014",
    authenticityPolicy:
      "Every bag is personally authenticated and inspected by the founders before listing. As dedicated specialists in vintage designer handbags, each item is accurately described with full condition details, so you can shop with complete confidence.",
    shippingPolicy:
      "Ships from Dallas, Texas. Shipping rates are calculated at checkout.",
    returnPolicy:
      "All sales are final. Each item is authenticated and carefully described. Please review all item details and photos before purchasing.",
  },
  {
    slug: "blodas-choice",
    dashboardToken: "bc-3d7a1e9f4c2b",
    name: "Bloda's Choice",
    location: "New York, NY",
    description:
      "Anna Bloda — NYC-based photographer, model, and vintage collector. Born in Poland in 1975, she studied art and photography and discovered her love for fashion while styling her models. Moving to New York City opened a new chapter: the world of vintage became her playground. Her curated finds became Bloda's Choice, a Chinatown boutique celebrating quality, color therapy, and self-expression. With a Y3K lens and an eye for the unusual, Anna transforms timeless pieces into art, making her a legend in fashion and photography.",
    website: "https://blodaschoice.com",
    dataSource: "blodas-choice",
    image: "/stores/blodas-choice.jpg",
    logo: "/stores/blodas-choice.jpg",
    logoBg: "#ffffff",
    currency: "USD",
    commissionType: "shopify-collabs" as const,
    affiliatePath: "VIA",
    collabsStoreId: "230978",
    authenticityPolicy:
      "Every piece at Bloda's Choice is personally sourced and selected by Anna. Each item is chosen for its character, quality, and story — accurately described so you always know exactly what you're getting.",
    shippingPolicy:
      "Ships from New York, NY. Shipping rates are calculated at checkout.",
    returnPolicy:
      "All sales are final. Please review all item details and photos carefully before purchasing.",
  },
];

/**
 * Commission tiers (% of sale price that VIA earns).
 * Applies to all stores regardless of payout method.
 */
export const COMMISSION_TIERS = [
  { maxPrice: 1000, rate: 0.07 },   // Under $1k → 7%
  { maxPrice: 5000, rate: 0.05 },   // $1k–$5k  → 5%
  { maxPrice: Infinity, rate: 0.03 }, // $5k+     → 3%
] as const;

/** Returns the commission rate (0–1) for a given sale price. */
export function getCommissionRate(price: number): number {
  return COMMISSION_TIERS.find((t) => price < t.maxPrice)?.rate ?? 0.03;
}

/** Returns the commission dollar amount VIA earns on a sale. */
export function getCommissionAmount(price: number): number {
  return price * getCommissionRate(price);
}

/**
 * Store contact emails for sourcing request notifications.
 * Fill in each store's email address — leave blank to skip that store.
 */
export const storeContactEmails: Record<string, string> = {
  "ascensio-vintage": "info@ascensiovintage.com",
  "lei-vintage": "shop@leivintage.com",
  "lover-girl-vintage": "lexi.heuser@gmail.com",
  "missi-archives": "missiarchives@gmail.com",
  "scarz-vintage": "contact@scarzvintage.com",
  "house-on-a-chain": "houseonachain@gmail.com",
  "source-twenty-four": "sourcetwentyfour@gmail.com",
  "vintage-archives-la": "vintagearchivesla@gmail.com",
  "the-objects-of-affection": "mackenzie@theobjectsofaffection.com",
  "vangie": "evan@vangie.co",
  "sourced-by-scottie": "emma@scottiestudios.com",
  "to-us-vintage": "KScarrone@gmail.com",
  "moonstruck-vintage": "moonstruckvintagenyc@gmail.com",
  "maison-optimism-vintage": "maisonoptimism@gmail.com",
  "vintari-vault": "admin@vintarivault.com",
  "blodas-choice": "annabloda@gmail.com",
  // Styelled — not yet on the site but included in sourcing notifications
  "styelled": "Amandasweetwood@gmail.com",
};

/** Returns all non-empty store contact emails */
export function getAllStoreEmails(): string[] {
  return Object.values(storeContactEmails).filter(Boolean);
}

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
  return Math.ceil(price * rate);
}
