import { NextRequest, NextResponse } from "next/server";
import { resolveStoreSlugAny } from "@/app/lib/storeAuth";
import { getAttribution, getChannelTrend } from "@/app/lib/audience-db";

export const dynamic = "force-dynamic";

const EMPTY = { rows: [], totals: { clicks: 0, orders: 0, sales: 0, convPct: 0, aov: 0 }, newCustomers: 0, returningCustomers: 0 };

// GET — channel attribution + trend for the acting store. ?days=30 (default) | all
export async function GET(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 const raw = new URL(request.url).searchParams.get("days");
 const days = raw === "all" ? undefined : Number(raw) || 30;
 const [data, trend] = await Promise.all([
 getAttribution(slug, days).catch(() => EMPTY),
 getChannelTrend(slug, days ?? 90).catch(() => ({ days: [], series: [] })),
 ]);
 return NextResponse.json({ ok: true, days: days ?? "all", ...data, trend });
}
