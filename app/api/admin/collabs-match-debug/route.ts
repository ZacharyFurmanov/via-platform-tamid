import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/app/lib/storeAuth";
import { getSetting } from "@/app/lib/settings-db";
import { stores } from "@/app/lib/stores";
import { getCollabsCommissionForStore } from "@/app/lib/collabs-stats";

export const dynamic = "force-dynamic";

// Debug: does a store match a Collabs partnership in the synced snapshot?
// GET ?store=<slug> for a single store, or no param for the full snapshot name list.
export async function GET(request: NextRequest) {
 if (!isAdminRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 const raw = await getSetting("collabs_partnerships_snapshot").catch(() => null);
 let parts: { name: string; totalCommissionEarned?: string }[] = [];
 try { parts = raw ? JSON.parse(raw) : []; } catch { /* ignore */ }

 const slug = request.nextUrl.searchParams.get("store");
 if (slug) {
 const store = stores.find((s) => s.slug === slug);
 const match = await getCollabsCommissionForStore(slug).catch(() => null);
 return NextResponse.json({
 store: store?.name ?? null,
 affiliatePath: (store as { affiliatePath?: string })?.affiliatePath ?? null,
 commissionType: store?.commissionType ?? null,
 matched: match,
 snapshotNames: parts.map((p) => p.name),
 });
 }
 return NextResponse.json({
 snapshotExists: !!raw,
 count: parts.length,
 partnerships: parts.map((p) => ({ name: p.name, commission: p.totalCommissionEarned })),
 });
}
