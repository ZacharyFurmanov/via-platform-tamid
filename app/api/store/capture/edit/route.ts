import { NextRequest, NextResponse } from "next/server";
import { resolveStoreSlugAny } from "@/app/lib/storeAuth";
import { getCapturePage, updateCapturePageHtml } from "@/app/lib/site-capture-db";
import { applyEdits, type PageEdits } from "@/app/lib/site-capture";

export const dynamic = "force-dynamic";

// POST { path, edits, images, deleteSecs, dupSecs } — save a seller's in-place edits
// to one captured page (text, image swaps, section add/remove). Auth-gated (only the
// store owner), so the public edit-mode view can't be used to vandalize a site.
export async function POST(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const body = await request.json().catch(() => null);
 const path = body?.path ? String(body.path) : "";
 if (!path) return NextResponse.json({ error: "Missing page." }, { status: 400 });

 const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
 const p: PageEdits = {
 edits: arr<{ eid: number; text: string }>(body?.edits).filter((e) => typeof e?.eid === "number" && typeof e?.text === "string").map((e) => ({ eid: e.eid, text: String(e.text).slice(0, 5000) })),
 images: arr<{ id: number; src: string }>(body?.images).filter((e) => typeof e?.id === "number" && typeof e?.src === "string").map((e) => ({ id: e.id, src: e.src.slice(0, 2000) })),
 deleteSecs: arr<number>(body?.deleteSecs).filter((n) => typeof n === "number"),
 dupSecs: arr<number>(body?.dupSecs).filter((n) => typeof n === "number"),
 };
 const total = (p.edits!.length + p.images!.length + p.deleteSecs!.length + p.dupSecs!.length);
 if (!total) return NextResponse.json({ error: "Nothing to save." }, { status: 400 });

 const html = await getCapturePage(slug, path).catch(() => null);
 if (html == null) return NextResponse.json({ error: "Page not found." }, { status: 404 });

 const ok = await updateCapturePageHtml(slug, path, applyEdits(html, p));
 return ok ? NextResponse.json({ ok: true, applied: total }) : NextResponse.json({ error: "Save failed." }, { status: 500 });
}
