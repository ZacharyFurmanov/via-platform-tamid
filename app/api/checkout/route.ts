import { NextRequest, NextResponse } from "next/server";
import { getItem, reserveItem, releaseReservation } from "@/app/lib/db/inventory";
import { getSellerById } from "@/app/lib/db/sellers";
import { getSellerPayments } from "@/app/lib/seller-payments-db";
import { stripePost, stripeConfigured } from "@/app/lib/stripe";
import { applicationFeeCents } from "@/app/lib/payments-config";
import { recordCheckoutAttempt } from "@/app/lib/checkout-attempts-db";

export const dynamic = "force-dynamic";

function baseUrl(request: NextRequest) {
 const host = request.headers.get("host") || "vyaplatform.com";
 const proto = host.startsWith("localhost") ? "http" : "https";
 return `${proto}://${host}`;
}

// POST { itemId, buyer:{email,name,phone}, ship:{line1,line2,city,state,zip,country}, shippingCostCents }
// Buyer-facing checkout. We collect the address ourselves (so we can quote a live
// shipping rate first), then open a Stripe Checkout Session as a DIRECT charge on
// the seller's account. VYA's application fee = 1% of the item PLUS any shipping the
// buyer paid (VYA holds the shipping to fund the label later — see the fulfillment
// view). The one-of-one is held for the duration of checkout.
export async function POST(request: NextRequest) {
 if (!stripeConfigured()) return NextResponse.json({ error: "Checkout isn’t available yet." }, { status: 503 });

 const body = await request.json().catch(() => null);
 const itemId = body?.itemId ? String(body.itemId) : "";
 if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

 const buyer = body?.buyer || {};
 const ship = body?.ship || {};
 const buyerEmail = typeof buyer.email === "string" ? buyer.email.trim() : "";
 if (!buyerEmail) return NextResponse.json({ error: "Email is required." }, { status: 400 });
 if (!ship.line1 || !ship.city || !ship.state || !ship.zip) return NextResponse.json({ error: "A full shipping address is required." }, { status: 400 });
 const shippingCostCents = Math.max(0, Math.round(Number(body?.shippingCostCents) || 0));

 const item = await getItem(itemId);
 if (!item || item.status !== "active") return NextResponse.json({ error: "This piece is no longer available." }, { status: 409 });
 const seller = await getSellerById(item.sellerId);
 if (!seller) return NextResponse.json({ error: "Seller not found." }, { status: 404 });
 const pay = await getSellerPayments(seller.slug);
 if (!pay?.stripeAccountId || !pay.chargesEnabled) return NextResponse.json({ error: "This store can’t take payments yet." }, { status: 400 });

 const reservation = await reserveItem(itemId, "checkout");
 if (!reservation) return NextResponse.json({ error: "This piece was just reserved by someone else." }, { status: 409 });

 try {
 const base = baseUrl(request);
 const currency = (item.currency || "usd").toLowerCase();
 const appFee = applicationFeeCents(item.priceCents) + shippingCostCents;
 const meta: Record<string, string> = {
 itemId,
 sellerId: seller.id,
 ship_name: String(buyer.name || ""),
 ship_line1: String(ship.line1),
 ship_line2: String(ship.line2 || ""),
 ship_city: String(ship.city),
 ship_state: String(ship.state),
 ship_zip: String(ship.zip),
 ship_country: String(ship.country || "US"),
 buyer_phone: String(buyer.phone || ""),
 shipping_paid_cents: String(shippingCostCents),
 };
 const line_items: Record<number, unknown> = {
 0: { quantity: 1, price_data: { currency, unit_amount: item.priceCents, product_data: { name: item.title, ...(item.images?.[0] ? { images: { 0: item.images[0] } } : {}) } } },
 };
 if (shippingCostCents > 0) {
 line_items[1] = { quantity: 1, price_data: { currency, unit_amount: shippingCostCents, product_data: { name: "Shipping" } } };
 }
 const session = await stripePost(
 "checkout/sessions",
 {
 mode: "payment",
 customer_email: buyerEmail,
 success_url: `${base}/checkout/success?item=${itemId}`,
 cancel_url: `${base}/checkout/cancel?item=${itemId}`,
 line_items,
 metadata: meta,
 payment_intent_data: { ...(appFee > 0 ? { application_fee_amount: appFee } : {}), metadata: meta },
 },
 pay.stripeAccountId, // direct charge on the seller's account
 );
 // Log the checkout attempt — if they don't complete, abandoned-cart nudges them.
 recordCheckoutAttempt({ storeSlug: seller.slug, email: buyerEmail, name: String(buyer.name || "") || null, itemId, itemTitle: item.title, itemImage: item.images?.[0] || null }).catch(() => {});
 return NextResponse.json({ ok: true, url: session.url });
 } catch (e) {
 await releaseReservation(itemId);
 return NextResponse.json({ error: e instanceof Error ? e.message : "Checkout failed." }, { status: 502 });
 }
}
