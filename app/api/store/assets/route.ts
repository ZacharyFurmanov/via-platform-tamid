import { NextRequest, NextResponse } from "next/server";
import { put, list, del } from "@vercel/blob";
import { resolveStoreSlugAny } from "@/app/lib/storeAuth";

export const dynamic = "force-dynamic";

// A store's media library — photos they upload to drop into their storefront (hero,
// banners, lookbook). Stored in Blob under a per-store prefix; no DB table needed —
// the prefix IS the library, and it namespaces each store's assets.
const prefixFor = (slug: string) => `assets/${slug}/`;

// GET — list the store's uploaded photos, newest first.
export async function GET(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 try {
 const { blobs } = await list({ prefix: prefixFor(slug) });
 const assets = blobs
 .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
 .map((b) => ({ url: b.url, pathname: b.pathname, size: b.size }));
 return NextResponse.json({ assets });
 } catch (err) {
 console.error("asset list error:", err);
 return NextResponse.json({ assets: [] });
 }
}

// POST (multipart) — upload one photo into the library.
export async function POST(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 try {
 const formData = await request.formData();
 const file = formData.get("file") as File | null;
 if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
 if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
 if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: "Image must be under 15MB" }, { status: 400 });

 const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
 const filename = `${prefixFor(slug)}${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
 const blob = await put(filename, file, { access: "public", contentType: file.type });
 return NextResponse.json({ url: blob.url });
 } catch (err) {
 console.error("asset upload error:", err);
 return NextResponse.json({ error: "Upload failed" }, { status: 500 });
 }
}

// DELETE ?url= — remove a photo (only from the acting store's own library).
export async function DELETE(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 const url = request.nextUrl.searchParams.get("url") || "";
 if (!url || !url.includes(prefixFor(slug))) return NextResponse.json({ error: "Not your asset." }, { status: 403 });
 try {
 await del(url);
 return NextResponse.json({ ok: true });
 } catch (err) {
 console.error("asset delete error:", err);
 return NextResponse.json({ error: "Delete failed" }, { status: 500 });
 }
}
