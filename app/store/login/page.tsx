"use client";

import { useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function StoreLoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      // Check if this user is a store partner by hitting /api/store/me
      fetch("/api/store/me")
        .then((res) => {
          if (res.ok) {
            router.replace("/store/dashboard");
          }
        })
        .catch(() => {});
    }
  }, [status, router]);

  const isLoading = status === "loading";
  const isSignedInNonPartner =
    status === "authenticated" &&
    !!session?.user?.email;

  return (
    <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#F7F3EA" }}>
      <div className="w-full max-w-md px-6">
        <div className="bg-white p-10 shadow-sm">
          <div className="text-center mb-8">
            <div className="mb-6">
              <Image
                src="/via-logo.png"
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
              Sign in with the Google account registered for your store.
            </p>
          </div>

          {isSignedInNonPartner ? (
            <div className="text-center">
              <p className="text-sm mb-4" style={{ color: "#5D0F17" }}>
                Your account ({session?.user?.email}) is not linked to a partner
                store.
              </p>
              <button
                onClick={() => signIn("google", { callbackUrl: "/store/dashboard" })}
                className="w-full py-3 text-sm uppercase tracking-wide transition-colors"
                style={{ backgroundColor: "#5D0F17", color: "#F7F3EA" }}
              >
                Try a different account
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn("google", { callbackUrl: "/store/dashboard" })}
              disabled={isLoading}
              className="w-full py-3 text-sm uppercase tracking-wide transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#5D0F17", color: "#F7F3EA" }}
            >
              {isLoading ? "Loading…" : "Sign in with Google"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
