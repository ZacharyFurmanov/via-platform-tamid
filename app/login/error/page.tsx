import Link from "next/link";

export default function AuthErrorPage() {
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
