import { neon } from "@neondatabase/serverless";

// Intake accuracy = the AI-listing feedback loop, measured. Turns the corrections we
// already log (intake_corrections = only the fields a seller CHANGED from the AI's
// draft) and the published items (intake_memory_items = AI market value vs. the
// seller's final price) into "where is the model weak, and by how much". Cross-store
// (admin view), so it measures the SYSTEM, not one seller.

function db() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("DATABASE_URL or POSTGRES_URL is not set.");
 return neon(url);
}

export type FieldAccuracy = {
 field: string;
 accepted: number; // AI's guess kept by the seller
 corrected: number; // AI's guess changed by the seller
 accuracyPct: number; // accepted ÷ (accepted + corrected) — true per-field accuracy
};
export type BrandMiss = { from: string; to: string; n: number };
export type PriceCalibration = {
 samples: number;
 medianRatio: number; // median(final price ÷ AI market value); 1.0 = perfectly calibrated
 overpricedPct: number; // % of listings the seller priced well BELOW the AI (AI too high)
 underpricedPct: number; // % priced well ABOVE the AI (AI too low)
 avgAbsErrorPct: number; // mean |ratio − 1|, as a %
};
export type IntakeAccuracy = {
 periodDays: number;
 totalPublishes: number;
 totalCorrections: number;
 fields: FieldAccuracy[];
 topBrandMisses: BrandMiss[];
 price: PriceCalibration;
};

const FIELDS = ["brand", "era", "material", "condition", "category"];

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function getIntakeAccuracy(days = 30): Promise<IntakeAccuracy> {
 const sql = db();
 const cutoff = new Date(Date.now() - days * 86400000).toISOString();

 // Tolerate a fresh environment where the intake tables don't exist yet.
 await Promise.allSettled([
 sql`CREATE TABLE IF NOT EXISTS intake_predictions (id SERIAL PRIMARY KEY, store_slug TEXT NOT NULL, field TEXT NOT NULL, ai_value TEXT, final_value TEXT, accepted BOOLEAN NOT NULL DEFAULT false, image_url TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
 sql`CREATE TABLE IF NOT EXISTS intake_memory_items (id SERIAL PRIMARY KEY, store_slug TEXT NOT NULL, image_url TEXT, embedding TEXT, brand TEXT, era TEXT, material TEXT, condition TEXT, category TEXT, market_cents INTEGER, price_cents INTEGER, created_at TIMESTAMPTZ NOT NULL DEFAULT now())`,
 ]);

 const [pubRows, fieldRows, brandMissRows, priceRows] = await Promise.all([
 sql`SELECT COUNT(*)::int AS n FROM intake_memory_items WHERE created_at >= ${cutoff}`,
 sql`SELECT field,
 COUNT(*) FILTER (WHERE accepted)::int AS accepted,
 COUNT(*) FILTER (WHERE NOT accepted)::int AS corrected
 FROM intake_predictions WHERE created_at >= ${cutoff} GROUP BY field`,
 sql`SELECT ai_value AS from_v, final_value AS to_v, COUNT(*)::int AS n
 FROM intake_predictions
 WHERE field = 'brand' AND NOT accepted AND ai_value IS NOT NULL AND ai_value <> '' AND created_at >= ${cutoff}
 GROUP BY ai_value, final_value ORDER BY n DESC LIMIT 15`,
 sql`SELECT price_cents::float / market_cents AS ratio
 FROM intake_memory_items
 WHERE market_cents > 0 AND price_cents > 0 AND created_at >= ${cutoff}`,
 ]) as [any[], any[], any[], any[]];

 const totalPublishes = Number(pubRows[0]?.n || 0);
 const byField = new Map<string, any>(fieldRows.map((r) => [r.field, r]));
 const fields: FieldAccuracy[] = FIELDS.map((f) => {
 const r = byField.get(f);
 const accepted = Number(r?.accepted || 0);
 const corrected = Number(r?.corrected || 0);
 const graded = accepted + corrected;
 return { field: f, accepted, corrected, accuracyPct: graded ? Math.round((accepted / graded) * 100) : 0 };
 }).sort((a, b) => (b.accepted + b.corrected) - (a.accepted + a.corrected));

 const totalCorrections = fields.reduce((s, f) => s + f.corrected, 0);
 const topBrandMisses: BrandMiss[] = brandMissRows.map((r) => ({ from: String(r.from_v), to: String(r.to_v), n: Number(r.n) }));

 const ratios = priceRows.map((r) => Number(r.ratio)).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
 const median = ratios.length ? (ratios.length % 2 ? ratios[(ratios.length - 1) / 2] : (ratios[ratios.length / 2 - 1] + ratios[ratios.length / 2]) / 2) : 1;
 const price: PriceCalibration = {
 samples: ratios.length,
 medianRatio: Math.round(median * 100) / 100,
 overpricedPct: ratios.length ? Math.round((ratios.filter((r) => r < 0.8).length / ratios.length) * 100) : 0,
 underpricedPct: ratios.length ? Math.round((ratios.filter((r) => r > 1.25).length / ratios.length) * 100) : 0,
 avgAbsErrorPct: ratios.length ? Math.round((ratios.reduce((s, r) => s + Math.abs(r - 1), 0) / ratios.length) * 100) : 0,
 };

 return { periodDays: days, totalPublishes, totalCorrections, fields, topBrandMisses, price };
}
