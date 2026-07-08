import { NextResponse } from "next/server";
import { getBrandHeatIndex } from "@/app/lib/brand-heat-db";
import { captureMarketTrends, isMarketTrendsConfigured } from "@/app/lib/market-trends";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Daily: fetch Google Search interest + eBay sold data for the trending brands and PERSIST snapshots
// to Postgres, so the Trends tab reads from the database (with history for momentum) rather than
// calling SerpApi on every page view. Dormant until SERPAPI_ENABLED=true.
// Manual first run allowed via ?key=<CRON_SECRET> so you can populate it right after enabling.
export async function GET(request: Request) {
 const cronSecret = process.env.CRON_SECRET;
 const url = new URL(request.url);
 const authed = request.headers.get("authorization") === `Bearer ${cronSecret}` || (cronSecret && url.searchParams.get("key") === cronSecret);
 if (!cronSecret || !authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 if (!isMarketTrendsConfigured()) {
 return NextResponse.json({ ok: true, skipped: "SerpApi not enabled (set SERPAPI_ENABLED=true).", google: 0, resale: 0 });
 }

 // The brands worth tracking externally: the top of VYA's own demand index.
 const heat = await getBrandHeatIndex(30, 24).catch(() => ({ brands: [] as { brand: string }[] }));
 const brands = (heat.brands as { brand: string }[]).map((b) => b.brand).filter(Boolean);
 if (!brands.length) return NextResponse.json({ ok: true, message: "No brands to snapshot yet.", google: 0, resale: 0 });

 const saved = await captureMarketTrends(brands).catch((e) => { console.error("snapshot-market-trends:", e); return { google: 0, resale: 0 }; });
 return NextResponse.json({ ok: true, brands: brands.length, ...saved });
}
