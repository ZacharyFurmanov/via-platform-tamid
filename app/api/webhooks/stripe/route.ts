import { NextRequest, NextResponse } from "next/server";
import {
  getUserByStripeCustomerId,
  setMemberActive,
  setMemberCancelled,
} from "@/app/lib/membership-db";
import { sendMembershipConfirmation, sendSourcingConfirmationToUser, sendSourcingRequestToStores } from "@/app/lib/email";
import { markSourcingRequestPaid, getSourcingRequestBySession } from "@/app/lib/sourcing-db";
import { getAllStoreEmails } from "@/app/lib/stores";

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

        // Handle sourcing request payment
        if (session.mode === "payment" && (session.metadata as Record<string, string>)?.type === "sourcing_request") {
          const stripeSessionId = session.id as string;
          const request = await markSourcingRequestPaid(stripeSessionId);
          if (request) {
            const details = {
              userEmail: request.userEmail,
              userName: request.userName,
              description: request.description,
              priceMin: request.priceMin,
              priceMax: request.priceMax,
              condition: request.condition,
              size: request.size,
              deadline: request.deadline,
              imageUrl: request.imageUrl,
            };
            // Send confirmation to customer
            try {
              await sendSourcingConfirmationToUser(details);
            } catch (err) {
              console.error("Failed to send sourcing confirmation to user:", err);
            }
            // Send notification to VYA + all stores
            try {
              await sendSourcingRequestToStores(getAllStoreEmails(), details);
            } catch (err) {
              console.error("Failed to send sourcing request to stores:", err);
            }
          } else {
            // May already be processed — look it up for logging
            const existing = await getSourcingRequestBySession(stripeSessionId).catch(() => null);
            console.log(`Sourcing webhook: session ${stripeSessionId} — status: ${existing?.status ?? "not found"}`);
          }
          break;
        }

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

        // Send confirmation email
        try {
          await sendMembershipConfirmation(user.email);
        } catch (emailErr) {
          console.error("Failed to send membership confirmation email:", emailErr);
        }
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
        // Do not cancel immediately — Stripe will retry the payment automatically
        // (3–4 attempts over several days). Membership is only revoked when
        // customer.subscription.deleted fires after all retries are exhausted.
        const invoice = event.data.object;
        console.log(`Payment failed for customer ${invoice.customer} — awaiting Stripe retry logic`);
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
