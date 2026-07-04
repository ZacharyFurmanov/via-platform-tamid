import { NextResponse } from "next/server";
import { listStripeConnectedConsignors, getConsignmentSettings, getPayableBalanceCents, recordPayout } from "@/app/lib/consignment-db";
import { stripePost, stripeConfigured } from "@/app/lib/stripe";

// Auto-payout: for stores that turned it on, direct-deposit each consignor's balance once their
// sales clear the store's return window (hold_days) — no clicking. Only touches consignors who
// connected a bank; cash/check/store-credit stay manual. Model A: VYA disburses via a platform
// transfer from its own balance (which holds the consignor's cut routed at checkout).
export const maxDuration = 300;

export async function GET(request: Request) {
 const authHeader = request.headers.get("authorization");
 const cronSecret = process.env.CRON_SECRET;
 if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }
 if (!stripeConfigured()) return NextResponse.json({ ok: true, skipped: "stripe not configured" });

 const consignors = await listStripeConnectedConsignors();
 const storeCache = new Map<string, { auto: boolean; holdDays: number }>();
 let paid = 0;
 let totalCents = 0;
 let skipped = 0;

 for (const c of consignors) {
 let sc = storeCache.get(c.storeSlug);
 if (!sc) {
 const settings = await getConsignmentSettings(c.storeSlug);
 sc = { auto: settings.autoPayout, holdDays: settings.holdDays };
 storeCache.set(c.storeSlug, sc);
 }
 if (!sc.auto) { skipped++; continue; }
 const payable = await getPayableBalanceCents(c.id, sc.holdDays);
 if (payable <= 0) continue;
 try {
 // Platform transfer from VYA's balance (holds the consignor's cut routed from the sale).
 const transfer = await stripePost("transfers", { amount: payable, currency: "usd", destination: c.stripeAccountId });
 await recordPayout({ storeSlug: c.storeSlug, consignorId: c.id, amountCents: payable, method: "stripe", status: "paid", stripeTransferId: transfer.id as string });
 paid++;
 totalCents += payable;
 } catch (e) {
 console.error(`[consignment-payouts] consignor ${c.id}:`, e);
 skipped++;
 }
 }
 return NextResponse.json({ ok: true, paid, totalCents, skipped });
}
