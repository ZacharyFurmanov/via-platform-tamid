"use client";

import { useState, useCallback, useEffect } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";

export default function MembershipCheckout({ onCancel }: { onCancel: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Fetch clientSecret + publishableKey on mount — avoids relying on NEXT_PUBLIC_ env vars
  useEffect(() => {
    fetch("/api/membership/checkout", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (!data.clientSecret || !data.publishableKey) {
          setError(data.error || "Could not start checkout. Please try again.");
          return;
        }
        setStripePromise(loadStripe(data.publishableKey));
        setClientSecret(data.clientSecret);
      })
      .catch(() => setError("Network error. Please try again."));
  }, []);

  const fetchClientSecret = useCallback(async () => clientSecret ?? "", [clientSecret]);

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

  if (!stripePromise || !clientSecret) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-[#5D0F17]/40">Loading checkout…</p>
      </div>
    );
  }

  return (
    <div>
      <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
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
