import { neon } from "@neondatabase/serverless";
import { inferBrandFromTitle, normalizeCategory } from "./market-data-db";

// Brand Heat Index — a cross-store brand-momentum ranking (the Lyst-Index / StockX
// Current-Culture-Index model). Aggregates VYA's demand signals across ALL stores
// for a period, compares to the prior period, and ranks brands by "heat" with
// momentum and rank movement. This is the headline, monetizable data product:
// publishable as PR/lead-gen and licensable as a feed. All inputs are first-party.

function db() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("No database URL");
 return neon(url);
}

// Signal weights — purchases/sales and favorites are stronger intent than a view.
const W = { view: 1, favorite: 3, search: 2, sold: 5 };

// Don't report a momentum % off a tiny prior-period base — it produces misleading
// swings (e.g. +5600% from a base of 1). Below this, the brand is flagged "new"
// (isBreakout) instead of given a percentage.
const MIN_PRIOR_HEAT_FOR_MOMENTUM = 25;

export type BrandHeat = {
 brand: string;
 rank: number;
 rankPrev: number | null;
 rankDelta: number | null; // + = climbing
 heat: number; // weighted demand score, current period
 momentumPct: number | null; // % change vs prior period (null if prior base too small)
 isBreakout: boolean; // little/no prior signal — rising from a small base
 views: number;
 favorites: number;
 searches: number;
 sold: number;
 gmv: number; // USD GMV of sold items this period
};

export type BrandHeatIndex = {
 generatedAt: string;
 periodDays: number;
 brands: BrandHeat[];
};

type Acc = { vC: number; vP: number; fC: number; fP: number; sC: number; sP: number; soldC: number; soldP: number; gmv: number };

