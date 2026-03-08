"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirebaseApp } from "@/app/lib/firebase";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [firebaseMode, setFirebaseMode] = useState<"signin" | "signup">(
    modeParam === "signup" ? "signup" : "signin"
  );
  const [firebaseError, setFirebaseError] = useState("");
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    await signIn("resend", { email, callbackUrl });
  }

  async function handleFirebaseAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setFirebaseError("");

    try {
      const auth = getAuth(getFirebaseApp());

      if (firebaseMode === "signup") {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }

      document.cookie = "via_access=1; path=/; max-age=31536000; SameSite=Lax";
      router.push(callbackUrl);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed.";
      setFirebaseError(message);
      setLoading(false);
    }
  }

  return (
    <main className="bg-[#F7F3EA] min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="font-serif text-3xl sm:text-4xl text-center mb-3 text-[#5D0F17]">
          Sign in to VIA
        </h1>
        <p className="text-sm text-[#5D0F17]/50 text-center mb-10">
          Create an account to start shopping.
        </p>

        {/* Firebase email/password auth */}
        <div className="border border-[#5D0F17]/20 p-4 mb-6">
          <p className="text-xs uppercase tracking-[0.15em] text-[#5D0F17]/50 mb-3">
            Off the waitlist?
          </p>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              type="button"
              onClick={() => setFirebaseMode("signin")}
              className={`py-2 text-xs uppercase tracking-wide border transition ${
                firebaseMode === "signin"
                  ? "bg-[#5D0F17] border-[#5D0F17] text-[#F7F3EA]"
                  : "border-[#5D0F17]/30 text-[#5D0F17] hover:border-[#5D0F17]"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setFirebaseMode("signup")}
              className={`py-2 text-xs uppercase tracking-wide border transition ${
                firebaseMode === "signup"
                  ? "bg-[#5D0F17] border-[#5D0F17] text-[#F7F3EA]"
                  : "border-[#5D0F17]/30 text-[#5D0F17] hover:border-[#5D0F17]"
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleFirebaseAuth}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full border border-[#5D0F17]/30 bg-transparent px-4 py-3.5 text-sm text-[#5D0F17] placeholder:text-[#5D0F17]/40 outline-none focus:border-[#5D0F17] transition mb-2"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className="w-full border border-[#5D0F17]/30 bg-transparent px-4 py-3.5 text-sm text-[#5D0F17] placeholder:text-[#5D0F17]/40 outline-none focus:border-[#5D0F17] transition mb-3"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#5D0F17] text-[#F7F3EA] py-3.5 text-sm uppercase tracking-wide hover:bg-[#5D0F17]/85 transition disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : firebaseMode === "signup"
                  ? "Create Firebase Account"
                  : "Sign In with Firebase"}
            </button>
          </form>

          {firebaseError && (
            <p className="text-red-600 text-xs mt-3">{firebaseError}</p>
          )}
        </div>

        {/* Google */}
        <button
          onClick={() => signIn("google", { callbackUrl })}
          className="w-full flex items-center justify-center gap-3 bg-[#5D0F17] text-[#F7F3EA] py-3.5 text-sm uppercase tracking-wide hover:bg-[#5D0F17]/85 transition mb-3"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-[#5D0F17]/20" />
          <span className="text-xs text-[#5D0F17]/40 uppercase tracking-wide">or</span>
          <div className="flex-1 h-px bg-[#5D0F17]/20" />
        </div>

        {/* Email magic link */}
        <form onSubmit={handleEmailSignIn}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="w-full border border-[#5D0F17]/30 bg-transparent px-4 py-3.5 text-sm text-[#5D0F17] placeholder:text-[#5D0F17]/40 outline-none focus:border-[#5D0F17] transition mb-3"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#5D0F17] text-[#F7F3EA] py-3.5 text-sm uppercase tracking-wide hover:bg-[#5D0F17]/85 transition disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Magic Link"}
          </button>
        </form>

        <p className="text-[11px] text-[#5D0F17]/40 text-center mt-8 leading-relaxed">
          By signing in, you agree to our{" "}
          <Link href="/terms" className="underline">Terms</Link> and{" "}
          <Link href="/privacy" className="underline">Privacy Policy</Link>, and
          to receive email updates from VIA. You can unsubscribe at any time.
        </p>
      </div>
    </main>
  );
}
