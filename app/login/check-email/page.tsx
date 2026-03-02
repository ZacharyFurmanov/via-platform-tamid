import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <main className="bg-[#F7F3EA] min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-serif text-3xl sm:text-4xl mb-3 text-[#5D0F17]">Check your email</h1>
        <p className="text-sm text-[#5D0F17]/50 mb-8">
          We sent you a sign-in link. Click the link in your email to continue.
        </p>
        <Link
          href="/login"
          className="text-xs uppercase tracking-wide text-[#5D0F17]/50 hover:text-[#5D0F17] transition"
        >
          &larr; Back to sign in
        </Link>
      </div>
    </main>
  );
}
