"use client";

import { useEffect, useState } from "react";

function NewArrivalsPanel() {
 const [status, setStatus] = useState<string | null>(null);
 const [loading, setLoading] = useState(false);

 async function callRoute(body: object) {
 setLoading(true);
 setStatus(null);
 try {
 const res = await fetch("/api/admin/send-new-arrivals", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify(body),
 });
 const data = await res.json();
 setStatus(JSON.stringify(data, null, 2));
 } catch {
 setStatus("Request failed");
 } finally {
 setLoading(false);
 }
 }

 return (
 <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: "24px", marginBottom: 32 }}>
 <h2 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#a1a1aa", fontWeight: 500, marginBottom: 8 }}>New Arrivals Email</h2>
 <p style={{ fontSize: 13, color: "#71717a", marginBottom: 16 }}>
 Preview how many products are in the current window, then send to all approved pilot users.
 </p>
 <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
 <button
 onClick={() => callRoute({ preview: true })}
 disabled={loading}
 style={{ padding: "8px 16px", border: "1px solid #e4e4e7", background: "#fff", color: "#09090b", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1, fontSize: 12, fontWeight: 500, borderRadius: 6 }}
 >
 Preview
 </button>
 <button
 onClick={() => { if (confirm("Send new arrivals email to all approved users?")) callRoute({ send: true }); }}
 disabled={loading}
 style={{ padding: "8px 16px", background: "#18181b", border: "none", color: "#fff", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1, fontSize: 12, fontWeight: 500, borderRadius: 6 }}
 >
 {loading ? "Sending…" : "Send to Everyone"}
 </button>
 </div>
 {status && (
 <pre style={{ marginTop: 16, padding: 12, background: "#f4f4f5", fontSize: 12, color: "#09090b", borderRadius: 4, overflowX: "auto", whiteSpace: "pre-wrap" }}>
 {status}
 </pre>
 )}
 </div>
 );
}

