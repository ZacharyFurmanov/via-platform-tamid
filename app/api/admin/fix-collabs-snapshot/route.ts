import { NextRequest, NextResponse } from "next/server";
import { getSetting, saveSetting } from "@/app/lib/settings-db";
import crypto from "crypto";

function isAuthorized(request: NextRequest): boolean {
 const adminPassword = process.env.ADMIN_PASSWORD;
 if (!adminPassword) return false;
 const token = request.cookies.get("via_admin_token")?.value;
 return token === crypto.createHash("sha256").update(adminPassword).digest("hex");
}

// POST body: { storeId: string, decrementBy: number }
// Decrements a specific store's totalOrders in the cron snapshot so the next
// sync re-records the missed conversion(s).
export async function POST(request: NextRequest) {
 if (!isAuthorized(request)) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }

 const { storeId, storeName, decrementBy = 1 } = await request.json() as {
 storeId?: string;
 storeName?: string;
 decrementBy?: number;
 };

 if (!storeId && !storeName) {
 return NextResponse.json({ error: "Provide storeId or storeName" }, { status: 400 });
 }

 const raw = await getSetting("collabs_data");
 if (!raw) {
 return NextResponse.json({ error: "No collabs_data snapshot found" }, { status: 404 });
 }

 type PartnershipSnap = { id: string; name: string; totalOrders: number; totalCommissionEarned: string };
 const partnerships: PartnershipSnap[] = JSON.parse(raw);

 const match = partnerships.find((p) =>
 (storeId && p.id === storeId) ||
 (storeName && p.name.toLowerCase().includes(storeName.toLowerCase()))
 );

 if (!match) {
 return NextResponse.json({
 error: "Store not found in snapshot",
 available: partnerships.map((p) => ({ id: p.id, name: p.name, totalOrders: p.totalOrders })),
 }, { status: 404 });
 }

 const before = match.totalOrders;
 match.totalOrders = Math.max(0, match.totalOrders - decrementBy);

 await saveSetting("collabs_data", JSON.stringify(partnerships));

 return NextResponse.json({
 ok: true,
 store: match.name,
 before,
 after: match.totalOrders,
 message: `Run Sync Collabs on the sync page to record the ${decrementBy} missed conversion(s).`,
 });
}