export async function getBrandHeatIndex(periodDays = 30, limit = 50): Promise<BrandHeatIndex> {
 const sql = db();
 const cur = `${periodDays} days`;
 const prior = `${periodDays * 2} days`;

 const acc = new Map<string, Acc>();
 const get = (brand: string): Acc => {
 let a = acc.get(brand);
 if (!a) { a = { vC: 0, vP: 0, fC: 0, fP: 0, sC: 0, sP: 0, soldC: 0, soldP: 0, gmv: 0 }; acc.set(brand, a); }
 return a;
 };

 // 1. Views + favorites per product, split current vs prior period.
 const eng = (await sql`
 SELECT p.title,
  COALESCE(vc.c,0)::int AS v_cur, COALESCE(vp.c,0)::int AS v_prior,
  COALESCE(fc.c,0)::int AS f_cur, COALESCE(fp.c,0)::int AS f_prior
 FROM products p
 LEFT JOIN (SELECT product_id, COUNT(*) c FROM product_views WHERE timestamp >= NOW() - ${cur}::interval GROUP BY product_id) vc
  ON vc.product_id = (p.store_slug || '-' || p.id::text)
 LEFT JOIN (SELECT product_id, COUNT(*) c FROM product_views WHERE timestamp >= NOW() - ${prior}::interval AND timestamp < NOW() - ${cur}::interval GROUP BY product_id) vp
  ON vp.product_id = (p.store_slug || '-' || p.id::text)
 LEFT JOIN (SELECT product_id, COUNT(*) c FROM product_favorites WHERE created_at >= NOW() - ${cur}::interval GROUP BY product_id) fc
  ON fc.product_id = p.id
 LEFT JOIN (SELECT product_id, COUNT(*) c FROM product_favorites WHERE created_at >= NOW() - ${prior}::interval AND created_at < NOW() - ${cur}::interval GROUP BY product_id) fp
  ON fp.product_id = p.id
 WHERE COALESCE(vc.c,0)+COALESCE(vp.c,0)+COALESCE(fc.c,0)+COALESCE(fp.c,0) > 0
 `) as Array<{ title: string; v_cur: number; v_prior: number; f_cur: number; f_prior: number }>;
 for (const r of eng) {
 const b = inferBrandFromTitle(r.title);
 if (!b) continue;
 const a = get(b);
 a.vC += r.v_cur; a.vP += r.v_prior; a.fC += r.f_cur; a.fP += r.f_prior;
 }

 // 2. Search intent per query → brand, current vs prior.
 const searches = (await sql`
 SELECT lower(query) AS q,
  COUNT(*) FILTER (WHERE timestamp >= NOW() - ${cur}::interval)::int AS cur,
  COUNT(*) FILTER (WHERE timestamp >= NOW() - ${prior}::interval AND timestamp < NOW() - ${cur}::interval)::int AS prior
 FROM searches WHERE timestamp >= NOW() - ${prior}::interval AND length(query) >= 2
 GROUP BY lower(query)
 `) as Array<{ q: string; cur: number; prior: number }>;
 for (const r of searches) {
 const b = inferBrandFromTitle(r.q);
 if (!b) continue;
 const a = get(b);
 a.sC += r.cur; a.sP += r.prior;
 }

 // 3. Sold items per brand, current vs prior (designer column, else infer from title).
 const sold = (await sql`
 SELECT designer, title, final_price, currency, sold_at
 FROM sold_items WHERE sold_at >= NOW() - ${prior}::interval
 `) as Array<{ designer: string | null; title: string; final_price: number; currency: string; sold_at: string | Date }>;
 const now = Date.now();
 const curMs = periodDays * 86_400_000;
 for (const r of sold) {
 const b = (r.designer && r.designer.trim()) ? r.designer.trim() : inferBrandFromTitle(r.title);
 if (!b) continue;
 const a = get(b);
 const soldMs = new Date(r.sold_at).getTime();
 const isCurrent = now - soldMs <= curMs;
 if (isCurrent) { a.soldC += 1; a.gmv += Number(r.final_price) || 0; }
 else a.soldP += 1;
 }

 // Score + momentum.
 const scored = Array.from(acc.entries()).map(([brand, a]) => {
 const heat = a.vC * W.view + a.fC * W.favorite + a.sC * W.search + a.soldC * W.sold;
 const heatPrior = a.vP * W.view + a.fP * W.favorite + a.sP * W.search + a.soldP * W.sold;
 const hasPrior = heatPrior >= MIN_PRIOR_HEAT_FOR_MOMENTUM;
 const momentumPct = hasPrior ? Math.round(((heat - heatPrior) / heatPrior) * 100) : null;
 return {
  brand, heat, heatPrior, momentumPct, isBreakout: !hasPrior && heat > heatPrior,
  views: a.vC, favorites: a.fC, searches: a.sC, sold: a.soldC, gmv: Math.round(a.gmv),
 };
 }).filter((b) => b.heat > 0);

 // Current and prior ranks (prior rank by heatPrior).
 const byCur = [...scored].sort((x, y) => y.heat - x.heat);
 const priorOrder = [...scored].filter((b) => b.heatPrior > 0).sort((x, y) => y.heatPrior - x.heatPrior);
 const priorRank = new Map(priorOrder.map((b, i) => [b.brand, i + 1]));

 const brands: BrandHeat[] = byCur.slice(0, limit).map((b, i) => {
 const rank = i + 1;
 const rankPrev = priorRank.get(b.brand) ?? null;
 return {
  brand: b.brand,
  rank,
  rankPrev,
  rankDelta: rankPrev != null ? rankPrev - rank : null,
  heat: b.heat,
  momentumPct: b.momentumPct,
  isBreakout: b.isBreakout,
  views: b.views,
  favorites: b.favorites,
  searches: b.searches,
  sold: b.sold,
  gmv: b.gmv,
 };
 });

 return { generatedAt: new Date().toISOString(), periodDays, brands };
}

// ── Category & Store heat — same momentum model, grouped differently ──
export type GroupHeat = {
 key: string;
 rank: number;
 rankPrev: number | null;
 rankDelta: number | null;
 heat: number;
 momentumPct: number | null;
 isBreakout: boolean;
 views: number;
 favorites: number;
 sold: number;
 gmv: number;
};

type G = { vC: number; vP: number; fC: number; fP: number; soldC: number; soldP: number; gmv: number };

// Engagement (views + favorites) per group, current vs prior period. `grouper`
// turns a product row into its group key (category label or store slug).
function rankGroups(map: Map<string, G>, limit: number): GroupHeat[] {
 const scored = Array.from(map.entries()).map(([key, a]) => {
 const heat = a.vC * W.view + a.fC * W.favorite + a.soldC * W.sold;
 const heatPrior = a.vP * W.view + a.fP * W.favorite + a.soldP * W.sold;
 const hasPrior = heatPrior >= MIN_PRIOR_HEAT_FOR_MOMENTUM;
 return {
  key, heat, heatPrior, hasPrior,
  momentumPct: hasPrior ? Math.round(((heat - heatPrior) / heatPrior) * 100) : null,
  isBreakout: !hasPrior && heat > heatPrior,
  views: a.vC, favorites: a.fC, sold: a.soldC, gmv: Math.round(a.gmv),
 };
 }).filter((x) => x.heat > 0);
 const byCur = [...scored].sort((x, y) => y.heat - x.heat);
 const priorRank = new Map([...scored].filter((x) => x.heatPrior > 0).sort((x, y) => y.heatPrior - x.heatPrior).map((x, i) => [x.key, i + 1]));
 return byCur.slice(0, limit).map((x, i) => {
 const rank = i + 1;
 const rankPrev = priorRank.get(x.key) ?? null;
 return { key: x.key, rank, rankPrev, rankDelta: rankPrev != null ? rankPrev - rank : null, heat: x.heat, momentumPct: x.momentumPct, isBreakout: x.isBreakout, views: x.views, favorites: x.favorites, sold: x.sold, gmv: x.gmv };
 });
}

