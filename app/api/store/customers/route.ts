import { NextRequest, NextResponse } from "next/server";
import { resolveStoreSlugAny } from "@/app/lib/storeAuth";
import { listCustomerProfiles, addCustomer } from "@/app/lib/store-customers-db";
import { fireAutomationTrigger } from "@/app/lib/automation-engine";

export const dynamic = "force-dynamic";

// GET — the store's full customer list: brought-over audience merged with anyone
// who has actually purchased (order count, total spent, last order), plus top-line
// stats for the header.
export async function GET(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 const customers = await listCustomerProfiles(slug);
 const buyers = customers.filter((c) => c.orders > 0).length;
 const revenueCents = customers.reduce((s, c) => s + c.spentCents, 0);
 return NextResponse.json({ count: customers.length, buyers, revenueCents, customers });
}

// POST { email, name? } — add one customer by hand.
export async function POST(request: NextRequest) {
 const slug = await resolveStoreSlugAny(request);
 if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 const body = await request.json().catch(() => ({}));
 const email = String(body?.email || "").trim().toLowerCase();
 if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
 const name = String(body?.name || "").trim().slice(0, 120) || null;
 await addCustomer(slug, email, name);
 // Fire any "new customer" automations (e.g. a welcome email). Manual add only —
 // bulk imports don't trigger, so bringing an audience over never spams them.
 fireAutomationTrigger(slug, "new_customer", { email, name }).catch(() => {});
 return NextResponse.json({ ok: true });
}
