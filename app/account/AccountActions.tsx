"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export default function AccountActions({
  notificationsEnabled: initialEnabled,
}: {
  notificationsEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);

  async function toggleNotifications() {
    setSaving(true);
    const newValue = !enabled;
    setEnabled(newValue);

    try {
      const res = await fetch("/api/account/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationEmailsEnabled: newValue }),
      });
      if (!res.ok) setEnabled(!newValue); // revert
    } catch {
      setEnabled(!newValue); // revert
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-2xl mb-4">Settings</h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <button
            onClick={toggleNotifications}
            disabled={saving}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              enabled ? "bg-black" : "bg-neutral-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
          <span className="text-sm">
            Email me when my favorites are trending
          </span>
        </label>
      </div>

      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="text-sm uppercase tracking-wide text-black/50 hover:text-black transition"
      >
        Sign Out
      </button>
    </div>
  );
}
