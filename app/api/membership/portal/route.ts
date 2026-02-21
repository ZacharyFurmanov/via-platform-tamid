import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getUserByEmail } from "@/app/lib/membership-db";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://theviaplatform.com";

async function stripePost(path: string, params: Record<string, string>) {
  const key = process.env.STRIPE_SECRET_KEY;
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

  try {
    const user = await getUserByEmail(session.user.email);
    if (!user?.stripe_customer_id) {
      return NextResponse.json({ error: "No Stripe customer found" }, { status: 400 });
    }

    const portalSession = await stripePost("billing_portal/sessions", {
      customer: user.stripe_customer_id,
      return_url: `${BASE_URL}/account`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Stripe portal error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
