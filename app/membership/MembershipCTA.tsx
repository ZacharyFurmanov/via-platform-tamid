"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MembershipCTA({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleJoin() {
    if (!isLoggedIn) {
      router.push("/login?callbackUrl=/membership");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/membership/checkout", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        console.error("Checkout API error:", data);
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Could not start checkout. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleJoin}
        disabled={loading}
        className="w-full text-sm uppercase tracking-wide px-8 py-3 bg-black text-white hover:bg-black/85 transition disabled:opacity-50"
      >
        {loading ? "Redirecting..." : "Join First Look — $10/month"}
      </button>
      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}
