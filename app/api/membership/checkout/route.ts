import { NextResponse } from "next/server";
import Stripe from "stripe";
import { auth } from "@/app/lib/auth";
import { getUserByEmail, saveStripeCustomerId } from "@/app/lib/membership-db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://theviaplatform.com";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const email = session.user.email;

  try {
    // Get or create Stripe customer
    const user = await getUserByEmail(email);
    let stripeCustomerId = user?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { userId },
      });
      stripeCustomerId = customer.id;
      await saveStripeCustomerId(userId, stripeCustomerId);
    }

    // Create Stripe Checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      success_url: `${BASE_URL}/account?membership=success`,
      cancel_url: `${BASE_URL}/membership`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
