import { neon } from "@neondatabase/serverless";
import { priceToCents } from "./comps";

// External market signal for the Trends tab, PERSISTED in Postgres:
//   • a daily cron CAPTURES from SerpApi (Google Search interest + eBay sold listings) → snapshots
//   • the Trends route READS the latest snapshots (no live API call on page view, full history)
// Gated behind the same key + enable flag as comps (SERPAPI_ENABLED) — fully dormant, no spend,
// until on. Momentum comes from comparing snapshots over time, so it's all in the database.

const SERPAPI_URL = "https://serpapi.com/search.json";

export function isMarketTrendsConfigured(): boolean {
 return Boolean(process.env.SERPAPI_API_KEY) && process.env.SERPAPI_ENABLED === "true";
}

/* eslint-disable @typescript-eslint/no-explicit-any */
async function serp(params: Record<string, string>): Promise<any | null> {
 const apiKey = process.env.SERPAPI_API_KEY;
 if (!apiKey) return null;
 const url = new URL(SERPAPI_URL);
 url.searchParams.set("api_key", apiKey);
 for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
 try {
 const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
 if (!res.ok) return null;
 return await res.json();
 } catch { return null; }
}

function tdb() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("DATABASE_URL not set");
 return neon(url);
}
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export type BrandSearchTrend = { brand: string; momentumPct: number | null; avgInterest: number; breakout: boolean };
export type ResaleMarket = { brand: string; soldCount: number; medianPriceCents: number | null; volMomentumPct: number | null; priceMomentumPct: number | null };

let _ready = false;
async function ensureTables(sql: ReturnType<typeof tdb>) {
 if (_ready) return;
 await sql`CREATE TABLE IF NOT EXISTS google_search_snapshots (id BIGSERIAL PRIMARY KEY, brand TEXT NOT NULL, momentum_pct INT, avg_interest INT, breakout BOOLEAN, captured_at TIMESTAMPTZ NOT NULL DEFAULT now())`.catch(() => {});
 await sql`CREATE INDEX IF NOT EXISTS idx_gss_brand_ts ON google_search_snapshots (lower(brand), captured_at DESC)`.catch(() => {});
 await sql`CREATE TABLE IF NOT EXISTS resale_market_snapshots (id BIGSERIAL PRIMARY KEY, brand TEXT NOT NULL, sold_count INT NOT NULL, median_price_cents INT, captured_at TIMESTAMPTZ NOT NULL DEFAULT now())`.catch(() => {});
 await sql`CREATE INDEX IF NOT EXISTS idx_resale_snap_brand_ts ON resale_market_snapshots (lower(brand), captured_at DESC)`.catch(() => {});
 _ready = true;
}

// ── CAPTURE: SerpApi → DB (called by the daily cron) ──

// One SerpApi google_trends TIMESERIES call covers up to 5 queries; momentum = last ~quarter of the
// 3-month series vs the prior quarter; breakout = a big recent surge.
async function fetchGoogleBatch(brands: string[]): Promise<BrandSearchTrend[]> {
 const j = await serp({ engine: "google_trends", q: brands.join(","), data_type: "TIMESERIES", date: "today 3-m", hl: "en", geo: "US" });
 const timeline: any[] = j?.interest_over_time?.timeline_data ?? [];
 return brands.map((brand, idx) => {
 const series = timeline.map((t) => {
 const vals: any[] = t.values || [];
 const v = vals.find((x) => String(x.query || "").toLowerCase() === brand.toLowerCase()) ?? vals[idx];
 return Number(v?.extracted_value ?? v?.value ?? 0);
 }).filter((n) => Number.isFinite(n));
 if (series.length < 4) return { brand, momentumPct: null, avgInterest: Math.round(avg(series)), breakout: false };
 const w = Math.max(2, Math.floor(series.length / 4));
 const recent = series.slice(-w), prior = series.slice(-2 * w, -w);
 const rAvg = avg(recent), pAvg = avg(prior);
 const momentumPct = pAvg > 0 ? Math.round(((rAvg - pAvg) / pAvg) * 100) : (rAvg > 0 ? 100 : null);
 return { brand, momentumPct, avgInterest: Math.round(avg(series)), breakout: momentumPct != null && momentumPct >= 80 && rAvg >= 20 };
 });
}

