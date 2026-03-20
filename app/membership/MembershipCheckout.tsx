"use client";

import { useState, useCallback } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";

export default function MembershipCheckout({ onCancel }: { onCancel: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  const fetchClientSecret = useCallback(async () => {
    try {
      const res = await fetch("/api/membership/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.clientSecret) {
        setError(data.error || "Could not start checkout. Please try again.");
        return "";
      }
      if (data.publishableKey && !stripePromise) {
        setStripePromise(loadStripe(data.publishableKey));
      }
      return data.clientSecret;
    } catch {
      setError("Network error. Please try again.");
      return "";
    }
  }, [stripePromise]);

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <button onClick={onCancel} className="text-sm underline underline-offset-2 text-black/60">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div>
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ fetchClientSecret }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
      <div className="mt-4 text-center">
        <button onClick={onCancel} className="text-sm underline underline-offset-2 text-black/60">
          Cancel
        </button>
      </div>
    </div>
  );
}
