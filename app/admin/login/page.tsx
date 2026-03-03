"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [step, setStep] = useState<"password" | "totp">("password");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body =
        step === "totp" ? { password, totpCode } : { password };

      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        router.push(redirect);
        router.refresh();
      } else if (data.requireTotp) {
        setStep("totp");
      } else {
        setError(data.error || "Invalid credentials");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-white min-h-screen text-black flex items-center justify-center">
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-serif mb-2">Admin Access</h1>
          <p className="text-neutral-500 text-sm">
            {step === "password"
              ? "Enter password to continue"
              : "Enter the 6-digit code from Authy"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === "password" ? (
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoFocus
                required
                className="w-full px-4 py-4 border border-neutral-200 text-lg outline-none focus:border-black transition-colors"
              />
            </div>
          ) : (
            <div>
              <label htmlFor="totp" className="sr-only">
                Authenticator code
              </label>
              <input
                id="totp"
                type="text"
                inputMode="numeric"
                pattern="[0-9 ]*"
                maxLength={7}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                placeholder="000000"
                autoFocus
                autoComplete="one-time-code"
                required
                className="w-full px-4 py-4 border border-neutral-200 text-2xl tracking-[0.4em] text-center font-mono outline-none focus:border-black transition-colors"
              />
            </div>
          )}

          {error && (
            <p className="text-red-600 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || (step === "password" ? !password : !totpCode)}
            className="w-full px-6 py-4 bg-black text-white text-sm uppercase tracking-wide hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying…" : step === "password" ? "Continue" : "Sign In"}
          </button>

          {step === "totp" && (
            <button
              type="button"
              onClick={() => {
                setStep("password");
                setTotpCode("");
                setError("");
              }}
              className="w-full text-sm text-neutral-400 hover:text-black transition-colors"
            >
              Back
            </button>
          )}
        </form>

        <div className="mt-10 text-center">
          <Link
            href="/"
            className="text-sm text-neutral-500 hover:text-black transition-colors"
          >
            Back to VIA
          </Link>
        </div>
      </div>
    </main>
  );
}
