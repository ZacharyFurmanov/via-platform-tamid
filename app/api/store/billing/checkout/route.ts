import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { storeContactEmails } from "@/app/lib/stores";

function getStoreSlugFromEmail(email: string): string | null {
 for (const [slug, storeEmail] of Object.entries(storeContactEmails)) {
 if (storeEmail && storeEmail.toLowerCase() === email.toLowerCase()) return slug;
 }
 return null;
}

function getBaseUrl(request: NextRequest) {
 const host = request.headers.get("host") || "vyaplatform.com";
 const proto = host.startsWith("localhost") ? "http" : "https";
 return `${proto}://${host}`;
}

async function stripePost(path: string, params: Record<string, string>) {
 const key = process.env.STRIPE_SECRET_KEY?.trim();
 if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
 const res = await fetch(`https://api.stripe.com/v1/${path}`, {
 method: "POST",
 headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
 body: new URLSearchParams(params).toString(),
 });
 const json = await res.json();
 if (!res.ok) throw new Error(json.error?.message || `Stripe error: ${res.status}`);
 return json;
}

// POST /api/store/billing/checkout — start a VYA Pro (store data layer) subscription.
export async function POST(request: NextRequest) {
 const session = await auth();
 if (!session?.user?.email) {
 return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 }
 const storeSlug = getStoreSlugFromEmail(session.user.email);
 if (!storeSlug) {
 return NextResponse.json({ error: "Not a registered store partner" }, { status: 403 });
 }

 const priceId = process.env.STRIPE_STORE_PRO_PRICE_ID?.trim();
 if (!priceId) {
 return NextResponse.json(
 { error: "Pro plan is not configured yet. Set STRIPE_STORE_PRO_PRICE_ID." },
 { status: 503 },
 );
 }

 try {
 const base = getBaseUrl(request);
 const checkout = await stripePost("checkout/sessions", {
 mode: "subscription",
 "line_items[0][price]": priceId,
 "line_items[0][quantity]": "1",
 customer_email: session.user.email,
 success_url: `${base}/store/dashboard?pro=success`,
 cancel_url: `${base}/store/dashboard?pro=cancelled`,
 "metadata[type]": "store_pro",
 "metadata[store_slug]": storeSlug,
 // Carry the slug onto the subscription so later subscription.* events can resolve the store.
 "subscription_data[metadata][type]": "store_pro",
 "subscription_data[metadata][store_slug]": storeSlug,
 });
 return NextResponse.json({ url: checkout.url });
 } catch (err) {
 const message = err instanceof Error ? err.message : String(err);
 console.error("[store/billing/checkout] error:", message);
 return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
 }
}
