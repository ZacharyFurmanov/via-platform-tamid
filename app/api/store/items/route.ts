import { NextRequest, NextResponse } from "next/server";
import { resolveStoreSlugAny, isOwner } from "@/app/lib/storeAuth";
import { getSellerBySlug } from "@/app/lib/db/sellers";
import { listSellerItems, deleteAllItems, publishItems, removeItems } from "@/app/lib/db/inventory";

export const dynamic = "force-dynamic";

// GET — all of the acting store's VYA-native items (any status).
export async function GET(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const seller = await getSellerBySlug(slug);
 const items = seller ? await listSellerItems(seller.id) : [];
 // isAdmin gates the owner-only "clear all inventory" reset.
 return NextResponse.json({ ok: true, items, isAdmin: isOwner(request, slug) });
}

// POST { action: "publish" | "remove", ids: string[] } — bulk lifecycle action on
// the acting store's items, e.g. push a whole drop of drafts live at once. Scoped
// to the seller, so passing another store's ids is a no-op.
export async function POST(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 const seller = await getSellerBySlug(slug);
 if (!seller) return NextResponse.json({ error: "Not found" }, { status: 404 });

 const body = await request.json().catch(() => ({}));
 const action = body?.action;
 const ids = Array.isArray(body?.ids) ? body.ids.filter((x: unknown) => typeof x === "string") : [];
 if (!ids.length) return NextResponse.json({ error: "No items selected" }, { status: 400 });

 let count = 0;
 if (action === "publish") count = await publishItems(seller.id, ids);
 else if (action === "remove") count = await removeItems(seller.id, ids);
 else return NextResponse.json({ error: "Unknown action" }, { status: 400 });

 return NextResponse.json({ ok: true, count });
}

// DELETE — owner-only: wipe ALL of this store's inventory, sold included (plus the
// orders behind sold items). For you as the tester/owner, not a per-seller feature.
export async function DELETE(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 if (!isOwner(request, slug)) return NextResponse.json({ error: "Owner only" }, { status: 403 });
 const seller = await getSellerBySlug(slug);
 const deleted = seller ? await deleteAllItems(seller.id).catch(() => 0) : 0;
 return NextResponse.json({ ok: true, deleted });
}
