import { NextRequest, NextResponse } from "next/server";
import { getStoreAnalytics } from "@/app/lib/analytics-db";
import { resolveStoreSlug } from "@/app/lib/storeAuth";

export async function GET(request: NextRequest) {
 const storeSlug = await resolveStoreSlug(request);
 if (!storeSlug) {
 return NextResponse.json({ error: "Not a registered store partner" }, { status: 403 });
 }

 const range = request.nextUrl.searchParams.get("range") || "30d";
 const analytics = await getStoreAnalytics(storeSlug, range);
 return NextResponse.json(analytics);
}
