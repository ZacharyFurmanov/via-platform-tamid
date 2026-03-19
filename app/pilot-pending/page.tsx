"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://vyaplatform.com";

export default function PilotPendingPage() {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referral-status")
      .then((r) => r.json())
      .then((data) => {
        if (data.referralCode) setReferralCode(data.referralCode);
        if (typeof data.referralCount === "number") setReferralCount(data.referralCount);
      })
      .catch(() => {});
  }, []);

  const referralLink = referralCode
    ? `${BASE_URL}/register?ref=${referralCode}`
    : null;

  function copyLink() {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="fixed inset-0 z-[200] flex">
      {/* Left — solid red */}
      <div className="hidden lg:block lg:w-1/2 bg-[#5D0F17]" />

      {/* Right — content */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col overflow-y-auto">
        <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 py-12 max-w-xl w-full mx-auto text-center">
          <div className="flex items-start gap-1.5 mb-10 justify-center">
            <img src="/vya-logo.png" alt="VYA" className="h-7 w-auto" />
            <span className="text-[9px] uppercase tracking-[0.15em] text-[#5D0F17]/60 font-sans">pilot</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl text-[#5D0F17] mb-4">
            You&apos;re on the list.
          </h1>

          <p className="text-sm text-[#5D0F17]/60 leading-relaxed mb-3">
            You&apos;re added to the wait. We&apos;ll let you know when you can start shopping our pilot.
          </p>

          <p className="text-sm text-[#5D0F17]/40 leading-relaxed mb-8">
            Refer friends to move up faster — the more friends you refer, the sooner you&apos;re in.
          </p>

          {/* Giveaway banner */}
          <div className="bg-[#5D0F17] px-6 py-5 mb-6 text-left">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#F7F3EA]/50 mb-1">Giveaway</p>
            <p className="text-base font-serif text-[#F7F3EA] mb-1">Win a $1,000 vintage shopping spree</p>
            <p className="text-xs text-[#F7F3EA]/60 leading-relaxed">
              Invite 2 friends who join the waitlist using your link to be officially entered.
            </p>
            {referralCount >= 2 && (
              <p className="text-xs text-[#F7F3EA] mt-3 font-serif italic">
                ✓ You&apos;re entered!
              </p>
            )}
          </div>

          {/* Referral section */}
          {referralCode && (
            <div className="bg-[#F7F3EA] px-6 py-6 mb-8 text-left">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#5D0F17]/50 mb-3">
                Your referral link
              </p>

              {/* Progress */}
              <div className="flex flex-col gap-2 mb-4">
                {[
                  { threshold: 1, days: 5, label: "1 friend" },
                  { threshold: 2, days: 4, label: "2 friends" },
                  { threshold: 3, days: 3, label: "3+ friends" },
                ].map(({ threshold, days, label }) => (
                  <div key={threshold} className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full border flex-shrink-0 ${
                        referralCount >= threshold
                          ? "bg-[#5D0F17] border-[#5D0F17]"
                          : "border-[#5D0F17]/30 bg-transparent"
                      }`}
                    />
                    <p className="text-xs text-[#5D0F17]/60">
                      {referralCount >= threshold
                        ? `${label} referred — ${days}-day wait unlocked`
                        : `${label} = ${days}-day wait`}
                    </p>
                  </div>
                ))}
              </div>

              {/* Link + copy */}
              <div className="flex items-stretch border border-[#5D0F17]/20">
                <p className="flex-1 px-3 py-2.5 text-xs text-[#5D0F17]/70 truncate bg-white">
                  {referralLink}
                </p>
                <button
                  onClick={copyLink}
                  className="px-4 border-l border-[#5D0F17]/20 text-[#5D0F17]/50 hover:text-[#5D0F17] hover:bg-[#5D0F17]/5 transition flex items-center gap-1.5 text-xs uppercase tracking-wide"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
            <Link
              href="/for-stores"
              className="px-6 py-3 border border-[#5D0F17]/20 text-sm text-[#5D0F17] hover:border-[#5D0F17] transition"
            >
              Partner with VYA
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="px-6 py-3 text-sm text-[#5D0F17]/40 hover:text-[#5D0F17] transition underline"
            >
              Sign out
            </button>
          </div>

          <p className="text-xs text-[#5D0F17]/30">
            Questions?{" "}
            <a href="mailto:partnerships@theviaplatform.com" className="underline">
              partnerships@theviaplatform.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
