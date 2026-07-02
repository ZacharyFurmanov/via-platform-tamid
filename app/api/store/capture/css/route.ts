import { NextRequest, NextResponse } from "next/server";
import { resolveStoreSlugAny } from "@/app/lib/storeAuth";
import { getSiteCss, setSiteCss } from "@/app/lib/site-capture-db";

export const dynamic = "force-dynamic";

// Read / write a captured store's site-wide custom CSS (the layer injected over the
// original theme on every page). Powers the imported-store "Global design" panel.
// Auth-gated to the store owner so the public site can't be restyled by anyone.
export async function GET(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 const css = await getSiteCss(slug).catch(() => "");
 return NextResponse.json({ css });
}

export async function POST(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 const body = await request.json().catch(() => null);
 if (typeof body?.css !== "string") return NextResponse.json({ error: "Missing css." }, { status: 400 });
 await setSiteCss(slug, body.css.slice(0, 20000));
 return NextResponse.json({ ok: true });
}