async function ebaySoldStats(brand: string): Promise<{ soldCount: number; medianCents: number | null }> {
 const r = await serp({ engine: "ebay", _nkw: brand, ebay_domain: "ebay.com", LH_Sold: "1", LH_Complete: "1" });
 const rows: any[] = r?.organic_results || [];
 const cents = rows.map((row) => priceToCents(row.price)).filter((c): c is number => !!c && c > 0).sort((a, b) => a - b);
 return { soldCount: rows.length, medianCents: cents.length ? cents[Math.floor(cents.length / 2)] : null };
}

// Fetch fresh Google + eBay signal for the given brands and SAVE snapshots. Returns counts saved.
export async function captureMarketTrends(brands: string[]): Promise<{ google: number; resale: number }> {
 const list = [...new Set(brands.map((b) => b.trim()).filter(Boolean))];
 if (!isMarketTrendsConfigured() || !list.length) return { google: 0, resale: 0 };
 const sql = tdb();
 await ensureTables(sql);

 let google = 0;
 const gList = list.slice(0, 20);
 for (let i = 0; i < gList.length; i += 5) {
 const batch = await fetchGoogleBatch(gList.slice(i, i + 5));
 for (const b of batch) {
 if (b.avgInterest > 0 || b.momentumPct !== null) {
 await sql`INSERT INTO google_search_snapshots (brand, momentum_pct, avg_interest, breakout) VALUES (${b.brand}, ${b.momentumPct}, ${b.avgInterest}, ${b.breakout})`.catch(() => {});
 google++;
 }
 }
 }

 let resale = 0;
 for (const brand of list.slice(0, 12)) { // eBay costs one call per brand
 const st = await ebaySoldStats(brand);
 if (st.soldCount > 0 || st.medianCents) {
 await sql`INSERT INTO resale_market_snapshots (brand, sold_count, median_price_cents) VALUES (${brand}, ${st.soldCount}, ${st.medianCents})`.catch(() => {});
 resale++;
 }
 }
 return { google, resale };
}

// ── READ: DB only (called by the Trends route — no SerpApi call on page view) ──

export async function getGoogleTrends(brands: string[]): Promise<BrandSearchTrend[]> {
 const list = [...new Set(brands.map((b) => b.trim().toLowerCase()).filter(Boolean))];
 if (!list.length) return [];
 const sql = tdb();
 const rows = (await sql`
  SELECT DISTINCT ON (lower(brand)) brand, momentum_pct, avg_interest, breakout
  FROM google_search_snapshots WHERE captured_at >= now() - interval '21 days'
  ORDER BY lower(brand), captured_at DESC
 `.catch(() => [])) as { brand: string; momentum_pct: number | null; avg_interest: number | null; breakout: boolean | null }[];
 const map = new Map(rows.map((r) => [r.brand.toLowerCase(), r]));
 return brands.map((b) => {
 const r = map.get(b.trim().toLowerCase());
 return r ? { brand: b, momentumPct: r.momentum_pct, avgInterest: r.avg_interest ?? 0, breakout: !!r.breakout } : null;
 }).filter((x): x is BrandSearchTrend => !!x);
}

export async function getResaleMarket(brands: string[]): Promise<ResaleMarket[]> {
 const list = [...new Set(brands.map((b) => b.trim()).filter(Boolean))];
 if (!list.length) return [];
 const sql = tdb();
 const out: ResaleMarket[] = [];
 for (const brand of list) {
 const latest = (await sql`SELECT sold_count, median_price_cents FROM resale_market_snapshots WHERE lower(brand) = lower(${brand}) ORDER BY captured_at DESC LIMIT 1`.catch(() => [])) as { sold_count: number; median_price_cents: number | null }[];
 const l = latest[0];
 if (!l) continue;
 const prior = (await sql`SELECT sold_count, median_price_cents FROM resale_market_snapshots WHERE lower(brand) = lower(${brand}) AND captured_at <= now() - interval '6 days' ORDER BY captured_at DESC LIMIT 1`.catch(() => [])) as { sold_count: number; median_price_cents: number | null }[];
 const p = prior[0];
 const volMomentumPct = p && p.sold_count > 0 ? Math.round(((l.sold_count - p.sold_count) / p.sold_count) * 100) : null;
 const priceMomentumPct = p?.median_price_cents && l.median_price_cents ? Math.round(((l.median_price_cents - p.median_price_cents) / p.median_price_cents) * 100) : null;
 out.push({ brand, soldCount: l.sold_count, medianPriceCents: l.median_price_cents, volMomentumPct, priceMomentumPct });
 }
 return out;
}
