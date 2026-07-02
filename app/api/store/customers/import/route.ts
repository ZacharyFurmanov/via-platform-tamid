import { NextRequest, NextResponse } from "next/server";
import { resolveStoreSlugAny } from "@/app/lib/storeAuth";
import { parseCustomers } from "@/app/lib/parse-customers";
import { importCustomers } from "@/app/lib/store-customers-db";

export const dynamic = "force-dynamic";

// POST { csv, source? } — bring over a seller's existing customer list. Accepts
// whatever they exported (Shopify/Square/Mailchimp/plain list); we parse flexibly.
export async function POST(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

 const body = await request.json().catch(() => null);
 const csv = typeof body?.csv === "string" ? body.csv : "";
 const source = body?.source ? String(body.source).slice(0, 40) : null;
 if (!csv.trim()) return NextResponse.json({ error: "Paste or upload your customer list first." }, { status: 400 });

 const parsed = parseCustomers(csv);
 if (!parsed.length) return NextResponse.json({ error: "Couldn’t find any email addresses in that file." }, { status: 400 });

 const { added, total } = await importCustomers(slug, parsed, source);
 return NextResponse.json({ ok: true, found: parsed.length, added, total });
}
