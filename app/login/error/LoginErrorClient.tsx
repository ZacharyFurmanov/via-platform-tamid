"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "Unknown";

  return (
    <main className="bg-[#F7F3EA] min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-serif text-3xl sm:text-4xl mb-3 text-[#5D0F17]">Something went wrong</h1>
        <p className="text-sm text-[#5D0F17]/50 mb-4">
          We couldn&apos;t sign you in. The link may have expired or already been used.
        </p>
        <p className="text-xs text-[#5D0F17]/30 mb-8 font-mono">
          Error: {error}
        </p>
        <Link
          href="/login"
          className="inline-block bg-[#5D0F17] text-[#F7F3EA] py-3.5 px-8 text-sm uppercase tracking-wide hover:bg-[#5D0F17]/85 transition"
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
