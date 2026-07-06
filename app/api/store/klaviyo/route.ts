import { NextRequest, NextResponse } from "next/server";
import { resolveStoreSlugAny } from "@/app/lib/storeAuth";
import { getKlaviyoConnection, saveKlaviyoKey, clearKlaviyo } from "@/app/lib/klaviyo-db";
import { verifyKlaviyoKey, syncCustomersToKlaviyo, klaviyoConfigured } from "@/app/lib/klaviyo";

export const dynamic = "force-dynamic";

// GET — connection status. `oauth` says whether "Log in with Klaviyo" is available on the server.
export async function GET(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 const c = await getKlaviyoConnection(slug);
 return NextResponse.json({ ok: true, connected: !!c, accountName: c?.accountName ?? null, authType: c?.authType ?? null, oauth: klaviyoConfigured() });
}

// POST — { apiKey } to connect via pasted key, or { action: "sync" } to backfill customers.
export async function POST(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 const b = await request.json().catch(() => ({}));

 if (b?.action === "sync") {
 const r = await syncCustomersToKlaviyo(slug);
 return NextResponse.json({ ok: true, ...r });
 }

 const apiKey = String(b?.apiKey || "").trim();
 if (!apiKey) return NextResponse.json({ error: "Paste your Klaviyo private API key." }, { status: 400 });
 const check = await verifyKlaviyoKey(apiKey);
 if (!check.ok) return NextResponse.json({ error: "That key didn’t work. Copy your private API key (starts with pk_) from Klaviyo → Settings → API keys." }, { status: 400 });
 await saveKlaviyoKey(slug, apiKey, check.accountName);
 return NextResponse.json({ ok: true, connected: true, accountName: check.accountName });
}

// DELETE — disconnect Klaviyo.
export async function DELETE(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 await clearKlaviyo(slug);
 return NextResponse.json({ ok: true, connected: false });
}
