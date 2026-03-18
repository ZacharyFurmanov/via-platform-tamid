"use client";

import { useEffect, useState } from "react";
import AdminNav from "@/app/components/AdminNav";

type EmailEntry = {
  email: string;
  signupDate: string;
  source?: string;
};

export default function EmailsAdminPage() {
  const [emails, setEmails] = useState<EmailEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEmails() {
      try {
        const res = await fetch("/api/waitlist");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setEmails(data.emails || []);
      } catch (err) {
        setError("Failed to load emails");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchEmails();
  }, []);

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

  const exportToCSV = () => {
    if (emails.length === 0) return;

    const headers = ["Email", "Signup Date", "Source"];
    const rows = emails.map((e) => [
      e.email,
      formatDate(e.signupDate),
      e.source || "waitlist",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `via-waitlist-emails-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  return (
    <main style={{ background: "#F7F3EA", minHeight: "100vh" }}>
      <AdminNav />

      {/* Page title */}
      <section style={{ background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px" }}>
          <h1 className="font-serif" style={{ fontSize: 28, color: "#5D0F17", marginBottom: 8 }}>
            Emails
          </h1>
          <p style={{ fontSize: 15, color: "rgba(93,15,23,0.6)" }}>
            All waitlist signups from the Neon database.
          </p>
        </div>
      </section>

      {/* Stats & Actions */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 24px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 32 }}>
          <div>
            <p className="font-serif" style={{ fontSize: 28, color: "#5D0F17", lineHeight: 1 }}>{emails.length}</p>
            <p style={{ fontSize: 12, color: "rgba(93,15,23,0.5)", marginTop: 4 }}>Total signups</p>
          </div>
          {emails.length > 0 && (
            <div className="hidden sm:block">
              <p className="font-serif" style={{ fontSize: 18, color: "#5D0F17", lineHeight: 1 }}>
                {formatDate(emails[0]?.signupDate)}
              </p>
              <p style={{ fontSize: 12, color: "rgba(93,15,23,0.5)", marginTop: 4 }}>Latest signup</p>
            </div>
          )}
        </div>
        <button
          onClick={exportToCSV}
          disabled={emails.length === 0}
          style={{ padding: "10px 24px", border: "1px solid #5D0F17", background: "transparent", color: "#5D0F17", cursor: emails.length === 0 ? "not-allowed" : "pointer", opacity: emails.length === 0 ? 0.5 : 1, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}
        >
          Export CSV
        </button>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 48px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "64px 0", color: "rgba(93,15,23,0.4)", fontSize: 14 }}>
            Loading emails...
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "64px 0", color: "#b91c1c", fontSize: 14 }}>
            {error}
          </div>
        ) : emails.length === 0 ? (
          <div style={{ background: "#fff", border: "1px dashed #e5e7eb", padding: "32px 24px", textAlign: "center" }}>
            <p style={{ color: "rgba(93,15,23,0.5)", marginBottom: 8 }}>No waitlist signups yet.</p>
            <p style={{ fontSize: 12, color: "rgba(93,15,23,0.4)" }}>
              Signups will appear here once visitors join the waitlist.
            </p>
          </div>
        ) : (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb" }}>
            {/* Desktop Header */}
            <div className="hidden sm:grid grid-cols-12 gap-4" style={{ padding: "12px 24px", background: "#F7F3EA", borderBottom: "1px solid #e5e7eb", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(93,15,23,0.5)" }}>
              <div className="col-span-1">#</div>
              <div className="col-span-5">Email</div>
              <div className="col-span-3">Signup Date</div>
              <div className="col-span-3">Source</div>
            </div>

            <div style={{ maxHeight: 600, overflowY: "auto" }}>
              {emails.map((entry, index) => (
                <div
                  key={entry.email}
                  style={{ padding: "16px 24px", borderBottom: "1px solid #e5e7eb" }}
                >
                  {/* Mobile Layout */}
                  <div className="sm:hidden">
                    <p style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#5D0F17" }}>{entry.email}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "rgba(93,15,23,0.5)" }}>
                      <span>{formatDate(entry.signupDate)}</span>
                      <span>{entry.source || "waitlist"}</span>
                    </div>
                  </div>
                  {/* Desktop Layout */}
                  <div className="hidden sm:grid grid-cols-12 gap-4" style={{ fontSize: 13 }}>
                    <div className="col-span-1" style={{ color: "rgba(93,15,23,0.3)" }}>{index + 1}</div>
                    <div className="col-span-5" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#5D0F17" }}>{entry.email}</div>
                    <div className="col-span-3" style={{ color: "rgba(93,15,23,0.5)" }}>{formatDate(entry.signupDate)}</div>
                    <div className="col-span-3" style={{ color: "rgba(93,15,23,0.5)" }}>{entry.source || "waitlist"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
