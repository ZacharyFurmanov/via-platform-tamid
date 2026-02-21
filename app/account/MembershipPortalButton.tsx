"use client";

import { useState } from "react";

export default function MembershipPortalButton() {
  const [loading, setLoading] = useState(false);

  async function handlePortal() {
    setLoading(true);
    try {
      const res = await fetch("/api/membership/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Portal error:", err);
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handlePortal}
      disabled={loading}
      className="shrink-0 text-center text-sm uppercase tracking-wide px-6 py-3 border border-black hover:bg-black hover:text-white transition disabled:opacity-50"
    >
      {loading ? "Redirecting..." : "Manage or Cancel"}
    </button>
  );
}
