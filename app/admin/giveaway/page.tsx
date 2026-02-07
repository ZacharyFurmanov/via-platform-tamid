"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Candidate = {
  id: number;
  email: string;
  referralCode: string;
  referralCount: number;
  category: string;
  createdAt: string;
  updatedAt: string;
};

type Stats = {
  total: number;
  completed: number;
  alreadyReminded: number;
  tooRecent: number;
  eligible: number;
};

type PreviewData = {
  total: number;
  categories: Record<string, number>;
  stats: Stats;
  candidates: Candidate[];
  config: {
    hasCronSecret: boolean;
    hasResendKey: boolean;
  };
};

type SendResult = {
  success: boolean;
  sent: number;
  failed: number;
  total: number;
  results?: { email: string; status: "sent" | "failed"; error?: string }[];
  errors?: string[];
};

const CATEGORY_LABELS: Record<string, string> = {
  no_activity: "No activity (hasn't shared link)",
  invited_no_entries: "Invited friends but none entered",
  one_referral: "Has 1 referral, needs 1 more",
};

export default function GiveawayAdminPage() {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
    router.refresh();
  }

  async function fetchPreview() {
    setLoading(true);
    setError(null);
    setSendResult(null);
    try {
      const res = await fetch("/api/admin/giveaway-reminders");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data: PreviewData = await res.json();
      setPreview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch candidates");
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    if (!confirm("Send reminder emails to all candidates now?")) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/giveaway-reminders", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const data: SendResult = await res.json();
      setSendResult(data);
      setPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reminders");
    } finally {
      setSending(false);
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <main className="bg-white min-h-screen text-black">
      {/* Header */}
      <section className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-12 sm:py-20">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-4 text-sm flex-wrap">
              <Link
                href="/admin/sync"
                className="text-neutral-400 hover:text-black transition-colors min-h-[44px] flex items-center"
              >
                Sync
              </Link>
              <span className="text-neutral-300">/</span>
              <Link
                href="/admin/analytics"
                className="text-neutral-400 hover:text-black transition-colors min-h-[44px] flex items-center"
              >
                Analytics
              </Link>
              <span className="text-neutral-300">/</span>
              <Link
                href="/admin/emails"
                className="text-neutral-400 hover:text-black transition-colors min-h-[44px] flex items-center"
              >
                Emails
              </Link>
              <span className="text-neutral-300">/</span>
              <span className="text-black">Giveaway</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-neutral-400 hover:text-black transition-colors"
            >
              Logout
            </button>
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif mb-3 sm:mb-4">
            Giveaway Reminders
          </h1>
          <p className="text-neutral-600 text-base sm:text-lg">
            Preview and manually send reminder emails to giveaway entrants who
            haven&apos;t completed their referrals.
          </p>
        </div>
      </section>

      {/* Actions */}
      <section className="border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-4 sm:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-sm text-neutral-500">
            The cron runs daily at 2:00 PM UTC. Use the buttons below to preview
            or manually trigger.
          </p>
          <div className="flex gap-3">
            <button
              onClick={fetchPreview}
              disabled={loading}
              className="px-6 py-3 min-h-[48px] border border-black text-sm uppercase tracking-wide hover:bg-black hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Loading..." : "Preview Candidates"}
            </button>
            {preview && preview.total > 0 && (
              <button
                onClick={handleSend}
                disabled={sending}
                className="px-6 py-3 min-h-[48px] bg-black text-white text-sm uppercase tracking-wide hover:bg-neutral-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? "Sending..." : `Send ${preview.total} Reminders`}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Config warnings */}
      {preview && (!preview.config.hasCronSecret || !preview.config.hasResendKey) && (
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm space-y-1">
            <p className="font-medium">Missing environment variables:</p>
            {!preview.config.hasCronSecret && (
              <p>
                CRON_SECRET is not set — the automated cron job will fail
                authentication.
              </p>
            )}
            {!preview.config.hasResendKey && (
              <p>
                RESEND_API_KEY is not set — emails cannot be sent.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Stats breakdown */}
      {preview && preview.stats && (
        <section className="border-b border-neutral-200">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <h2 className="text-lg font-serif mb-4">All Entries Breakdown</h2>
            <div className="flex flex-wrap gap-8">
              <div>
                <p className="text-3xl font-serif">{preview.stats.total}</p>
                <p className="text-sm text-neutral-500">Total entries</p>
              </div>
              <div>
                <p className="text-3xl font-serif text-green-700">{preview.stats.completed}</p>
                <p className="text-sm text-neutral-500">Completed (2+ referrals)</p>
              </div>
              <div>
                <p className="text-3xl font-serif text-neutral-400">{preview.stats.alreadyReminded}</p>
                <p className="text-sm text-neutral-500">Already reminded</p>
              </div>
              <div>
                <p className="text-3xl font-serif text-amber-600">{preview.stats.tooRecent}</p>
                <p className="text-sm text-neutral-500">Too recent (&lt;2 days)</p>
              </div>
              <div>
                <p className="text-3xl font-serif text-black">{preview.stats.eligible}</p>
                <p className="text-sm text-neutral-500">Eligible for reminder</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Send results */}
      {sendResult && (
        <section className="py-8">
          <div className="max-w-7xl mx-auto px-6">
            <div className="border border-neutral-200 p-6">
              <h2 className="text-xl font-serif mb-4">Send Results</h2>
              <div className="flex gap-8 mb-6">
                <div>
                  <p className="text-3xl font-serif text-green-700">
                    {sendResult.sent}
                  </p>
                  <p className="text-sm text-neutral-500">Sent</p>
                </div>
                <div>
                  <p className="text-3xl font-serif text-red-700">
                    {sendResult.failed}
                  </p>
                  <p className="text-sm text-neutral-500">Failed</p>
                </div>
              </div>
              {sendResult.results && sendResult.results.length > 0 && (
                <div className="space-y-2">
                  {sendResult.results.map((r) => (
                    <div
                      key={r.email}
                      className="flex items-center justify-between text-sm py-2 border-b border-neutral-100 last:border-0"
                    >
                      <span className="truncate">{r.email}</span>
                      {r.status === "sent" ? (
                        <span className="text-green-700 ml-4 shrink-0">
                          Sent
                        </span>
                      ) : (
                        <span
                          className="text-red-700 ml-4 shrink-0"
                          title={r.error}
                        >
                          Failed
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Preview */}
      {preview && !sendResult && (
        <section className="py-8 sm:py-12">
          <div className="max-w-7xl mx-auto px-6">
            {/* Category breakdown */}
            {preview.total > 0 && (
              <div className="flex flex-wrap gap-6 mb-8">
                {Object.entries(preview.categories).map(([cat, count]) => (
                  <div key={cat}>
                    <p className="text-3xl font-serif">{count}</p>
                    <p className="text-sm text-neutral-500">
                      {CATEGORY_LABELS[cat] || cat}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {preview.total === 0 ? (
              <div className="border border-dashed border-neutral-300 p-8 text-center">
                <p className="text-neutral-500 mb-2">
                  No candidates eligible for reminders right now.
                </p>
                <p className="text-sm text-neutral-400">
                  Users become eligible 2 days after their last activity if they
                  have fewer than 2 referrals and haven&apos;t received a
                  reminder yet.
                </p>
              </div>
            ) : (
              <div className="border border-neutral-200">
                {/* Desktop Header */}
                <div className="hidden sm:grid grid-cols-12 gap-4 px-4 sm:px-6 py-3 bg-neutral-50 text-sm text-neutral-500 border-b border-neutral-200">
                  <div className="col-span-4">Email</div>
                  <div className="col-span-2">Referrals</div>
                  <div className="col-span-3">Category</div>
                  <div className="col-span-3">Last Activity</div>
                </div>

                <div className="max-h-[600px] overflow-y-auto">
                  {preview.candidates.map((c) => (
                    <div
                      key={c.id}
                      className="px-4 sm:px-6 py-4 border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50"
                    >
                      {/* Mobile */}
                      <div className="sm:hidden">
                        <p className="font-medium truncate">{c.email}</p>
                        <div className="flex items-center justify-between mt-1 text-xs text-neutral-500">
                          <span>
                            {c.referralCount} referral
                            {c.referralCount !== 1 ? "s" : ""}
                          </span>
                          <span>{CATEGORY_LABELS[c.category] || c.category}</span>
                        </div>
                      </div>
                      {/* Desktop */}
                      <div className="hidden sm:grid grid-cols-12 gap-4 text-sm">
                        <div className="col-span-4 truncate">{c.email}</div>
                        <div className="col-span-2 text-neutral-500">
                          {c.referralCount}
                        </div>
                        <div className="col-span-3 text-neutral-500">
                          {CATEGORY_LABELS[c.category] || c.category}
                        </div>
                        <div className="col-span-3 text-neutral-500">
                          {formatDate(c.updatedAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Admin Navigation */}
      <section className="border-t border-neutral-200 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap gap-4 sm:gap-6 text-sm">
            <Link
              href="/admin/sync"
              className="text-neutral-500 hover:text-black transition-colors min-h-[44px] flex items-center"
            >
              Inventory Sync
            </Link>
            <Link
              href="/admin/analytics"
              className="text-neutral-500 hover:text-black transition-colors min-h-[44px] flex items-center"
            >
              Analytics
            </Link>
            <Link
              href="/admin/emails"
              className="text-neutral-500 hover:text-black transition-colors min-h-[44px] flex items-center"
            >
              Emails
            </Link>
            <span className="text-black min-h-[44px] flex items-center">
              Giveaway
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
