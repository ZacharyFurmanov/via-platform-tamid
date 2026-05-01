"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface EmailEntry {
  email: string;
  signupDate: string;
  source?: string;
}

export default function AdminWaitlistPage() {
  const [emails, setEmails] = useState<EmailEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [addStatus, setAddStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [addMessage, setAddMessage] = useState("");

  const fetchEmails = async () => {
    try {
      const res = await fetch("/api/waitlist");
      if (res.ok) {
        const data = await res.json();
        setEmails(data.emails || []);
      }
    } catch (err) {
      console.error("Failed to fetch waitlist:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setAddStatus("loading");
    setAddMessage("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, source: "manual" }),
      });

      const data = await res.json();

      if (res.ok) {
        setAddStatus("success");
        setAddMessage(data.message);
        setNewEmail("");
        fetchEmails();
        setTimeout(() => {
          setAddStatus("idle");
          setAddMessage("");
        }, 2000);
      } else {
        setAddStatus("error");
        setAddMessage(data.error || "Failed to add email");
      }
    } catch {
      setAddStatus("error");
      setAddMessage("Failed to add email");
    }
  };

  const handleExportCSV = () => {
    if (emails.length === 0) return;

    const header = "email,signup_date,source";
    const rows = emails.map(
      (e) => `${e.email},${e.signupDate},${e.source || "waitlist"}`
    );
    const csv = [header, ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `via-waitlist-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main style={{ minHeight: "100vh", background: "#f8f9fa" }}>
      <div style={{ maxWidth: 896, margin: "0 auto", padding: "48px 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: "#09090b", marginBottom: 4 }}>Waitlist</h1>
            <p style={{ fontSize: 14, color: "#71717a" }}>
              {loading ? "Loading..." : `${emails.length} email${emails.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={handleExportCSV}
              disabled={emails.length === 0}
              style={{
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 500,
                background: "#fff",
                color: "#09090b",
                border: "1px solid #e4e4e7",
                borderRadius: 6,
                cursor: emails.length === 0 ? "not-allowed" : "pointer",
                opacity: emails.length === 0 ? 0.3 : 1,
              }}
            >
              Export CSV
            </button>
            <Link
              href="/admin/sync"
              style={{ padding: "8px 16px", fontSize: 12, color: "#71717a", textDecoration: "none", border: "1px solid #e4e4e7", borderRadius: 6, background: "#fff" }}
            >
              Admin Home
            </Link>
          </div>
        </div>

        {/* Add Email Form */}
        <div style={{ marginBottom: 32, padding: 24, background: "#fafafa", border: "1px solid #e4e4e7", borderRadius: 8 }}>
          <h2 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#a1a1aa", fontWeight: 500, marginBottom: 16 }}>
            Add Email Manually
          </h2>
          <form onSubmit={handleAddEmail} style={{ display: "flex", gap: 12 }}>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                if (addStatus === "error") setAddStatus("idle");
              }}
              placeholder="email@example.com"
              required
              style={{
                flex: 1,
                padding: "10px 14px",
                border: "1px solid #e4e4e7",
                borderRadius: 6,
                fontSize: 13,
                color: "#09090b",
                outline: "none",
                background: "#fff",
              }}
            />
            <button
              type="submit"
              disabled={addStatus === "loading" || !newEmail.trim()}
              style={{
                padding: "10px 24px",
                background: "#18181b",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                opacity: addStatus === "loading" || !newEmail.trim() ? 0.5 : 1,
              }}
            >
              {addStatus === "loading" ? "Adding..." : "Add"}
            </button>
          </form>
          {addMessage && (
            <p style={{ fontSize: 13, marginTop: 8, color: addStatus === "error" ? "#dc2626" : "#15803d" }}>
              {addMessage}
            </p>
          )}
        </div>

        {/* Email Table */}
        {loading ? (
          <p style={{ color: "#a1a1aa", textAlign: "center", padding: "48px 0", fontSize: 14 }}>Loading...</p>
        ) : emails.length === 0 ? (
          <p style={{ color: "#a1a1aa", textAlign: "center", padding: "48px 0", fontSize: 14 }}>No emails yet.</p>
        ) : (
          <div style={{ border: "1px solid #e4e4e7", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#fafafa", borderBottom: "1px solid #e4e4e7" }}>
                  {["#", "Email", "Date", "Source"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "10px 16px",
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "#a1a1aa",
                        fontWeight: 500,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {emails.map((entry, i) => (
                  <tr
                    key={entry.email}
                    style={{
                      borderBottom: i < emails.length - 1 ? "1px solid #e4e4e7" : "none",
                      background: "#fff",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                  >
                    <td style={{ padding: "10px 16px", color: "#a1a1aa", fontSize: 12 }}>{i + 1}</td>
                    <td style={{ padding: "10px 16px", color: "#09090b" }}>{entry.email}</td>
                    <td style={{ padding: "10px 16px", color: "#71717a" }}>
                      {new Date(entry.signupDate).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "10px 16px", color: "#71717a" }}>
                      {entry.source || "waitlist"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
