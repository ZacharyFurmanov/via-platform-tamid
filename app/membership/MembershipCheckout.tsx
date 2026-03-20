"use client";

import { useCallback, useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  (process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "").trim()
);

export default function MembershipCheckout({ onCancel }: { onCancel: () => void }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/membership/checkout", { method: "POST" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          setError("Could not start checkout. Please try again.");
        }
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

  if (!clientSecret) {
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
