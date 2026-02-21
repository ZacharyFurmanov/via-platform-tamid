import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth";
import { getUserMembershipStatus } from "@/app/lib/membership-db";
import MembershipCTA from "./MembershipCTA";

export const dynamic = "force-dynamic";

export default async function MembershipPage() {
  const session = await auth();

  let isMember = false;
  if (session?.user?.id) {
    try {
      const status = await getUserMembershipStatus(session.user.id);
      isMember = status.isMember;
    } catch {
      // DB columns may not exist yet; treat as non-member
    }
  }

  return (
    <main className="bg-white min-h-screen text-black">
      <section className="border-b border-neutral-200">
        <div className="max-w-3xl mx-auto px-6 py-16 sm:py-24 text-center">
          <p className="text-xs uppercase tracking-widest text-black/40 mb-4">Membership</p>
          <h1 className="text-3xl sm:text-4xl font-serif mb-6">First Look</h1>
          <p className="text-base sm:text-lg text-black/60 max-w-xl mx-auto leading-relaxed">
            Be first to see new arrivals from VIA's curated stores — 24 hours before everyone else.
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-16 sm:py-24">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-16">
          <div className="text-center">
            <p className="text-3xl font-serif mb-3">24h</p>
            <p className="text-sm text-black/50 leading-relaxed">
              Early access to new arrivals before non-members see them
            </p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-serif mb-3">$10</p>
            <p className="text-sm text-black/50 leading-relaxed">
              Per month, billed monthly through Stripe
            </p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-serif mb-3">∞</p>
            <p className="text-sm text-black/50 leading-relaxed">
              Cancel anytime — no lock-in, no questions asked
            </p>
          </div>
        </div>

        <div className="border border-neutral-200 p-8 sm:p-12 text-center max-w-md mx-auto">
          {isMember ? (
            <div>
              <p className="font-serif text-xl mb-3">You're a First Look member.</p>
              <p className="text-sm text-black/50 mb-8">
                You have early access to new arrivals. Manage your subscription from your account.
              </p>
              <a
                href="/account"
                className="inline-block text-sm uppercase tracking-wide px-8 py-3 border border-black hover:bg-black hover:text-white transition"
              >
                Manage in Account
              </a>
            </div>
          ) : (
            <div>
              <p className="font-serif text-xl mb-3">Join First Look</p>
              <p className="text-sm text-black/50 mb-8">
                $10/month · Cancel anytime
              </p>
              <MembershipCTA isLoggedIn={!!session?.user} />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
