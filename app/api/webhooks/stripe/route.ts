import { NextRequest, NextResponse } from "next/server";
import {
  getUserByStripeCustomerId,
  setMemberActive,
  setMemberCancelled,
} from "@/app/lib/membership-db";

// Verify Stripe webhook signature without the SDK
async function verifyStripeSignature(
  body: string,
  sig: string,
  secret: string
): Promise<boolean> {
  const parts = sig.split(",").reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split("=");
    acc[k] = v;
    return acc;
  }, {});

  const timestamp = parts["t"];
  const signature = parts["v1"];
  if (!timestamp || !signature) return false;

  const payload = `${timestamp}.${body}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const expected = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return expected === signature;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  const valid = await verifyStripeSignature(body, sig, secret);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode !== "subscription") break;

        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        const user = await getUserByStripeCustomerId(customerId);
        if (!user) {
          console.error("Webhook: no user found for Stripe customer", customerId);
          break;
        }

        await setMemberActive(user.id, customerId, subscriptionId);
        console.log(`Membership activated for user ${user.id}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        const user = await getUserByStripeCustomerId(customerId);
        if (!user) {
          console.error("Webhook: no user found for Stripe customer", customerId);
          break;
        }

        await setMemberCancelled(user.id);
        console.log(`Membership cancelled for user ${user.id}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer as string;

        const user = await getUserByStripeCustomerId(customerId);
        if (!user) {
          console.error("Webhook: no user found for Stripe customer", customerId);
          break;
        }

        await setMemberCancelled(user.id);
        console.log(`Membership cancelled due to payment failure for user ${user.id}`);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
