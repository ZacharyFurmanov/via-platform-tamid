"use client";

import { useState, useEffect } from "react";
import AdminNav from "@/app/components/AdminNav";

type Entry = {
  rank: number;
  email: string;
  firstName: string | null;
  referralCode: string | null;
  referralCount: number;
  status: string;
  createdAt: string;
};

type Stats = {
  total: number;
  approved: number;
  pending: number;
  withReferrals: number;
};

type LeaderboardData = {
  stats: Stats;
  entries: Entry[];
};

// Tier label based on referral count (mirrors pilot-db approval logic)
function tierLabel(count: number): string {
  if (count >= 3) return "3 day wait";
  if (count === 2) return "4 day wait";
  if (count === 1) return "5 day wait";
  return "7 day wait";
}

export default function ReferralBoardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");

  useEffect(() => {
    fetch("/api/admin/giveaway-leaderboard")
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const filtered = data?.entries.filter((e) =>
    filter === "all" ? true : e.status === filter
  ) ?? [];

  return (
    <main style={{ background: "#F7F3EA", minHeight: "100vh" }}>
      <AdminNav />

      <section style={{ background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px" }}>
          <h1 className="font-serif" style={{ fontSize: 28, color: "#5D0F17", marginBottom: 8 }}>
            Referral Board
          </h1>
          <p style={{ fontSize: 15, color: "rgba(93,15,23,0.6)" }}>
            Waitlist members ranked by referrals — more referrals means a shorter wait.
          </p>
        </div>
      </section>

      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 48px" }}>

        {loading && (
          <p style={{ color: "rgba(93,15,23,0.5)", fontSize: 14 }}>Loading...</p>
        )}

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: 16, color: "#b91c1c", fontSize: 13 }}>
            {error}
          </div>
        )}

        {data && (
          <>
            {/* Stats */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginBottom: 32 }}>
              {[
                { label: "Total on waitlist", value: data.stats.total },
                { label: "Approved", value: data.stats.approved, color: "#15803d" },
                { label: "Pending", value: data.stats.pending, color: "#d97706" },
                { label: "Have referrals", value: data.stats.withReferrals },
              ].map((s) => (
                <div key={s.label} style={{ background: "#fff", border: "1px solid #e5e7eb", padding: "20px 28px" }}>
                  <p className="font-serif" style={{ fontSize: 32, color: s.color || "#5D0F17", lineHeight: 1 }}>{s.value}</p>
                  <p style={{ fontSize: 12, color: "rgba(93,15,23,0.5)", marginTop: 6 }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Filter */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {(["all", "pending", "approved"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: "6px 16px",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    border: "1px solid #5D0F17",
                    background: filter === f ? "#5D0F17" : "transparent",
                    color: filter === f ? "#F7F3EA" : "#5D0F17",
                    cursor: "pointer",
                  }}
                >
                  {f === "all" ? `All (${data.stats.total})` : f === "pending" ? `Pending (${data.stats.pending})` : `Approved (${data.stats.approved})`}
                </button>
              ))}
            </div>

            {/* Leaderboard table */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb" }}>
              {/* Header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "56px 1fr 100px 120px 110px 110px",
                  gap: 12,
                  padding: "12px 24px",
                  background: "#F7F3EA",
                  borderBottom: "1px solid #e5e7eb",
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "rgba(93,15,23,0.5)",
                }}
                className="hidden sm:grid"
              >
                <div>Rank</div>
                <div>Email</div>
                <div>Referrals</div>
                <div>Wait Tier</div>
                <div>Status</div>
                <div>Joined</div>
              </div>

              <div style={{ maxHeight: 700, overflowY: "auto" }}>
                {filtered.length === 0 && (
                  <div style={{ padding: "32px 24px", textAlign: "center", color: "rgba(93,15,23,0.4)", fontSize: 14 }}>
                    No entries.
                  </div>
                )}
                {filtered.map((e) => (
                  <div
                    key={e.email}
                    style={{
                      padding: "14px 24px",
                      borderBottom: "1px solid #e5e7eb",
                      background: e.status === "approved" ? "rgba(21,128,61,0.04)" : undefined,
                    }}
                  >
                    {/* Mobile */}
                    <div className="sm:hidden">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, color: "#5D0F17", fontSize: 13 }}>#{e.rank}</span>
                        <span style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          background: e.status === "approved" ? "rgba(21,128,61,0.1)" : "rgba(217,119,6,0.1)",
                          color: e.status === "approved" ? "#15803d" : "#d97706",
                        }}>
                          {e.status}
                        </span>
                      </div>
                      <p style={{ color: "#5D0F17", fontSize: 13, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {e.email}
                      </p>
                      <p style={{ color: "rgba(93,15,23,0.5)", fontSize: 12, marginTop: 2 }}>
                        {e.referralCount} referral{e.referralCount !== 1 ? "s" : ""} · {tierLabel(e.referralCount)}
                      </p>
                    </div>

                    {/* Desktop */}
                    <div
                      className="hidden sm:grid"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "56px 1fr 100px 120px 110px 110px",
                        gap: 12,
                        fontSize: 13,
                        alignItems: "center",
                      }}
                    >
                      <div style={{ color: "rgba(93,15,23,0.4)", fontWeight: 600 }}>#{e.rank}</div>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#5D0F17" }}>
                        {e.email}
                      </div>
                      <div style={{ color: e.referralCount > 0 ? "#5D0F17" : "rgba(93,15,23,0.35)", fontWeight: e.referralCount > 0 ? 600 : 400 }}>
                        {e.referralCount}
                      </div>
                      <div style={{ color: "rgba(93,15,23,0.5)", fontSize: 12 }}>
                        {tierLabel(e.referralCount)}
                      </div>
                      <div>
                        <span style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          background: e.status === "approved" ? "rgba(21,128,61,0.1)" : "rgba(217,119,6,0.1)",
                          color: e.status === "approved" ? "#15803d" : "#d97706",
                        }}>
                          {e.status}
                        </span>
                      </div>
                      <div style={{ color: "rgba(93,15,23,0.5)" }}>{formatDate(e.createdAt)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
