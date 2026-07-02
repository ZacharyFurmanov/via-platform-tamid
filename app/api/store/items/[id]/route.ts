import { NextRequest, NextResponse } from "next/server";
import { resolveStoreSlugAny } from "@/app/lib/storeAuth";
import { getSellerBySlug } from "@/app/lib/db/sellers";
import { getItem, markSold, removeItem, publishItem, updateItem } from "@/app/lib/db/inventory";
import { getOrCreateCollection, setItemCollections } from "@/app/lib/db/collections";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// POST { action: "sold" | "remove" | "publish" } — run a lifecycle transition on
// one of the acting store's items (ownership-scoped).
export async function POST(request: NextRequest, { params }: Ctx) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const { id } = await params;
 const body = await request.json().catch(() => ({}));
 const action = body?.action;

 const seller = await getSellerBySlug(slug);
 if (!seller) return NextResponse.json({ error: "Not found" }, { status: 404 });

 const item = await getItem(id);
 if (!item || item.sellerId !== seller.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

 let result;
 if (action === "sold") result = await markSold(id);
 else if (action === "remove") result = await removeItem(id);
 else if (action === "publish") result = await publishItem(id);
 else return NextResponse.json({ error: "Unknown action" }, { status: 400 });

 return NextResponse.json({ ok: true, item: result });
}

// PATCH — edit one of the acting store's items (title/price/size/category/description).
// Works on any status, so drafts staged for a drop can be tweaked before going live.
export async function PATCH(request: NextRequest, { params }: Ctx) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const { id } = await params;
 const seller = await getSellerBySlug(slug);
 if (!seller) return NextResponse.json({ error: "Not found" }, { status: 404 });

 const item = await getItem(id);
 if (!item || item.sellerId !== seller.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

 const body = await request.json().catch(() => ({}));
 const trimOrNull = (v: unknown, n: number) => { const s = String(v ?? "").trim().slice(0, n); return s || null; };

 const patch: Partial<{ title: string; priceCents: number; size: string | null; category: string | null; description: string | null }> = {};
 if (typeof body.title === "string" && body.title.trim()) patch.title = body.title.trim().slice(0, 200);
 if (body.price !== undefined) patch.priceCents = Math.round(Math.max(0, Math.min(1_000_000, Number(body.price) || 0)) * 100);
 if (body.size !== undefined) patch.size = trimOrNull(body.size, 40);
 if (body.category !== undefined) patch.category = trimOrNull(body.category, 60);
 if (body.description !== undefined) patch.description = trimOrNull(body.description, 2000);
 // Collections (titles). Only touched when the field is sent; an array (even empty) sets membership.
 const cols = Array.isArray(body.collections)
 ? body.collections.filter((x: unknown) => typeof x === "string" && (x as string).trim()).map((x: string) => x.trim().slice(0, 80)).slice(0, 20)
 : undefined;
 if (!Object.keys(patch).length && cols === undefined) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

 const updated = Object.keys(patch).length ? await updateItem(id, patch) : item;
 if (cols !== undefined) {
 const ids: string[] = [];
 for (const t of cols) ids.push((await getOrCreateCollection(seller.id, t)).id);
 await setItemCollections(id, ids);
 }
 return NextResponse.json({ ok: true, item: updated });
}
