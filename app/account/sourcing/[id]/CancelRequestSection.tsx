"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CANCEL_WINDOW_DAYS = 21;

export default function CancelRequestSection({
  requestId,
  createdAt,
}: {
  requestId: string;
  createdAt: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const daysElapsed = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  const daysLeft = Math.max(0, Math.floor(CANCEL_WINDOW_DAYS - daysElapsed));
  const withinWindow = daysElapsed <= CANCEL_WINDOW_DAYS;

  if (!withinWindow) return null;

  async function handleCancel() {
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch(`/api/sourcing/${requestId}/cancel`, { method: "POST" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Something went wrong. Please try again.");
        setConfirming(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setConfirming(false);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="mt-8 border border-[#5D0F17]/15 p-5">
      <p className="text-[10px] uppercase tracking-[0.15em] text-[#5D0F17]/40 mb-3">
        Cancel Request
      </p>
      <p className="text-sm text-[#5D0F17]/60 leading-relaxed mb-4">
        You can cancel this request and receive a full $20 refund.{" "}
        {daysLeft > 0
          ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining to cancel.`
          : "Last day to cancel."}
      </p>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="text-xs uppercase tracking-widest px-4 py-2.5 border border-[#5D0F17]/30 hover:border-[#5D0F17] transition text-[#5D0F17]/70 hover:text-[#5D0F17]"
        >
          Cancel Request
        </button>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex-1 py-2.5 text-xs uppercase tracking-widest bg-[#5D0F17] text-[#F7F3EA] disabled:opacity-50 transition-opacity"
          >
            {cancelling ? "Cancelling…" : "Yes, Cancel & Refund $20"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={cancelling}
            className="flex-1 py-2.5 text-xs uppercase tracking-widest border border-[#5D0F17]/20 hover:border-[#5D0F17] transition disabled:opacity-50"
          >
            Keep Request
          </button>
        </div>
      )}
    </div>
  );
}
