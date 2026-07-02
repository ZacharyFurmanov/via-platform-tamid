import { NextRequest, NextResponse } from "next/server";
import { resolveStoreSlugAny } from "@/app/lib/storeAuth";
import { getShippingSettings, setShippingSettings, type ShipMode, type ShipFrom } from "@/app/lib/store-shipping-db";

export const dynamic = "force-dynamic";

const MODES = ["buyer_pays", "store_pays", "free_over"];

// GET — this store's shipping policy (mode, threshold, ship-from address).
export async function GET(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 const s = await getShippingSettings(slug);
 return NextResponse.json({ mode: s.mode, freeThresholdUsd: s.freeThresholdCents != null ? s.freeThresholdCents / 100 : null, shipFrom: s.shipFrom });
}

// POST { mode, freeThresholdUsd, shipFrom } — set the policy (each store its own).
export async function POST(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 const body = await request.json().catch(() => null);

 const mode = (MODES.includes(body?.mode) ? body.mode : "buyer_pays") as ShipMode;
 const threshUsd = Number(body?.freeThresholdUsd);
 const freeThresholdCents = mode === "free_over" && Number.isFinite(threshUsd) && threshUsd > 0 ? Math.round(threshUsd * 100) : null;

 const f = body?.shipFrom || {};
 const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 120) : null);
 const shipFrom: ShipFrom = {
 name: str(f.name), street1: str(f.street1), street2: str(f.street2), city: str(f.city),
 state: str(f.state), zip: str(f.zip), country: str(f.country) || "US", phone: str(f.phone),
 };

 await setShippingSettings(slug, { mode, freeThresholdCents, shipFrom });
 return NextResponse.json({ ok: true });
}
