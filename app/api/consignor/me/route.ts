import { NextResponse } from "next/server";
import { getConsignorEmail, CONSIGNOR_COOKIE } from "@/app/lib/consignor-auth";
import { getConsignorsByEmail, getConsignorStatement } from "@/app/lib/consignment-db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// The signed-in consignor's statement(s) — one per store they consign with. Gated by the
// session cookie, and only ever returns records whose email matches the session.
export async function GET(request: Request) {
 const email = getConsignorEmail(request);
 if (!email) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
 const consignors = await getConsignorsByEmail(email);
 const consignments = await Promise.all(consignors.map(async (c) => {
 const s = await getConsignorStatement(c.id);
 return {
 consignorId: c.id,
 store: c.storeSlug,
 name: c.name,
 connected: !!c.stripeAccountId,
 payoutMethod: c.payoutMethod,
 balanceCents: s.balanceCents,
 items: s.items.map((i) => ({ status: i.status, splitPct: i.splitPct, listedPriceCents: i.listedPriceCents, soldPriceCents: i.soldPriceCents, intakeDate: i.intakeDate, soldAt: i.soldAt })),
 ledger: s.ledger,
 payouts: s.payouts.map((p) => ({ amountCents: p.amountCents, method: p.method, status: p.status, createdAt: p.createdAt })),
 };
 }));
 return NextResponse.json({ email, consignments });
}

// Sign out — clear the session cookie.
export async function DELETE() {
 const res = NextResponse.json({ ok: true });
 res.cookies.set(CONSIGNOR_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
 return res;
}
