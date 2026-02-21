import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  getUserByStripeCustomerId,
  setMemberActive,
  setMemberCancelled,
} from "@/app/lib/membership-db";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
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
        const subscription = event.data.object as Stripe.Subscription;
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
        const invoice = event.data.object as Stripe.Invoice;
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
        // Ignore other events
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