function FeedbackEmailPanel() {
 const [status, setStatus] = useState<string | null>(null);
 const [loading, setLoading] = useState(false);
 const [testEmail, setTestEmail] = useState("");

 async function callRoute(body: object) {
 setLoading(true);
 setStatus(null);
 try {
 const res = await fetch("/api/admin/send-feedback-email", {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify(body),
 });
 const data = await res.json();
 setStatus(JSON.stringify(data, null, 2));
 } catch {
 setStatus("Request failed");
 } finally {
 setLoading(false);
 }
 }

 return (
 <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, padding: "24px", marginBottom: 32 }}>
 <h2 style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#a1a1aa", fontWeight: 500, marginBottom: 8 }}>Feedback Form Email</h2>
 <p style={{ fontSize: 13, color: "#71717a", marginBottom: 16 }}>
 Send a feedback request to active users (users who have clicked, saved, or ordered at least once). Links to the Typeform survey.
 </p>

 {/* Test email input */}
 <div style={{ marginBottom: 16 }}>
 <label style={{ fontSize: 11, color: "#a1a1aa", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 500 }}>
 Send test to a single email
 </label>
 <div style={{ display: "flex", gap: 8 }}>
 <input
 type="email"
 value={testEmail}
 onChange={(e) => setTestEmail(e.target.value)}
 placeholder="email@example.com"
 style={{ flex: 1, maxWidth: 300, padding: "8px 12px", border: "1px solid #e4e4e7", borderRadius: 6, fontSize: 13, color: "#09090b", outline: "none" }}
 />
 <button
 onClick={() => { if (testEmail.trim()) callRoute({ testEmail: testEmail.trim() }); }}
 disabled={loading || !testEmail.trim()}
 style={{ padding: "8px 16px", background: "#18181b", border: "none", color: "#fff", cursor: loading || !testEmail.trim() ? "not-allowed" : "pointer", opacity: loading || !testEmail.trim() ? 0.5 : 1, fontSize: 12, fontWeight: 500, borderRadius: 6 }}
 >
 Send Test
 </button>
 </div>
 </div>

 <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
 <button
 onClick={() => callRoute({ preview: true })}
 disabled={loading}
 style={{ padding: "8px 16px", border: "1px solid #e4e4e7", background: "#fff", color: "#09090b", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1, fontSize: 12, fontWeight: 500, borderRadius: 6 }}
 >
 Preview
 </button>
 <button
 onClick={() => { if (confirm("Send feedback email to ALL active users?")) callRoute({ send: true }); }}
 disabled={loading}
 style={{ padding: "8px 16px", background: "#18181b", border: "none", color: "#fff", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1, fontSize: 12, fontWeight: 500, borderRadius: 6 }}
 >
 {loading ? "Sending…" : "Send to Everyone"}
 </button>
 </div>
 {status && (
 <pre style={{ marginTop: 16, padding: 12, background: "#f4f4f5", fontSize: 12, color: "#09090b", borderRadius: 4, overflowX: "auto", whiteSpace: "pre-wrap" }}>
 {status}
 </pre>
 )}
 </div>
 );
}

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
 <main style={{ background: "#f8f9fa", minHeight: "100vh" }}>

 {/* Page title */}
 <section style={{ background: "#fff", borderBottom: "1px solid #e4e4e7" }}>
 <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>
 <h1 style={{ fontSize: 20, fontWeight: 600, color: "#09090b", marginBottom: 8 }}>
 Emails
 </h1>
 <p style={{ fontSize: 14, color: "#71717a" }}>
 All waitlist signups from the Neon database.
 </p>
 </div>
 </section>

 {/* Email Send Panels */}
 <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 24px 0" }}>
 <NewArrivalsPanel />
 <FeedbackEmailPanel />
 </div>

 {/* Stats & Actions */}
 <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 24px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
 <div style={{ display: "flex", flexWrap: "wrap", gap: 32 }}>
 <div>
 <p style={{ fontSize: 28, fontWeight: 600, color: "#09090b", lineHeight: 1 }}>{emails.length}</p>
 <p style={{ fontSize: 12, color: "#71717a", marginTop: 4 }}>Total signups</p>
 </div>
 {emails.length > 0 && (
 <div className="hidden sm:block">
 <p style={{ fontSize: 18, fontWeight: 600, color: "#09090b", lineHeight: 1 }}>
 {formatDate(emails[0]?.signupDate)}
 </p>
 <p style={{ fontSize: 12, color: "#71717a", marginTop: 4 }}>Latest signup</p>
 </div>
 )}
 </div>
 <button
 onClick={exportToCSV}
 disabled={emails.length === 0}
 style={{ padding: "8px 16px", border: "1px solid #e4e4e7", background: "#fff", color: "#09090b", cursor: emails.length === 0 ? "not-allowed" : "pointer", opacity: emails.length === 0 ? 0.5 : 1, fontSize: 12, fontWeight: 500, borderRadius: 6 }}
 >
 Export CSV
 </button>
 </div>

 {/* Content */}
 <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 48px" }}>
 {loading ? (
 <div style={{ textAlign: "center", padding: "64px 0", color: "#a1a1aa", fontSize: 14 }}>
 Loading emails...
 </div>
 ) : error ? (
 <div style={{ textAlign: "center", padding: "64px 0", color: "#dc2626", fontSize: 14 }}>
 {error}
 </div>
 ) : emails.length === 0 ? (
 <div style={{ background: "#fff", border: "1px dashed #e4e4e7", borderRadius: 8, padding: "32px 24px", textAlign: "center" }}>
 <p style={{ color: "#71717a", marginBottom: 8 }}>No waitlist signups yet.</p>
 <p style={{ fontSize: 12, color: "#a1a1aa" }}>
 Signups will appear here once visitors join the waitlist.
 </p>
 </div>
 ) : (
 <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, overflow: "hidden" }}>
 {/* Desktop Header */}
 <div className="hidden sm:grid grid-cols-12 gap-4" style={{ padding: "10px 24px", background: "#fafafa", borderBottom: "1px solid #e4e4e7", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "#a1a1aa", fontWeight: 500 }}>
 <div className="col-span-1">#</div>
 <div className="col-span-5">Email</div>
 <div className="col-span-3">Signup Date</div>
 <div className="col-span-3">Source</div>
 </div>

 <div style={{ maxHeight: 600, overflowY: "auto" }}>
 {emails.map((entry, index) => (
 <div
 key={entry.email}
 style={{ padding: "14px 24px", borderBottom: "1px solid #f4f4f5" }}
 onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
 onMouseLeave={(e) => (e.currentTarget.style.background = "")}
 >
 {/* Mobile Layout */}
 <div className="sm:hidden">
 <p style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#09090b" }}>{entry.email}</p>
 <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "#71717a" }}>
 <span>{formatDate(entry.signupDate)}</span>
 <span>{entry.source || "waitlist"}</span>
 </div>
 </div>
 {/* Desktop Layout */}
 <div className="hidden sm:grid grid-cols-12 gap-4" style={{ fontSize: 13 }}>
 <div className="col-span-1" style={{ color: "#a1a1aa" }}>{index + 1}</div>
 <div className="col-span-5" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#09090b" }}>{entry.email}</div>
 <div className="col-span-3" style={{ color: "#71717a" }}>{formatDate(entry.signupDate)}</div>
 <div className="col-span-3" style={{ color: "#71717a" }}>{entry.source || "waitlist"}</div>
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
