"use client";

import { useState } from "react";

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function WebhookUrlInput() {
  const [storeName, setStoreName] = useState("");
  const slug = toSlug(storeName);
  const webhookUrl = `https://vyaplatform.com/api/webhooks/shopify?store=${slug || "your-store-slug"}`;

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-[#5D0F17] mb-1.5">
          Your store name
        </label>
        <input
          type="text"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          placeholder="e.g. Carroll Street Vintage"
          className="w-full border border-[#5D0F17]/25 px-3 py-2 text-sm text-[#5D0F17] placeholder:text-[#5D0F17]/30 focus:border-[#5D0F17] focus:outline-none bg-white"
        />
        {slug && (
          <p className="text-xs text-[#5D0F17]/50 mt-1">
            Store slug: <span className="font-mono">{slug}</span>
          </p>
        )}
      </div>
      <div className="bg-[#5D0F17]/10 p-3 font-mono text-sm break-all select-all">
        {webhookUrl}
      </div>
      {slug && (
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(webhookUrl).catch(() => {});
          }}
          className="text-xs text-[#5D0F17]/60 underline hover:text-[#5D0F17] transition"
        >
          Copy URL
        </button>
      )}
    </div>
  );
}
