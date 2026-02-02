"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Phase = "waitlist" | "invite" | "confirmation";

interface StatusData {
  referralCount: number;
  friend1Entered: boolean;
  friend2Entered: boolean;
  isComplete: boolean;
}

function WaitlistContent() {
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref");

  const [phase, setPhase] = useState<Phase>("waitlist");
  const [email, setEmail] = useState("");
  const [phone1, setPhone1] = useState("");
  const [phone2, setPhone2] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [pendingPhone, setPendingPhone] = useState("");

  // Check for returning user
  useEffect(() => {
    const storedCode = localStorage.getItem("via_giveaway_code");
    const storedEmail = localStorage.getItem("via_giveaway_email");
    const entered = localStorage.getItem("via_giveaway_entered");

    if (entered && storedCode && storedEmail) {
      setReferralCode(storedCode);
      setEmail(storedEmail);
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://theviaplatform.com";
      setReferralLink(`${baseUrl}/waitlist?ref=${storedCode}`);
      setPhase("confirmation");

      fetch(`/api/giveaway/status/${storedCode}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) setStatus(data);
        })
        .catch(() => {});
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setErrorMsg("");
    setIsSubmitting(true);

    try {
      // Step 1: Join waitlist
      const waitlistRes = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "waitlist" }),
      });

      if (!waitlistRes.ok) {
        const data = await waitlistRes.json();
        // If already on waitlist, that's fine — continue to giveaway entry
        if (!data.error?.includes("already")) {
          setErrorMsg(data.error || "Something went wrong.");
          return;
        }
      }

      // Step 2: Auto-enter giveaway
      const giveawayRes = await fetch("/api/giveaway/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), refCode }),
      });

      const giveawayData = await giveawayRes.json();

      if (!giveawayRes.ok) {
        setErrorMsg(giveawayData.error || "Something went wrong.");
        return;
      }

      // Store giveaway info
      setReferralCode(giveawayData.referralCode);
      setReferralLink(giveawayData.referralLink);
      localStorage.setItem("via_giveaway_entered", "true");
      localStorage.setItem("via_giveaway_code", giveawayData.referralCode);
      localStorage.setItem("via_giveaway_email", email.trim().toLowerCase());

      setPhase("invite");
    } catch {
      setErrorMsg("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendInvites = async () => {
    if (phone1 || phone2) {
      try {
        await fetch("/api/giveaway/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ referralCode, phone1, phone2 }),
        });
      } catch {
        // Non-blocking
      }
    }

    const message = `Check out VIA — curated vintage & resale. Enter the giveaway to win a $1,000 shopping spree: ${referralLink}`;
    const first = phone1.trim() || phone2.trim();
    const second = phone1.trim() && phone2.trim() ? phone2.trim() : "";

    if (first) {
      window.location.href = `sms:${first}?&body=${encodeURIComponent(message)}`;
    }

    if (second) {
      setPendingPhone(second);
    } else {
      goToConfirmation();
    }
  };

  const handleSendSecond = () => {
    const message = `Check out VIA — curated vintage & resale. Enter the giveaway to win a $1,000 shopping spree: ${referralLink}`;
    window.location.href = `sms:${pendingPhone}?&body=${encodeURIComponent(message)}`;
    setPendingPhone("");
    goToConfirmation();
  };

  const goToConfirmation = async () => {
    setPhase("confirmation");
    try {
      const res = await fetch(`/api/giveaway/status/${referralCode}`);
      const data = await res.json();
      if (!data.error) setStatus(data);
    } catch {
      // Non-blocking
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      {/* Hero background image */}
      <div className="absolute inset-0">
        <Image
          src="/hero-v3.jpeg"
          alt="VIA curated vintage"
          fill
          priority
          className="object-cover object-top md:object-center"
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-full flex flex-col justify-between px-6 sm:px-16 py-10 sm:py-16 text-white">
        {/* Main Content */}
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-xl text-left">

            {/* Phase: Waitlist */}
            {phase === "waitlist" && (
              <div className="animate-[fadeIn_0.6s_ease-out]">
                <p className="text-[12px] sm:text-[17px] font-semibold uppercase tracking-[0.3rem] sm:tracking-[0.5rem] mb-6 sm:mb-8">
                  Coming Soon
                </p>

                <Image
                  src="/via-logo-white.png"
                  alt="VIA"
                  width={990}
                  height={492}
                  className="w-[160px] sm:w-[240px] h-auto mb-6 sm:mb-8 -ml-7 sm:-ml-10"
                  priority
                />

                <p className="text-[15px] sm:text-[17px] leading-[1.9] sm:leading-[2] font-light tracking-normal sm:tracking-wide mb-10 sm:mb-12">
                  VIA lets you shop independent resale and vintage stores across the
                  country, all in one place. Browse multiple stores at once and
                  discover unique pieces you won&apos;t find anywhere else.
                </p>

                <form onSubmit={handleSubmit}>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setErrorMsg("");
                      }}
                      placeholder="Enter your email"
                      required
                      className="w-full sm:flex-1 px-5 h-12 sm:h-14 bg-transparent border border-neutral-700 text-white placeholder-neutral-400 text-[14px] sm:text-[15px] tracking-wide outline-none focus:border-neutral-400 transition-colors font-light"
                      disabled={isSubmitting}
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting || !email.trim()}
                      className="h-12 sm:h-14 px-6 sm:px-7 bg-white text-black text-[11px] sm:text-[12px] uppercase tracking-[0.25rem] sm:tracking-[0.4rem] font-semibold rounded-full hover:scale-[1.04] transition-transform disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isSubmitting ? "Joining..." : "Join the wait"}
                    </button>
                  </div>

                  {errorMsg && (
                    <p className="text-red-400 text-sm mt-3 sm:mt-4 tracking-wide">
                      {errorMsg}
                    </p>
                  )}
                </form>

                <p className="text-white text-[15px] sm:text-[17px] mt-6 sm:mt-8 font-light tracking-wide leading-relaxed">
                  Join the waitlist to enter our giveaway. Invite 2 friends to sign up and you&apos;re officially entered to win a $1,000 shopping spree on VIA.
                </p>
              </div>
            )}

            {/* Phase: Invite */}
            {phase === "invite" && (
              <div className="animate-[fadeIn_0.4s_ease-out]">
                {pendingPhone ? (
                  <>
                    <p className="text-[14px] sm:text-[17px] uppercase tracking-[0.25em] text-white mb-4 sm:mb-5">
                      Enter to Win a $1,000 Giveaway Shopping Spree on Us
                    </p>

                    <h2 className="text-3xl sm:text-5xl font-serif mb-4 sm:mb-5 leading-tight">
                      Now Send to<br />Friend 2
                    </h2>

                    <p className="text-white mb-8 sm:mb-10 text-[15px] sm:text-lg font-light leading-relaxed max-w-md">
                      Tap below to open a message to your second friend. They need to sign up for you to be entered.
                    </p>

                    <button
                      onClick={handleSendSecond}
                      className="w-full bg-white text-black py-4 text-sm uppercase tracking-wide hover:bg-neutral-200 transition font-medium"
                    >
                      Send to Friend 2
                    </button>

                    <button
                      onClick={() => {
                        setPendingPhone("");
                        goToConfirmation();
                      }}
                      className="mt-3 text-sm text-white/70 hover:text-white transition py-2 block mx-auto"
                    >
                      Skip for now
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-[14px] sm:text-[17px] uppercase tracking-[0.25em] text-white mb-4 sm:mb-5">
                      Enter to Win a $1,000 Giveaway Shopping Spree on Us
                    </p>

                    <h2 className="text-3xl sm:text-5xl font-serif mb-4 sm:mb-5 leading-tight">
                      Invite Two Friends<br />to Sign Up
                    </h2>

                    <p className="text-white mb-8 sm:mb-10 text-[15px] sm:text-lg font-light leading-relaxed max-w-md">
                      Enter your 2 friends&apos; phone numbers below so we can send them an invite. Both friends need to sign up for you to be officially entered in the giveaway.
                    </p>

                    {/* Phone inputs */}
                    <div className="space-y-3 mb-6">
                      <input
                        type="tel"
                        value={phone1}
                        onChange={(e) => setPhone1(e.target.value)}
                        placeholder="Friend 1's phone number"
                        className="w-full px-5 py-3 bg-transparent border border-white/30 text-white placeholder-white/60 text-[15px] focus:outline-none focus:border-white/60 transition-colors font-light"
                      />
                      <input
                        type="tel"
                        value={phone2}
                        onChange={(e) => setPhone2(e.target.value)}
                        placeholder="Friend 2's phone number"
                        className="w-full px-5 py-3 bg-transparent border border-white/30 text-white placeholder-white/60 text-[15px] focus:outline-none focus:border-white/60 transition-colors font-light"
                      />
                    </div>

                    {/* Copy link */}
                    <div className="mb-6">
                      <p className="text-sm text-white/70 mb-2 font-light">Or copy your unique link</p>
                      <div className="flex items-center border border-white/30 overflow-hidden">
                        <span className="flex-1 px-3 py-2.5 text-xs text-white/70 truncate text-left font-light">
                          {referralLink}
                        </span>
                        <button
                          onClick={handleCopyLink}
                          className="flex-shrink-0 px-4 py-2.5 bg-white text-black text-xs uppercase tracking-wide hover:bg-neutral-200 transition"
                        >
                          {copied ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleSendInvites}
                      className="w-full bg-white text-black py-4 text-sm uppercase tracking-wide hover:bg-neutral-200 transition font-medium"
                    >
                      Send Invites
                    </button>

                    <button
                      onClick={() => goToConfirmation()}
                      className="mt-3 text-sm text-white/70 hover:text-white transition py-2 block mx-auto"
                    >
                      Skip for now
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Phase: Confirmation */}
            {phase === "confirmation" && (
              <div className="animate-[fadeIn_0.4s_ease-out]">
                <p className="text-[14px] sm:text-[17px] uppercase tracking-[0.25em] text-white mb-4 sm:mb-5">
                  VIA Giveaway
                </p>

                <h2 className="text-3xl sm:text-5xl font-serif mb-4 sm:mb-5 leading-tight">
                  You&apos;re in the queue
                </h2>

                <p className="text-white mb-8 sm:mb-10 text-[15px] sm:text-lg font-light leading-relaxed max-w-md">
                  {status?.isComplete
                    ? "Both friends have signed up. You\u2019re officially in the running!"
                    : "You need 2 friends to sign up using your link before you\u2019re officially entered."}
                </p>

                {/* Progress indicator */}
                <div className="mb-8 sm:mb-10">
                  <p className="text-[15px] text-white mb-3 font-light">
                    {status?.referralCount || 0} of 2 friends signed up
                  </p>
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors ${
                        status && status.referralCount >= 1
                          ? "border-white bg-white text-black"
                          : "border-neutral-600 text-neutral-600"
                      }`}
                    >
                      {status && status.referralCount >= 1 ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="text-sm">1</span>
                      )}
                    </div>
                    <div className={`w-8 h-px ${status && status.referralCount >= 1 ? "bg-white" : "bg-neutral-600"}`} />
                    <div
                      className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors ${
                        status && status.referralCount >= 2
                          ? "border-white bg-white text-black"
                          : "border-neutral-600 text-neutral-600"
                      }`}
                    >
                      {status && status.referralCount >= 2 ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span className="text-sm">2</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Copy link */}
                {referralLink && (
                  <div className="mb-8">
                    <p className="text-sm text-white/70 mb-2 font-light">Your unique referral link</p>
                    <div className="flex items-center border border-white/30 overflow-hidden">
                      <span className="flex-1 px-3 py-2.5 text-xs text-white/70 truncate text-left font-light">
                        {referralLink}
                      </span>
                      <button
                        onClick={handleCopyLink}
                        className="flex-shrink-0 px-4 py-2.5 bg-white text-black text-xs uppercase tracking-wide hover:bg-neutral-200 transition"
                      >
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-white/50 text-[11px] sm:text-[12px] leading-relaxed font-light">
                  By entering, you agree to VIA&apos;s Terms &amp; Conditions. Winner will be selected at random from all completed entries. Giveaway credit must be used on items listed on VIA.
                </p>
              </div>
            )}

          </div>
        </div>

        {/* Footer */}
        <footer className="pt-10 sm:pt-16">
          <div className="max-w-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 text-neutral-600 text-[10px] sm:text-[11px] tracking-wider">
            <div className="flex items-center gap-5 sm:gap-6">
              <Link
                href="/terms"
                className="hover:text-neutral-400 transition-colors"
              >
                Terms
              </Link>
              <Link
                href="/privacy"
                className="hover:text-neutral-400 transition-colors"
              >
                Privacy
              </Link>
              <a
                href="https://www.instagram.com/theviaplatform/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-neutral-400 transition-colors"
              >
                Instagram
              </a>
            </div>
            <Link
              href="/admin/login?redirect=/"
              className="hover:text-neutral-400 transition-colors"
            >
              Staff Access
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function WaitlistPage() {
  return (
    <Suspense>
      <WaitlistContent />
    </Suspense>
  );
}
