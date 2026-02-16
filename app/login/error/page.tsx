"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, Suspense } from "react";

// OAuth errors that happen from back-button / stale state - safe to auto-retry
const AUTO_RETRY_ERRORS = ["OAuthCallback", "OAuthSignin", "Callback"];

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const error = searchParams.get("error") || "";

  useEffect(() => {
    if (AUTO_RETRY_ERRORS.includes(error)) {
      router.replace("/login");
    }
  }, [error, router]);

  // Show nothing briefly while redirecting for OAuth errors
  if (AUTO_RETRY_ERRORS.includes(error)) {
    return null;
  }

  return (
    <main className="bg-white min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-serif text-3xl sm:text-4xl mb-3">Something went wrong</h1>
        <p className="text-sm text-black/50 mb-8">
          We couldn&apos;t sign you in. The link may have expired or already been used.
        </p>
        <Link
          href="/login"
          className="inline-block bg-black text-white py-3.5 px-8 text-sm uppercase tracking-wide hover:bg-neutral-800 transition"
        >
          Try Again
        </Link>
      </div>
    </main>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense>
      <AuthErrorContent />
    </Suspense>
  );
}
