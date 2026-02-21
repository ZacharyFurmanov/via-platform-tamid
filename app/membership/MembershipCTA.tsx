"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MembershipCTA({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleJoin() {
    if (!isLoggedIn) {
      router.push("/login?callbackUrl=/membership");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/membership/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleJoin}
      disabled={loading}
      className="w-full text-sm uppercase tracking-wide px-8 py-3 bg-black text-white hover:bg-black/85 transition disabled:opacity-50"
    >
      {loading ? "Redirecting..." : "Join First Look — $10/month"}
    </button>
  );
}
