import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { gateSegments, type RawSegment } from "@/app/lib/data-layer/privacy";
import { PRIVACY, SOURCING } from "@/app/lib/data-layer/config";
import { sourcingVerdict, type Trend } from "@/app/lib/data-layer/metrics";
import { resolveStoreSlug } from "@/app/lib/storeAuth";

export const dynamic = "force-dynamic";

function db() {
 const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
 if (!url) throw new Error("No database URL");
 return neon(url);
}

// GET /api/store/demand-search?q=cavalli&window=30d — the "Should I buy this?"
// tool. Matches the query against any segment (brand / category / era), gates
// for privacy, and attaches a plain-language sourcing verdict to each result.
export async function GET(request: NextRequest) {
 if (!(await resolveStoreSlug(request))) return NextResponse.json({ error: "Not a registered store partner" }, { status: 403 });

 const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
 const windowKey = request.nextUrl.searchParams.get("window") === "7d" ? "7d" : "30d";
 if (q.length < 2) return NextResponse.json({ query: q, windowKey, results: [], note: "Type at least 2 characters." });

 const sql = db();
 try {
 const rows = (await sql`
  SELECT segment_type, segment_value, demand_index, demand_trend, supply_gap_score,
   sell_through_pct, price_p25, price_median, price_p75, active_supply, store_count, txn_count,
   to_char(as_of_date,'YYYY-MM-DD') AS as_of
  FROM market_metrics
  WHERE window_key = ${windowKey}
   AND as_of_date = (SELECT MAX(as_of_date) FROM market_metrics)
   AND LOWER(segment_value) LIKE ${"%" + q.toLowerCase() + "%"}
 `) as Array<Record<string, unknown>>;

 const raw: RawSegment[] = rows.map((r) => ({
  segmentType: r.segment_type as string,
  segmentValue: r.segment_value as string,
  demandIndex: Number(r.demand_index),
  demandTrend: r.demand_trend as string,
  supplyGapScore: Number(r.supply_gap_score),
  sellThroughPct: r.sell_through_pct == null ? null : Number(r.sell_through_pct),
  priceP25: r.price_p25 == null ? null : Number(r.price_p25),
  priceMedian: r.price_median == null ? null : Number(r.price_median),
  priceP75: r.price_p75 == null ? null : Number(r.price_p75),
  activeSupply: Number(r.active_supply),
  storeCount: Number(r.store_count),
  txnCount: Number(r.txn_count),
 }));

 const results = gateSegments(raw, PRIVACY)
  .sort((a, b) => b.demandIndex - a.demandIndex)
  .slice(0, 8)
  .map((s) => ({
  ...s,
  verdict: sourcingVerdict(
   { demandIndex: s.demandIndex, demandTrend: s.demandTrend as Trend, supplyGapScore: s.supplyGapScore, sellThroughPct: s.sellThroughPct },
   SOURCING,
  ),
  }));

 const asOfDate = rows.length ? (rows[0].as_of as string) : null;
 return NextResponse.json({ query: q, windowKey, asOfDate, results });
 } catch (err) {
 console.error("[store/demand-search] error:", err);
 return NextResponse.json({ query: q, windowKey, results: [], error: "search_failed" });
 }
}
