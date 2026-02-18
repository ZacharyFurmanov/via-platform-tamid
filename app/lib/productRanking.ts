import { brands } from "./brandData";

/**
 * Compute a composite ranking score for a product.
 *
 * Mirrors how major resale platforms (The RealReal, Vestiaire Collective, SSENSE)
 * surface the best products first — blending engagement signals with product
 * quality indicators so that even products with zero clicks still sort
 * meaningfully.
 *
 * Score components:
 *   1. Engagement  — clicks, favorites, conversions (from analytics DB)
 *   2. Recency     — newer inventory gets a decay-based boost
 *   3. Image count — more images = higher-quality listing
 *   4. Brand       — recognized luxury/designer brands get a boost
 *   5. Price sweet spot — mid-range items convert better in resale
 */

// Tier 1 luxury brands get the highest boost
const TIER1_BRANDS = new Set([
  "chanel", "hermes", "louis-vuitton", "dior", "prada",
  "bottega-veneta", "celine", "saint-laurent",
]);

// Tier 2 designer brands get a moderate boost
const TIER2_BRANDS = new Set([
  "gucci", "fendi", "balenciaga", "valentino", "givenchy",
  "loewe", "miu-miu", "burberry", "versace",
]);

// Tier 3 known brands get a small boost
const TIER3_BRANDS = new Set(
  brands.map((b) => b.slug).filter((s) => !TIER1_BRANDS.has(s) && !TIER2_BRANDS.has(s))
);

export type RankingInput = {
  engagementScore: number;   // from getProductPopularityScores()
  syncedAt: Date | string;   // product.synced_at from DB
  imageCount: number;        // number of images
  brandSlug: string | null;  // inferred brand slug
  price: number;             // numeric price
};

export function computeProductScore(input: RankingInput): number {
  let score = 0;

  // ── 1. Engagement (0–∞, typically 0–100) ──
  // This is the strongest signal when available. Amplify it so engaged
  // products clearly surface, but cap contribution so quality signals
  // still matter for zero-engagement products.
  score += input.engagementScore * 10;

  // ── 2. Recency boost (0–40) ──
  // Exponential decay: full 40 pts for items synced today,
  // ~20 pts at 14 days, ~10 pts at 30 days, ~0 at 90+ days.
  const msAge = Date.now() - new Date(input.syncedAt).getTime();
  const daysOld = msAge / (1000 * 60 * 60 * 24);
  const recencyScore = 40 * Math.exp(-daysOld / 20);
  score += Math.max(0, recencyScore);

  // ── 3. Image quality (0–15) ──
  // 1 image = 0, 2 = 5, 3 = 10, 4+ = 15
  if (input.imageCount >= 4) score += 15;
  else if (input.imageCount >= 3) score += 10;
  else if (input.imageCount >= 2) score += 5;

  // ── 4. Brand recognition (0–25) ──
  if (input.brandSlug) {
    if (TIER1_BRANDS.has(input.brandSlug)) score += 25;
    else if (TIER2_BRANDS.has(input.brandSlug)) score += 18;
    else if (TIER3_BRANDS.has(input.brandSlug)) score += 10;
  }

  // ── 5. Price sweet spot (0–10) ──
  // In vintage/resale, $75–$500 is the conversion sweet spot.
  // Very cheap (<$30) may signal damage; very expensive (>$1000) has
  // lower conversion rates.
  if (input.price >= 75 && input.price <= 500) {
    score += 10;
  } else if (input.price >= 40 && input.price < 75) {
    score += 6;
  } else if (input.price > 500 && input.price <= 1000) {
    score += 6;
  } else if (input.price >= 30 && input.price < 40) {
    score += 3;
  } else if (input.price > 1000) {
    score += 3;
  }

  return Math.round(score * 100) / 100;
}
