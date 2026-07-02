import { NextRequest, NextResponse } from "next/server";
import { resolveStoreSlugAny } from "@/app/lib/storeAuth";
import { getAttribution, getStoreSalesTotal } from "@/app/lib/audience-db";
import { getTrafficSources } from "@/app/lib/store-visits-db";

export const dynamic = "force-dynamic";

const EMPTY = { rows: [], totals: { clicks: 0, orders: 0, sales: 0, convPct: 0, aov: 0 }, newCustomers: 0, returningCustomers: 0 };
const EMPTY_TRAFFIC = { total: 0, byType: [], topSources: [] };

// GET — marketing performance for the acting store: per-channel sessions/conversion
// plus the share of total store sales attributed to marketing. ?days=30 (default) | all
export async function GET(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 const raw = new URL(request.url).searchParams.get("days");
 const days = raw === "all" ? undefined : Number(raw) || 30;
 const [attribution, storeSales, traffic] = await Promise.all([
 getAttribution(slug, days).catch(() => EMPTY),
 getStoreSalesTotal(slug, days).catch(() => 0),
 getTrafficSources(slug, days).catch(() => EMPTY_TRAFFIC),
 ]);
 // Attributed sales can't exceed total store sales; clamp so the share never reads >100%.
 const attributedSales = attribution.totals.sales;
 const totalSales = Math.max(storeSales, attributedSales);
 return NextResponse.json({ ok: true, days: days ?? "all", ...attribution, attributedSales, totalSales, traffic });
}
