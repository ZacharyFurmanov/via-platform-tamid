import { NextRequest, NextResponse } from "next/server";
import { getStoreAnalytics } from "@/app/lib/analytics-db";
import { resolveStoreSlug } from "@/app/lib/storeAuth";
import { stores } from "@/app/lib/stores";
import { getCollabsCommissionForStore } from "@/app/lib/collabs-stats";

export async function GET(request: NextRequest) {
 const storeSlug = await resolveStoreSlug(request);
 if (!storeSlug) {
 return NextResponse.json({ error: "Not a registered store partner" }, { status: 403 });
 }

 const range = request.nextUrl.searchParams.get("range") || "30d";
 const analytics = await getStoreAnalytics(storeSlug, range);

 // For Shopify Collabs stores, the authoritative all-time VYA commission is the number
 // Collabs itself reports (synced into collabs_partnerships_snapshot) — not our tracked-
 // conversions estimate, which misses orders for stores without order webhooks. Use it
 // for the all-time view (the Collabs total is cumulative, so it only maps to "all").
 const store = stores.find((s) => s.slug === storeSlug);
 if (range === "all" && store?.commissionType === "shopify-collabs") {
 const collabs = await getCollabsCommissionForStore(storeSlug).catch(() => null);
 if (collabs) {
 return NextResponse.json({ ...analytics, commissionEarned: collabs.commissionUsd, commissionSource: "shopify-collabs" });
 }
 }

 return NextResponse.json(analytics);
}
