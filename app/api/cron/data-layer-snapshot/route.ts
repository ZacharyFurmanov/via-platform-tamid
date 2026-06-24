import { NextResponse } from "next/server";
import { computeAndStoreSnapshot } from "@/app/lib/data-snapshots-db";

// Daily aggregation of the entire B2B data layer into one dated snapshot row.
// Reads are then instant and we accumulate a time series for trends + reports.
export const maxDuration = 300;

export async function GET(request: Request) {
 const authHeader = request.headers.get("authorization");
 const cronSecret = process.env.CRON_SECRET;
 if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 try {
 const snapshot = await computeAndStoreSnapshot(30);
 return NextResponse.json({
  ok: true,
  date: snapshot.date,
  generatedAt: snapshot.generatedAt,
  brands: snapshot.payload.brandHeat.brands.length,
  categories: snapshot.payload.categoryHeat.length,
  stores: snapshot.payload.storeHeat.length,
  gmv: snapshot.payload.demand.summary.gmv,
  orders: snapshot.payload.demand.summary.orders,
  whitespace: snapshot.payload.demand.whitespace.length,
 });
 } catch (err) {
 console.error("[data-layer-snapshot] failed:", err);
 return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
 }
}
