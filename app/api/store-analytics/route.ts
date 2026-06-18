import { NextRequest, NextResponse } from "next/server";
import { stores } from "@/app/lib/stores";
import { getStoreAnalytics } from "@/app/lib/analytics-db";
import { timingSafeEqualStr } from "@/app/lib/safe-compare";

export async function GET(request: NextRequest) {
 const { searchParams } = new URL(request.url);
 const storeSlug = searchParams.get("store");
 const token = searchParams.get("token");
 const range = searchParams.get("range") || "all";

 if (!storeSlug || !token) {
 return NextResponse.json({ error: "Missing store or token" }, { status: 400 });
 }

 const store = stores.find((s) => s.slug === storeSlug);
 const expectedToken = store && "dashboardToken" in store
 ? (store as { dashboardToken?: string }).dashboardToken
 : null;
 // Timing-safe compare so the per-store dashboard token can't be guessed byte-by-byte.
 if (!store || !expectedToken || !timingSafeEqualStr(token, expectedToken)) {
 return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
 }

 try {
 const data = await getStoreAnalytics(storeSlug, range);
 return NextResponse.json({ ...data, storeName: store.name });
 } catch (error) {
 console.error("Store analytics error:", error);
 return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
 }
}
