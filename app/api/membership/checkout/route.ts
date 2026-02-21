import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getUserByEmail, saveStripeCustomerId } from "@/app/lib/membership-db";

function getBaseUrl() {
  const url = process.env.NEXT_PUBLIC_BASE_URL || "https://theviaplatform.com";
  if (url.startsWith("http")) return url;
  return `https://${url}`;
}

async function stripePost(path: string, params: Record<string, string>) {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");

  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params).toString(),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || `Stripe error: ${res.status}`);
  }
  return json;
}

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
      const customer = await stripePost("customers", {
        email,
        "metadata[userId]": userId,
      });
      stripeCustomerId = customer.id as string;
      await saveStripeCustomerId(userId, stripeCustomerId);
    }

    // Create embedded Checkout session
    const checkoutSession = await stripePost("checkout/sessions", {
      mode: "subscription",
      customer: stripeCustomerId as string,
      "line_items[0][price]": process.env.STRIPE_PRICE_ID!,
      "line_items[0][quantity]": "1",
      ui_mode: "embedded",
      allow_promotion_codes: "true",
      return_url: `${getBaseUrl()}/account/insider?membership=success`,
    });

    return NextResponse.json({ clientSecret: checkoutSession.client_secret });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Stripe checkout error:", message);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }
}
