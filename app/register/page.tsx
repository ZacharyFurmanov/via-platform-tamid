"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const next = searchParams.get("callbackUrl") || "/";
  const referralCode = searchParams.get("ref") || "";
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [emailSubscribe, setEmailSubscribe] = useState(true);
  const [smsSubscribe, setSmsSubscribe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [myReferralCode, setMyReferralCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !email.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/pilot-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, phone, emailSubscribe, smsSubscribe, referralCode: referralCode || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      if (data.referralCode) setMyReferralCode(data.referralCode);
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    // Preserve referral code through the OAuth redirect via a short-lived cookie
    if (referralCode) {
      document.cookie = `vya_pending_ref=${encodeURIComponent(referralCode)}; path=/; max-age=600; SameSite=Lax`;
    }
    await signIn("google", { callbackUrl: next });
  }

  return (
    <div className="fixed inset-0 z-[200] flex">
      {/* Left — solid red */}
      <div className="hidden lg:block lg:w-1/2 bg-[#5D0F17]" />

      {/* Right — form */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col overflow-y-auto">
        <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 py-12 max-w-xl w-full mx-auto">
          {/* Logo */}
          <div className="flex items-start gap-1.5 mb-8">
            <img src="/vya-logo.png" alt="VYA" className="h-7 w-auto" />
            <span className="text-[9px] uppercase tracking-[0.15em] text-[#5D0F17]/60 font-sans">pilot</span>
          </div>

          {submitted ? (
            <div>
              <h1 className="font-serif text-3xl text-[#5D0F17] mb-3">You&apos;re on the list.</h1>
              <p className="text-[#5D0F17]/60 text-sm leading-relaxed mb-8">
                We&apos;ve added <strong>{email}</strong> to the waitlist. We&apos;ll let you know when you&apos;re in.
              </p>

              {/* Giveaway CTA */}
              <div className="bg-[#5D0F17] px-6 py-6 mb-6">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#F7F3EA]/50 mb-1">Giveaway</p>
                <p className="font-serif text-xl text-[#F7F3EA] mb-2">Win a $1,000 vintage shopping spree</p>
                <p className="text-xs text-[#F7F3EA]/60 leading-relaxed mb-4">
                  Invite 2 friends who join the waitlist using your link to be officially entered.
                </p>
                {myReferralCode && (
                  <div className="flex items-stretch border border-[#F7F3EA]/20 overflow-hidden">
                    <p className="flex-1 px-3 py-2.5 text-xs text-[#F7F3EA]/70 truncate bg-[#5D0F17]">
                      {`${process.env.NEXT_PUBLIC_BASE_URL || "https://vyaplatform.com"}/register?ref=${myReferralCode}`}
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_BASE_URL || "https://vyaplatform.com"}/register?ref=${myReferralCode}`);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="px-4 border-l border-[#F7F3EA]/20 text-[#F7F3EA]/70 hover:text-[#F7F3EA] hover:bg-[#F7F3EA]/10 transition flex items-center gap-1.5 text-xs uppercase tracking-wide whitespace-nowrap"
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                )}
              </div>

              <p className="text-[#5D0F17]/40 text-xs text-center">
                Already have an account?{" "}
                <Link href="/login" className="underline text-[#5D0F17]/60">
                  Sign in
                </Link>
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-serif text-3xl sm:text-4xl text-[#5D0F17] mb-2 text-center">
                Sign up
              </h1>
              <p className="text-sm text-[#5D0F17]/50 text-center mb-8">
                Sign up to access the VYA pilot.
              </p>

              {/* Google */}
              <button
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-3 border border-[#5D0F17]/20 py-3 text-sm text-[#5D0F17] hover:border-[#5D0F17] transition mb-6"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 h-px bg-[#5D0F17]/10" />
                <span className="text-xs text-[#5D0F17]/30 uppercase tracking-wide">or</span>
                <div className="flex-1 h-px bg-[#5D0F17]/10" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* First + Last name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#5D0F17]/60 mb-1.5">
                      First name <span className="text-[#5D0F17]">*</span>
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="w-full border border-[#5D0F17]/20 px-3 py-2.5 text-sm text-[#5D0F17] focus:border-[#5D0F17] focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5D0F17]/60 mb-1.5">
                      Last name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full border border-[#5D0F17]/20 px-3 py-2.5 text-sm text-[#5D0F17] focus:border-[#5D0F17] focus:outline-none transition"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs text-[#5D0F17]/60 mb-1.5">
                    Email address <span className="text-[#5D0F17]">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full border border-[#5D0F17]/20 px-3 py-2.5 text-sm text-[#5D0F17] focus:border-[#5D0F17] focus:outline-none transition"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs text-[#5D0F17]/60 mb-1.5">
                    Phone number
                  </label>
                  <div className="flex border border-[#5D0F17]/20 focus-within:border-[#5D0F17] transition">
                    <div className="flex items-center gap-1.5 px-3 border-r border-[#5D0F17]/20 text-sm text-[#5D0F17]/60 bg-[#F7F3EA]/50 select-none">
                      <span>🇺🇸</span>
                      <span>+1</span>
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 000-0000"
                      className="flex-1 px-3 py-2.5 text-sm text-[#5D0F17] bg-transparent focus:outline-none placeholder:text-[#5D0F17]/30"
                    />
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="space-y-3 pt-1">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailSubscribe}
                      onChange={(e) => setEmailSubscribe(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[#5D0F17]"
                    />
                    <span className="text-sm text-[#5D0F17]/70">Subscribe to email updates</span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={smsSubscribe}
                      onChange={(e) => setSmsSubscribe(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-[#5D0F17]"
                    />
                    <span className="text-sm text-[#5D0F17]/70">Subscribe to SMS updates</span>
                  </label>
                </div>

                {/* Legal links */}
                <div className="flex gap-4 pt-1">
                  <Link href="/terms" target="_blank" className="text-xs text-[#5D0F17] underline hover:no-underline">
                    Terms &amp; Conditions
                  </Link>
                  <Link href="/privacy" target="_blank" className="text-xs text-[#5D0F17] underline hover:no-underline">
                    Privacy Policy
                  </Link>
                </div>

                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !firstName.trim() || !email.trim()}
                  className="w-full bg-[#5D0F17] text-[#F7F3EA] py-3.5 text-sm uppercase tracking-[0.12em] hover:bg-[#5D0F17]/85 transition disabled:opacity-50 mt-2"
                >
                  {loading ? "Submitting..." : "Submit"}
                </button>
              </form>

              <p className="text-center text-xs text-[#5D0F17]/40 mt-6">
                Already have an account?{" "}
                <Link href="/login" className="underline text-[#5D0F17]/60">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
