"use client";

import { useState } from "react";
import AdminNav from "@/app/components/AdminNav";

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
    <main style={{ background: "#F7F3EA", minHeight: "100vh" }}>
      <AdminNav />

      {/* Page title */}
      <section style={{ background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px" }}>
          <h1 className="font-serif" style={{ fontSize: 28, color: "#5D0F17", marginBottom: 8 }}>
            Giveaway Reminders
          </h1>
          <p style={{ fontSize: 15, color: "rgba(93,15,23,0.6)" }}>
            Preview and manually send reminder emails to giveaway entrants who haven&apos;t completed their referrals.
          </p>
        </div>
      </section>

      {/* Actions */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 24px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <p style={{ fontSize: 13, color: "rgba(93,15,23,0.5)" }}>
          The cron runs daily at 2:00 PM UTC. Use the buttons below to preview or manually trigger.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={fetchPreview}
            disabled={loading}
            style={{ padding: "10px 24px", border: "1px solid #5D0F17", background: "transparent", color: "#5D0F17", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}
          >
            {loading ? "Loading..." : "Preview Candidates"}
          </button>
          {preview && preview.total > 0 && (
            <button
              onClick={handleSend}
              disabled={sending}
              style={{ padding: "10px 24px", background: "#5D0F17", color: "#F7F3EA", border: "none", cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.5 : 1, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}
            >
              {sending ? "Sending..." : `Send ${preview.total} Reminders`}
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 48px" }}>

        {/* Error */}
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: 16, color: "#b91c1c", fontSize: 13, marginBottom: 24 }}>
            {error}
          </div>
        )}

        {/* Config warnings */}
        {preview && (!preview.config.hasCronSecret || !preview.config.hasResendKey) && (
          <div style={{ background: "#fffbeb", border: "1px solid #fde68a", padding: 16, color: "#92400e", fontSize: 13, marginBottom: 24 }}>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>Missing environment variables:</p>
            {!preview.config.hasCronSecret && (
              <p>CRON_SECRET is not set — the automated cron job will fail authentication.</p>
            )}
            {!preview.config.hasResendKey && (
              <p>RESEND_API_KEY is not set — emails cannot be sent.</p>
            )}
          </div>
        )}

        {/* Stats breakdown */}
        {preview && preview.stats && (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", padding: 24, marginBottom: 24 }}>
            <h2 className="font-serif" style={{ fontSize: 18, color: "#5D0F17", marginBottom: 16 }}>All Entries Breakdown</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 32 }}>
              {[
                { label: "Total entries", value: preview.stats.total, color: "#5D0F17" },
                { label: "Completed (2+ referrals)", value: preview.stats.completed, color: "#15803d" },
                { label: "Already reminded", value: preview.stats.alreadyReminded, color: "rgba(93,15,23,0.4)" },
                { label: "Too recent (<2 days)", value: preview.stats.tooRecent, color: "#d97706" },
                { label: "Eligible for reminder", value: preview.stats.eligible, color: "#5D0F17" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="font-serif" style={{ fontSize: 28, color: s.color, lineHeight: 1 }}>{s.value}</p>
                  <p style={{ fontSize: 12, color: "rgba(93,15,23,0.5)", marginTop: 4 }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Send results */}
        {sendResult && (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", padding: 24, marginBottom: 24 }}>
            <h2 className="font-serif" style={{ fontSize: 18, color: "#5D0F17", marginBottom: 16 }}>Send Results</h2>
            <div style={{ display: "flex", gap: 32, marginBottom: 20 }}>
              <div>
                <p className="font-serif" style={{ fontSize: 28, color: "#15803d", lineHeight: 1 }}>{sendResult.sent}</p>
                <p style={{ fontSize: 12, color: "rgba(93,15,23,0.5)", marginTop: 4 }}>Sent</p>
              </div>
              <div>
                <p className="font-serif" style={{ fontSize: 28, color: "#b91c1c", lineHeight: 1 }}>{sendResult.failed}</p>
                <p style={{ fontSize: 12, color: "rgba(93,15,23,0.5)", marginTop: 4 }}>Failed</p>
              </div>
            </div>
            {sendResult.results && sendResult.results.length > 0 && (
              <div>
                {sendResult.results.map((r) => (
                  <div
                    key={r.email}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, padding: "8px 0", borderBottom: "1px solid #e5e7eb" }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#5D0F17" }}>{r.email}</span>
                    {r.status === "sent" ? (
                      <span style={{ color: "#15803d", marginLeft: 16, flexShrink: 0 }}>Sent</span>
                    ) : (
                      <span style={{ color: "#b91c1c", marginLeft: 16, flexShrink: 0 }} title={r.error}>Failed</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Preview */}
        {preview && !sendResult && (
          <div>
            {/* Category breakdown */}
            {preview.total > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 24 }}>
                {Object.entries(preview.categories).map(([cat, count]) => (
                  <div key={cat} style={{ background: "#fff", border: "1px solid #e5e7eb", padding: "16px 20px" }}>
                    <p className="font-serif" style={{ fontSize: 28, color: "#5D0F17", lineHeight: 1 }}>{count}</p>
                    <p style={{ fontSize: 12, color: "rgba(93,15,23,0.5)", marginTop: 4 }}>{CATEGORY_LABELS[cat] || cat}</p>
                  </div>
                ))}
              </div>
            )}

            {preview.total === 0 ? (
              <div style={{ background: "#fff", border: "1px dashed #e5e7eb", padding: "32px 24px", textAlign: "center" }}>
                <p style={{ color: "rgba(93,15,23,0.5)", marginBottom: 8 }}>No candidates eligible for reminders right now.</p>
                <p style={{ fontSize: 12, color: "rgba(93,15,23,0.4)" }}>
                  Users become eligible 2 days after their last activity if they have fewer than 2 referrals and haven&apos;t received a reminder yet.
                </p>
              </div>
            ) : (
              <div style={{ background: "#fff", border: "1px solid #e5e7eb" }}>
                {/* Desktop Header */}
                <div className="hidden sm:grid grid-cols-12 gap-4" style={{ padding: "12px 24px", background: "#F7F3EA", borderBottom: "1px solid #e5e7eb", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(93,15,23,0.5)" }}>
                  <div className="col-span-4">Email</div>
                  <div className="col-span-2">Referrals</div>
                  <div className="col-span-3">Category</div>
                  <div className="col-span-3">Last Activity</div>
                </div>

                <div style={{ maxHeight: 600, overflowY: "auto" }}>
                  {preview.candidates.map((c) => (
                    <div
                      key={c.id}
                      style={{ padding: "16px 24px", borderBottom: "1px solid #e5e7eb" }}
                    >
                      {/* Mobile */}
                      <div className="sm:hidden">
                        <p style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#5D0F17" }}>{c.email}</p>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "rgba(93,15,23,0.5)" }}>
                          <span>{c.referralCount} referral{c.referralCount !== 1 ? "s" : ""}</span>
                          <span>{CATEGORY_LABELS[c.category] || c.category}</span>
                        </div>
                      </div>
                      {/* Desktop */}
                      <div className="hidden sm:grid grid-cols-12 gap-4" style={{ fontSize: 13 }}>
                        <div className="col-span-4" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#5D0F17" }}>{c.email}</div>
                        <div className="col-span-2" style={{ color: "rgba(93,15,23,0.5)" }}>{c.referralCount}</div>
                        <div className="col-span-3" style={{ color: "rgba(93,15,23,0.5)" }}>{CATEGORY_LABELS[c.category] || c.category}</div>
                        <div className="col-span-3" style={{ color: "rgba(93,15,23,0.5)" }}>{formatDate(c.updatedAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
