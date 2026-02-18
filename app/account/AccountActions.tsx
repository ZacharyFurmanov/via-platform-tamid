"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export default function AccountActions({
  notificationsEnabled: initialEnabled,
  initialPhone,
}: {
  notificationsEnabled: boolean;
  initialPhone: string;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState(initialPhone);
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneMessage, setPhoneMessage] = useState("");

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

  async function savePhone() {
    setPhoneSaving(true);
    setPhoneMessage("");
    try {
      const res = await fetch("/api/account/phone", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (res.ok) {
        const data = await res.json();
        setPhone(data.phone);
        setPhoneMessage("Phone saved");
      } else {
        const data = await res.json();
        setPhoneMessage(data.error || "Failed to save");
      }
    } catch {
      setPhoneMessage("Failed to save");
    } finally {
      setPhoneSaving(false);
    }
  }

  return (
    <div>
      <h2 className="font-serif text-2xl mb-8">Settings</h2>

      <div className="space-y-6">
        {/* Phone Number */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-neutral-100">
          <div>
            <h3 className="text-sm font-medium mb-1">Phone Number</h3>
            <p className="text-xs text-black/50">So friends can find you on VIA</p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +1 555 123 4567"
              className="border border-neutral-300 px-3 py-2 text-sm w-48 outline-none focus:border-black transition"
            />
            <button
              onClick={savePhone}
              disabled={phoneSaving}
              className="text-sm uppercase tracking-wide px-4 py-2 border border-black hover:bg-black hover:text-white transition disabled:opacity-50"
            >
              {phoneSaving ? "Saving..." : "Save"}
            </button>
          </div>
          {phoneMessage && (
            <p className={`text-xs ${phoneMessage === "Phone saved" ? "text-green-600" : "text-red-600"}`}>
              {phoneMessage}
            </p>
          )}
        </div>

        {/* Notifications */}
        <div className="flex items-center justify-between pb-6 border-b border-neutral-100">
          <div>
            <h3 className="text-sm font-medium mb-1">Email Notifications</h3>
            <p className="text-xs text-black/50">Get notified when your favorites are trending</p>
          </div>
          <button
            onClick={toggleNotifications}
            disabled={saving}
            className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
              enabled ? "bg-black" : "bg-neutral-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Sign Out */}
        <div className="pt-2">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-sm uppercase tracking-wide text-black/50 hover:text-red-600 transition"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
