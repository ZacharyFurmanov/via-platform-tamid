"use client";

import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function StoreLoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/store/me")
        .then((res) => {
          if (res.ok) {
            router.replace("/store/dashboard");
          }
        })
        .catch(() => {});
    }
  }, [status, router]);

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setMagicLoading(true);
    await signIn("resend", { email, callbackUrl: "/store/dashboard", redirect: false });
    setMagicLoading(false);
    setMagicSent(true);
  }

  const isLoading = status === "loading";
  const isSignedInNonPartner = status === "authenticated" && !!session?.user?.email;

  return (
    <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F7F3EA" }}>
      <div className="w-full max-w-md px-6">
        <div className="bg-white p-10 shadow-sm">
          <div className="text-center mb-8">
            <div className="mb-6">
              <Image
                src="/vya-logo.png"
                alt="VYA"
                width={80}
                height={80}
                className="mx-auto"
                style={{ objectFit: "contain" }}
              />
            </div>
            <h1
              className="text-2xl font-serif mb-2"
              style={{ color: "#5D0F17" }}
            >
              Store Partner Portal
            </h1>
            <p className="text-sm" style={{ color: "rgba(93,15,23,0.6)" }}>
              Sign in with the email registered for your store.
            </p>
          </div>

          {isSignedInNonPartner ? (
            <div className="text-center">
              <p className="text-sm mb-4" style={{ color: "#5D0F17" }}>
                Your account ({session?.user?.email}) is not linked to a partner store.
              </p>
              <button
                onClick={() => signIn("google", { callbackUrl: "/store/dashboard" })}
                className="w-full py-3 text-sm uppercase tracking-wide transition-colors mb-3"
                style={{ backgroundColor: "#5D0F17", color: "#F7F3EA" }}
              >
                Try a different Google account
              </button>
              <p className="text-sm mb-2" style={{ color: "rgba(93,15,23,0.6)" }}>or sign in with your store email</p>
              <form onSubmit={handleEmailSignIn}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your store email"
                  required
                  className="w-full border px-4 py-3 text-sm outline-none mb-3"
                  style={{ borderColor: "rgba(93,15,23,0.3)", color: "#5D0F17" }}
                />
                <button
                  type="submit"
                  disabled={magicLoading || magicSent}
                  className="w-full py-3 text-sm uppercase tracking-wide transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: "#5D0F17", color: "#F7F3EA" }}
                >
                  {magicSent ? "Check your email" : magicLoading ? "Sending..." : "Send Magic Link"}
                </button>
              </form>
            </div>
          ) : (
            <>
              {/* Google */}
              <button
                onClick={() => signIn("google", { callbackUrl: "/store/dashboard" })}
                disabled={isLoading}
                className="w-full py-3 text-sm uppercase tracking-wide transition-opacity disabled:opacity-50 mb-4"
                style={{ backgroundColor: "#5D0F17", color: "#F7F3EA" }}
              >
                {isLoading ? "Loading…" : "Sign in with Google"}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4 my-5">
                <div className="flex-1 h-px" style={{ backgroundColor: "rgba(93,15,23,0.2)" }} />
                <span className="text-xs uppercase tracking-wide" style={{ color: "rgba(93,15,23,0.4)" }}>or</span>
                <div className="flex-1 h-px" style={{ backgroundColor: "rgba(93,15,23,0.2)" }} />
              </div>

              {/* Email magic link */}
              {magicSent ? (
                <p className="text-center text-sm py-3" style={{ color: "#5D0F17" }}>
                  Check your email for a sign-in link.
                </p>
              ) : (
                <form onSubmit={handleEmailSignIn}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your store email"
                    required
                    className="w-full border px-4 py-3 text-sm outline-none mb-3 transition"
                    style={{ borderColor: "rgba(93,15,23,0.3)", color: "#5D0F17" }}
                  />
                  <button
                    type="submit"
                    disabled={magicLoading}
                    className="w-full py-3 text-sm uppercase tracking-wide transition-opacity disabled:opacity-50"
                    style={{ backgroundColor: "#5D0F17", color: "#F7F3EA" }}
                  >
                    {magicLoading ? "Sending..." : "Send Magic Link"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
