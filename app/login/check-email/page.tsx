import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <main className="bg-white min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-serif text-3xl sm:text-4xl mb-3">Check your email</h1>
        <p className="text-sm text-black/50 mb-8">
          We sent you a sign-in link. Click the link in your email to continue.
        </p>
        <Link
          href="/login"
          className="text-xs uppercase tracking-wide text-black/50 hover:text-black transition"
        >
          &larr; Back to sign in
        </Link>
      </div>
    </main>
  );
}
