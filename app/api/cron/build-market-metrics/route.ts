import { NextResponse } from "next/server";
import { computeMarketMetrics } from "@/app/lib/data-layer/market-metrics-db";

// Daily metric job: events → market_metrics (brand/category/era × 7d/30d).
// Runs after the events ETL so it reads a fresh log.
export const maxDuration = 300;

export async function GET(request: Request) {
 const authHeader = request.headers.get("authorization");
 const cronSecret = process.env.CRON_SECRET;
 if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }
 try {
 const result = await computeMarketMetrics();
 return NextResponse.json({ ok: true, ...result });
 } catch (err) {
 console.error("[cron/build-market-metrics] failed:", err);
 return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
 }
}