// Per-product engagement (views+favorites) split current/prior, with the group key.
// `field`: 'category' → product_type→normalizeCategory; 'store' → store_slug.
async function groupEngagement(periodDays: number, field: "category" | "store"): Promise<Map<string, G>> {
 const sql = db();
 const cur = `${periodDays} days`;
 const prior = `${periodDays * 2} days`;
 const rows = (await sql`
 SELECT p.store_slug, p.product_type,
  COALESCE(vc.c,0)::int AS v_cur, COALESCE(vp.c,0)::int AS v_prior,
  COALESCE(fc.c,0)::int AS f_cur, COALESCE(fp.c,0)::int AS f_prior
 FROM products p
 LEFT JOIN (SELECT product_id, COUNT(*) c FROM product_views WHERE timestamp >= NOW() - ${cur}::interval GROUP BY product_id) vc ON vc.product_id = (p.store_slug || '-' || p.id::text)
 LEFT JOIN (SELECT product_id, COUNT(*) c FROM product_views WHERE timestamp >= NOW() - ${prior}::interval AND timestamp < NOW() - ${cur}::interval GROUP BY product_id) vp ON vp.product_id = (p.store_slug || '-' || p.id::text)
 LEFT JOIN (SELECT product_id, COUNT(*) c FROM product_favorites WHERE created_at >= NOW() - ${cur}::interval GROUP BY product_id) fc ON fc.product_id = p.id
 LEFT JOIN (SELECT product_id, COUNT(*) c FROM product_favorites WHERE created_at >= NOW() - ${prior}::interval AND created_at < NOW() - ${cur}::interval GROUP BY product_id) fp ON fp.product_id = p.id
 WHERE COALESCE(vc.c,0)+COALESCE(vp.c,0)+COALESCE(fc.c,0)+COALESCE(fp.c,0) > 0
 `) as Array<{ store_slug: string; product_type: string | null; v_cur: number; v_prior: number; f_cur: number; f_prior: number }>;
 const map = new Map<string, G>();
 const get = (k: string): G => { let g = map.get(k); if (!g) { g = { vC: 0, vP: 0, fC: 0, fP: 0, soldC: 0, soldP: 0, gmv: 0 }; map.set(k, g); } return g; };
 for (const r of rows) {
 const key = field === "store" ? r.store_slug : (r.product_type ? normalizeCategory(r.product_type) : null);
 if (!key) continue;
 const g = get(key);
 g.vC += r.v_cur; g.vP += r.v_prior; g.fC += r.f_cur; g.fP += r.f_prior;
 }
 return map;
}

export async function getCategoryHeat(periodDays = 30, limit = 20): Promise<GroupHeat[]> {
 return rankGroups(await groupEngagement(periodDays, "category"), limit);
}

export async function getStoreHeat(periodDays = 30, limit = 25): Promise<GroupHeat[]> {
 const map = await groupEngagement(periodDays, "store");
 // Stores also get sold-velocity, which sold_items carries directly by store_slug.
 const sql = db();
 const sold = (await sql`
 SELECT store_slug, final_price, sold_at FROM sold_items WHERE sold_at >= NOW() - ${`${periodDays * 2} days`}::interval
 `) as Array<{ store_slug: string; final_price: number; sold_at: string | Date }>;
 const now = Date.now();
 const curMs = periodDays * 86_400_000;
 for (const r of sold) {
 const g = map.get(r.store_slug);
 if (!g) continue;
 if (now - new Date(r.sold_at).getTime() <= curMs) { g.soldC += 1; g.gmv += Number(r.final_price) || 0; }
 else g.soldP += 1;
 }
 return rankGroups(map, limit);
}
