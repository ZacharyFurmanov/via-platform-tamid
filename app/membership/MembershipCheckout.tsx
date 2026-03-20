"use client";

import { useState, useCallback, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export default function MembershipCheckout({ onCancel }: { onCancel: () => void }) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publishableKey) {
      setError("Stripe is not configured. Please contact support.");
    }
  }, []);

  const fetchClientSecret = useCallback(async () => {
    try {
      const res = await fetch("/api/membership/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.clientSecret) {
        setError(data.error || "Could not start checkout. Please try again.");
        return "";
      }
      return data.clientSecret;
    } catch {
      setError("Network error. Please try again.");
      return "";
    }
  }, []);

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <button
          onClick={onCancel}
          className="text-sm underline underline-offset-2 text-black/60"
        >
          Go back
        </button>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-red-600 mb-4">Payment system unavailable. Please contact support.</p>
        <button onClick={onCancel} className="text-sm underline underline-offset-2 text-black/60">Go back</button>
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
        <button
          onClick={onCancel}
          className="text-sm underline underline-offset-2 text-black/60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
