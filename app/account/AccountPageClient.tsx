"use client";

import { useState } from "react";
import Link from "next/link";
import InviteButton from "./InviteButton";
import AccountActions from "./AccountActions";
import SavesTab from "./tabs/SavesTab";
import CollectionsTab from "./tabs/CollectionsTab";
import StoresTab from "./tabs/StoresTab";
import SourcingTab from "./tabs/SourcingTab";
import type { FavoriteProductEntry } from "@/app/lib/favorites-db";
import type { SourcingRequest } from "@/app/lib/sourcing-db";

type Tab = "favorites" | "collections" | "stores" | "sourcing" | "friends" | "settings";

type Props = {
  userId: string;
  name: string | null;
  email: string | null;
  image: string | null;
  favoritesCount: number;
  storesCount: number;
  favProducts: FavoriteProductEntry[];
  sourcingRequests: SourcingRequest[];
  notificationsEnabled: boolean;
  initialPhone: string;
  referralCode?: string | null;
};

export default function AccountPageClient({
  userId,
  name,
  email,
  image,
  favoritesCount,
  storesCount,
  favProducts,
  sourcingRequests,
  notificationsEnabled,
  initialPhone,
  referralCode,
}: Props) {
  const [tab, setTab] = useState<Tab>("favorites");

  const handle = email ? `@${email.split("@")[0]}` : "@me";
  const displayName = name || email?.split("@")[0] || "My Account";
  const initials = (name?.[0] || email?.[0] || "?").toUpperCase();

  const tabs: { key: Tab; label: string }[] = [
    { key: "favorites", label: "Favorites" },
    { key: "collections", label: "Collections" },
    { key: "stores", label: "Stores" },
    { key: "sourcing", label: "Sourcing" },
    { key: "friends", label: "Friends" },
    { key: "settings", label: "Settings" },
  ];

  return (
    <main className="bg-[#F7F3EA] min-h-screen text-[#5D0F17]">
      {/* ── Profile Header ── */}
      <div className="max-w-2xl lg:max-w-6xl mx-auto px-6 pt-8 pb-0">
        {/* Handle */}
        <p className="text-sm text-[#5D0F17]/50 mb-5">{handle}</p>

        {/* Name + Avatar row */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-3xl font-serif text-[#5D0F17] mb-1">{displayName}</h1>
            <div className="flex items-center gap-3 text-sm text-[#5D0F17]/60">
              <span>{favoritesCount} Favorites</span>
              <span className="text-[#5D0F17]/20">|</span>
              <span>{storesCount} Stores</span>
            </div>
          </div>
          <div className="w-16 h-16 rounded-full bg-[#D8CABD]/50 flex items-center justify-center overflow-hidden shrink-0">
            {image ? (
              <img src={image} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-serif text-[#5D0F17]/50">{initials}</span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-5 mb-6">
          <Link
            href="/account/settings"
            className="flex-1 text-center text-xs uppercase tracking-[0.15em] py-2.5 border border-[#5D0F17]/30 text-[#5D0F17] hover:border-[#5D0F17] transition"
          >
            Edit Profile
          </Link>
          <div className="flex-1">
            <InviteButton label="Share Profile" referralCode={referralCode} />
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-0 border-b border-[#5D0F17]/10 overflow-x-auto scrollbar-hide -mx-6 px-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 px-4 py-3 text-sm font-medium transition-colors relative ${
                tab === t.key
                  ? "text-[#5D0F17]"
                  : "text-[#5D0F17]/40 hover:text-[#5D0F17]/70"
              }`}
            >
              {t.label}
              {tab === t.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5D0F17]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="max-w-2xl lg:max-w-6xl mx-auto px-6 py-8">
        {tab === "favorites" && <SavesTab userId={userId} favProducts={favProducts} />}
        {tab === "collections" && <CollectionsTab userId={userId} />}
        {tab === "stores" && <StoresTab userId={userId} />}
        {tab === "sourcing" && <SourcingTab requests={sourcingRequests} />}
        {tab === "friends" && (
          <div className="flex flex-col items-center gap-6 py-8">
            <div className="w-full max-w-sm">
              <InviteButton label="Invite a Friend to VYA" referralCode={referralCode} />
            </div>
            <p className="text-sm text-[#5D0F17]/50">or</p>
            <Link
              href="/account/friends"
              className="inline-block border border-[#5D0F17] text-[#5D0F17] px-8 py-3 text-xs uppercase tracking-[0.15em] hover:bg-[#5D0F17] hover:text-[#F7F3EA] transition"
            >
              View Friends &amp; Activity
            </Link>
          </div>
        )}
        {tab === "settings" && (
          <div className="space-y-8">
            <section className="border border-[#5D0F17]/15 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div>
                <h3 className="font-serif text-base mb-1">Invite a Friend</h3>
                <p className="text-xs text-[#5D0F17]/50 leading-relaxed">
                  Know someone who&apos;d love VYA? Share the link and shop together.
                </p>
              </div>
              <div className="shrink-0 sm:w-44">
                <InviteButton referralCode={referralCode} />
              </div>
            </section>

            <section className="border border-[#5D0F17]/15 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div>
                <h3 className="font-serif text-base mb-1">Have feedback for us?</h3>
                <p className="text-xs text-[#5D0F17]/50 leading-relaxed">
                  Submit your recommendations — we&apos;d love to hear from you.
                </p>
              </div>
              <div className="shrink-0 sm:w-44">
                <a
                  href="https://form.typeform.com/to/ssrEgHZ1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full border border-[#5D0F17] text-[#5D0F17] text-xs uppercase tracking-[0.15em] py-3 text-center hover:bg-[#5D0F17] hover:text-[#F7F3EA] transition"
                >
                  Send Feedback
                </a>
              </div>
            </section>

            <AccountActions notificationsEnabled={notificationsEnabled} initialPhone={initialPhone} />
          </div>
        )}
      </div>
    </main>
  );
}
