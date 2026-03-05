import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { createSourcingRequest } from "@/app/lib/sourcing-db";

const SOURCING_FEE_CENTS = 2000; // $20.00

function getBaseUrl(request: NextRequest) {
  const host = request.headers.get("host") || "theviaplatform.com";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
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
  if (!res.ok) throw new Error(json.error?.message || `Stripe error: ${res.status}`);
  return json;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { imageUrl, description, priceMin, priceMax, condition, size, deadline } = body;

    if (!description || !priceMin || !priceMax || !condition || !deadline) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create Stripe payment session first to get session ID
    const checkoutSession = await stripePost("checkout/sessions", {
      mode: "payment",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][product_data][name]": "VIA Sourcing Request",
      "line_items[0][price_data][product_data][description]": "Refundable if no match is found within 14 business days.",
      "line_items[0][price_data][unit_amount]": String(SOURCING_FEE_CENTS),
      "line_items[0][quantity]": "1",
      ui_mode: "embedded",
      customer_email: session.user.email,
      return_url: `${getBaseUrl(request)}/account/sourcing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      "metadata[type]": "sourcing_request",
    });

    // Save request to DB with pending_payment status
    await createSourcingRequest({
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name ?? null,
      imageUrl: imageUrl ?? null,
      description,
      priceMin: Number(priceMin),
      priceMax: Number(priceMax),
      condition,
      size: size || null,
      deadline,
      stripeSessionId: checkoutSession.id,
    });

    return NextResponse.json({ clientSecret: checkoutSession.client_secret });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Sourcing checkout error:", message);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
  }
}
