"use client";

import { useState, useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function MembershipCheckout({ onCancel }: { onCancel: () => void }) {
  const [error, setError] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async () => {
    const res = await fetch("/api/membership/checkout", { method: "POST" });
    const data = await res.json();
    if (!res.ok || !data.clientSecret) {
      setError(data.error || "Could not start checkout. Please try again.");
      return "";
    }
    return data.clientSecret;
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
