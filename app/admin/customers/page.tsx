"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminNav from "@/app/components/AdminNav";

type Customer = {
  email: string;
  name: string | null;
  phone: string | null;
  status: string;
  signedUpAt: string;
  approvedAt: string | null;
  referralCode: string | null;
  referredBy: string | null;
  loginMethod: string;
  emailSubscribe: boolean;
  activityScore: number;
};

type ActivityData = {
  userId: string | null;
  favorites: { product_id: number; title: string | null; image: string | null; store_name: string | null; price: string | null; created_at: string }[];
  cart: { product_id: number; product_title: string; product_image: string | null; store_name: string; price: string; currency: string; added_at: string }[];
  clicks: { click_id: string; product_name: string; store: string; store_slug: string; timestamp: string }[];
  orders: { order_id: string; order_total: number; store_name: string; timestamp: string }[];
};

type UnmatchedConversion = {
  conversionId: string;
  timestamp: string;
  orderId: string;
  orderTotal: number;
  currency: string;
  storeName: string;
};

function fmtTime(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ClickMatchRow({ click, userId, onMatchSuccess }: { click: ActivityData["clicks"][number]; userId: string; onMatchSuccess: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [conversions, setConversions] = useState<UnmatchedConversion[]>([]);
  const [loadingConv, setLoadingConv] = useState(false);
  const [matching, setMatching] = useState<string | null>(null);
  const [matched, setMatched] = useState<string | null>(null);

  function toggle() {
    if (!expanded) {
      setLoadingConv(true);
      fetch(`/api/admin/conversions?filter=unmatched&store=${encodeURIComponent(click.store_slug)}`)
        .then((r) => r.json())
        .then((d) => { setConversions(d.conversions ?? []); setLoadingConv(false); })
        .catch(() => setLoadingConv(false));
    }
    setExpanded((v) => !v);
  }

  async function matchConversion(conversionId: string) {
    setMatching(conversionId);
    const res = await fetch(`/api/admin/conversions/${conversionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clickId: click.click_id, userId }),
    });
    setMatching(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? "Failed to match order");
      return;
    }
    setMatched(conversionId);
    setConversions((prev) => prev.filter((c) => c.conversionId !== conversionId));
    onMatchSuccess();
  }

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, color: "#5D0F17", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{click.product_name}</p>
          <p style={{ fontSize: 11, color: "rgba(93,15,23,0.5)", margin: 0 }}>{click.store}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <p style={{ fontSize: 11, color: "rgba(93,15,23,0.35)", whiteSpace: "nowrap" }}>{fmtTime(click.timestamp)}</p>
          <button
            onClick={toggle}
            style={{ fontSize: 10, padding: "2px 8px", background: expanded ? "#5D0F17" : "transparent", color: expanded ? "#fff" : "#5D0F17", border: "1px solid rgba(93,15,23,0.3)", borderRadius: 4, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            {expanded ? "Hide" : "Match order"}
          </button>
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: 6, marginLeft: 0, borderLeft: "2px solid rgba(93,15,23,0.15)", paddingLeft: 10 }}>
          {loadingConv ? (
            <p style={{ fontSize: 12, color: "rgba(93,15,23,0.4)" }}>Loading orders…</p>
          ) : conversions.length === 0 ? (
            <p style={{ fontSize: 12, color: "rgba(93,15,23,0.4)" }}>No unmatched orders for this store.</p>
          ) : (
            conversions.map((conv) => (
              <div key={conv.conversionId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6, padding: "6px 8px", background: "#faf9f7", border: "1px solid #e5e7eb", borderRadius: 4 }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#111827", margin: 0 }}>
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: conv.currency || "USD", maximumFractionDigits: 0 }).format(conv.orderTotal)}
                  </p>
                  <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>{fmtTime(conv.timestamp)} · <span style={{ fontFamily: "monospace" }}>{conv.orderId.slice(0, 20)}</span></p>
                </div>
                {matched === conv.conversionId ? (
                  <span style={{ fontSize: 11, color: "#065f46", fontWeight: 600 }}>Matched ✓</span>
                ) : (
                  <button
                    onClick={() => matchConversion(conv.conversionId)}
                    disabled={matching === conv.conversionId}
                    style={{ fontSize: 11, padding: "3px 10px", background: "#5D0F17", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", whiteSpace: "nowrap", opacity: matching === conv.conversionId ? 0.6 : 1 }}
                  >
                    {matching === conv.conversionId ? "…" : "Match"}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ActivityPanel({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);

  function loadActivity() {
    setLoading(true);
    fetch(`/api/admin/customers/activity?email=${encodeURIComponent(customer.email)}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { loadActivity(); }, [customer.email]);

  const section = (title: string, count: number) => (
    <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(93,15,23,0.5)", fontWeight: 600, margin: "24px 0 10px" }}>
      {title} <span style={{ color: "#5D0F17" }}>({count})</span>
    </p>
  );

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 100 }} />

      {/* Panel */}
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 420, background: "#fff", zIndex: 101, overflowY: "auto", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ fontWeight: 600, color: "#5D0F17", fontSize: 15, margin: 0 }}>{customer.name || "—"}</p>
            <p style={{ fontSize: 12, color: "rgba(93,15,23,0.5)", margin: "2px 0 0" }}>{customer.email}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(93,15,23,0.4)", lineHeight: 1, padding: 0 }}>×</button>
        </div>

        <div style={{ padding: "0 24px 32px" }}>
          {loading ? (
            <p style={{ fontSize: 13, color: "rgba(93,15,23,0.4)", marginTop: 24 }}>Loading…</p>
          ) : !data?.userId ? (
            <p style={{ fontSize: 13, color: "rgba(93,15,23,0.4)", marginTop: 24 }}>No account activity yet — user hasn&apos;t signed in.</p>
          ) : (
            <>
              {/* Favorites */}
              {section("Liked Items", data.favorites.length)}
              {data.favorites.length === 0 ? <p style={{ fontSize: 13, color: "rgba(93,15,23,0.35)" }}>None</p> : data.favorites.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  {f.image ? <img src={f.image} alt="" style={{ width: 40, height: 40, objectFit: "cover", flexShrink: 0 }} /> : <div style={{ width: 40, height: 40, background: "#F7F3EA", flexShrink: 0 }} />}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: "#5D0F17", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.title || "Unknown"}</p>
                    <p style={{ fontSize: 11, color: "rgba(93,15,23,0.5)", margin: 0 }}>{f.store_name} {f.price ? `· $${f.price}` : ""}</p>
                  </div>
                </div>
              ))}

              {/* Cart */}
              {section("In Cart", data.cart.length)}
              {data.cart.length === 0 ? <p style={{ fontSize: 13, color: "rgba(93,15,23,0.35)" }}>None</p> : data.cart.map((c, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
                  {c.product_image ? <img src={c.product_image} alt="" style={{ width: 40, height: 40, objectFit: "cover", flexShrink: 0 }} /> : <div style={{ width: 40, height: 40, background: "#F7F3EA", flexShrink: 0 }} />}
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: "#5D0F17", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.product_title}</p>
                    <p style={{ fontSize: 11, color: "rgba(93,15,23,0.5)", margin: 0 }}>{c.store_name} · ${c.price}</p>
                  </div>
                </div>
              ))}

              {/* Clicks */}
              {section("Clicked Through to Store", data.clicks.length)}
              {data.clicks.length === 0 ? <p style={{ fontSize: 13, color: "rgba(93,15,23,0.35)" }}>None</p> : data.clicks.map((c, i) => (
                <ClickMatchRow key={i} click={c} userId={data.userId!} onMatchSuccess={loadActivity} />
              ))}

              {/* Orders */}
              {section("Orders", data.orders.length)}
              {data.orders.length === 0 ? <p style={{ fontSize: 13, color: "rgba(93,15,23,0.35)" }}>None</p> : data.orders.map((o, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div>
                    <p style={{ fontSize: 13, color: "#5D0F17", margin: 0 }}>{o.store_name}</p>
                    <p style={{ fontSize: 11, color: "rgba(93,15,23,0.5)", margin: 0 }}>{fmtTime(o.timestamp)}</p>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#5D0F17" }}>${Number(o.order_total).toFixed(2)}</p>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function fmt(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "approved" | "pending">("all");
  const [search, setSearch] = useState("");
  const [approving, setApproving] = useState<string | null>(null);
  const [approvingAll, setApprovingAll] = useState(false);
  const [emailProgress, setEmailProgress] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [sendingNewArrivals, setSendingNewArrivals] = useState(false);
  const [newArrivalsResult, setNewArrivalsResult] = useState<string | null>(null);

  async function handleSendNewArrivals() {
    if (!confirm("Send New Arrivals email to all approved users?")) return;
    setSendingNewArrivals(true);
    setNewArrivalsResult(null);
    try {
      const res = await fetch("/api/admin/send-new-arrivals-all", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setNewArrivalsResult(`Error: ${data.error}`);
      } else {
        setNewArrivalsResult(`Sent to ${data.sent} users (${data.productCount} products)`);
      }
      setTimeout(() => setNewArrivalsResult(null), 6000);
    } finally {
      setSendingNewArrivals(false);
    }
  }

  async function handleApproveAll() {
    const pendingCustomers = customers.filter((c) => c.status !== "approved");
    if (pendingCustomers.length === 0) return;
    if (!confirm(`Approve all ${pendingCustomers.length} pending customers? This will send approval emails to each one.`)) return;
    setApprovingAll(true);
    setEmailProgress("Approving...");
    try {
      const res = await fetch("/api/admin/customers/approve-all", { method: "POST" });
      if (!res.ok) return;
      const { approved } = await res.json();
      setCustomers((prev) => prev.map((c) => ({ ...c, status: c.status !== "approved" ? "approved" : c.status })));

      // Send emails in batches of 50 until done
      let remaining = approved;
      let totalSent = 0;
      while (remaining > 0) {
        setEmailProgress(`Sending emails… ${totalSent} sent, ${remaining} remaining`);
        const emailRes = await fetch("/api/admin/customers/send-emails", { method: "POST" });
        if (!emailRes.ok) break;
        const data = await emailRes.json();
        totalSent += data.sent ?? 0;
        remaining = data.remaining ?? 0;
        if (data.sent === 0) break; // nothing was sent, stop to avoid infinite loop
      }
      setEmailProgress(`Done — ${totalSent} emails sent`);
      setTimeout(() => setEmailProgress(null), 4000);
    } finally {
      setApprovingAll(false);
    }
  }

  async function handleApprove(email: string, name: string | null) {
    setApproving(email);
    try {
      const res = await fetch("/api/admin/customers/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName: name?.split(" ")[0] ?? undefined }),
      });
      if (res.ok) {
        setCustomers((prev) =>
          prev.map((c) => c.email === email ? { ...c, status: "approved" } : c)
        );
      }
    } finally {
      setApproving(null);
    }
  }

  useEffect(() => {
    fetch(`/api/admin/customers?t=${Date.now()}`)
      .then((r) => r.json())
      .then((d) => {
        setCustomers(d.customers ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load customers.");
        setLoading(false);
      });
  }, []);

  const filtered = customers.filter((c) => {
    if (filter === "approved" && c.status !== "approved") return false;
    if (filter === "pending" && c.status === "approved") return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.email.toLowerCase().includes(q) ||
        (c.name?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  const approved = customers.filter((c) => c.status === "approved").length;
  const pending = customers.filter((c) => c.status !== "approved").length;
  const loggedIn = customers.filter((c) => c.loginMethod === "Google").length;

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ["Email", "Name", "Phone", "Status", "Login Method", "Signed Up", "Approved", "Referral Code", "Referred By", "Email Subscribe"];
    const rows = filtered.map((c) => [
      c.email,
      c.name ?? "",
      c.phone ?? "",
      c.status,
      c.loginMethod,
      fmt(c.signedUpAt),
      fmt(c.approvedAt),
      c.referralCode ?? "",
      c.referredBy ?? "",
      c.emailSubscribe ? "Yes" : "No",
    ]);

    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `vya-customers-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  return (
    <>
    <main style={{ background: "#F7F3EA", minHeight: "100vh" }}>
      <AdminNav />

      {/* Page title */}
      <section style={{ background: "#fff", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 24px" }}>
          <h1 className="font-serif" style={{ fontSize: 28, color: "#5D0F17", marginBottom: 8 }}>
            Customers
          </h1>
          <p style={{ fontSize: 15, color: "rgba(93,15,23,0.6)" }}>
            Everyone who has signed up for the VYA pilot.{" "}
            <Link href="/admin/analytics" style={{ color: "#5D0F17", textDecoration: "underline" }}>
              View click &amp; purchase analytics →
            </Link>
          </p>
        </div>
      </section>

      {/* Stats */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 24px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 32 }}>
          {[
            { label: "Total", value: customers.length },
            { label: "Approved", value: approved },
            { label: "Pending", value: pending },
            { label: "Via Google", value: loggedIn },
          ].map((s) => (
            <div key={s.label}>
              <p className="font-serif" style={{ fontSize: 28, color: "#5D0F17", lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: 11, color: "rgba(93,15,23,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>{s.label}</p>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {(pending > 0 || approvingAll) && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <button
                onClick={handleApproveAll}
                disabled={approvingAll}
                style={{ padding: "10px 24px", border: "none", background: "#5D0F17", color: "#F7F3EA", cursor: approvingAll ? "not-allowed" : "pointer", opacity: approvingAll ? 0.6 : 1, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}
              >
                {approvingAll ? "Working…" : `Approve All (${pending})`}
              </button>
              {emailProgress && (
                <p style={{ fontSize: 11, color: "rgba(93,15,23,0.6)", margin: 0 }}>{emailProgress}</p>
              )}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <button
              onClick={handleSendNewArrivals}
              disabled={sendingNewArrivals}
              style={{ padding: "10px 24px", border: "none", background: "#5D0F17", color: "#F7F3EA", cursor: sendingNewArrivals ? "not-allowed" : "pointer", opacity: sendingNewArrivals ? 0.6 : 1, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}
            >
              {sendingNewArrivals ? "Sending…" : "Send New Arrivals Email"}
            </button>
            {newArrivalsResult && (
              <p style={{ fontSize: 11, color: "rgba(93,15,23,0.6)", margin: 0 }}>{newArrivalsResult}</p>
            )}
          </div>
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            style={{ padding: "10px 24px", border: "1px solid #5D0F17", background: "transparent", color: "#5D0F17", cursor: filtered.length === 0 ? "not-allowed" : "pointer", opacity: filtered.length === 0 ? 0.4 : 1, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 16px" }}>
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", padding: "12px 20px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {(["all", "approved", "pending"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  padding: "5px 14px",
                  border: "1px solid",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  background: filter === f ? "#5D0F17" : "transparent",
                  color: filter === f ? "#F7F3EA" : "#5D0F17",
                  borderColor: filter === f ? "#5D0F17" : "rgba(93,15,23,0.3)",
                }}
              >
                {f}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search by email or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginLeft: "auto", border: "1px solid rgba(93,15,23,0.3)", padding: "6px 12px", fontSize: 13, color: "#5D0F17", outline: "none", width: 256 }}
          />
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 48px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "64px 0", color: "rgba(93,15,23,0.4)", fontSize: 14 }}>Loading…</div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "64px 0", color: "#b91c1c", fontSize: 14 }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0", color: "rgba(93,15,23,0.4)", fontSize: 14 }}>No customers found.</div>
        ) : (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb", background: "#F7F3EA" }}>
                  {["#", "Name / Email", "Status", "Login", "Signed Up", "Approved", "Referral Code", "Referred By", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(93,15,23,0.5)", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.email} onClick={() => setSelectedCustomer(c)} style={{ borderBottom: "1px solid #e5e7eb", cursor: "pointer" }} onMouseEnter={e => (e.currentTarget.style.background = "#faf9f7")} onMouseLeave={e => (e.currentTarget.style.background = "")}>
                    <td style={{ padding: "12px 16px", color: "rgba(93,15,23,0.3)" }}>{i + 1}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <p style={{ fontWeight: 500, color: "#5D0F17", margin: 0 }}>{c.name || "—"}</p>
                        {c.activityScore > 0 && (
                          <span title={`Activity score: ${c.activityScore} (clicks + likes + cart + orders)`} style={{ fontSize: 10, background: "#5D0F17", color: "#F7F3EA", padding: "1px 6px", borderRadius: 10 }}>{c.activityScore} actions</span>
                        )}
                      </div>
                      <p style={{ fontSize: 11, color: "rgba(93,15,23,0.5)", margin: 0 }}>{c.email}</p>
                      {c.phone && <p style={{ fontSize: 11, color: "rgba(93,15,23,0.5)", margin: 0 }}>{c.phone}</p>}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        display: "inline-block",
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        padding: "2px 8px",
                        fontWeight: 600,
                        background: c.status === "approved" ? "#dcfce7" : c.status === "waitlist" ? "#f3f4f6" : "#fffbeb",
                        color: c.status === "approved" ? "#166534" : c.status === "waitlist" ? "#6b7280" : "#92400e",
                      }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: c.loginMethod === "Google" ? "#2563eb" : "rgba(93,15,23,0.5)" }}>
                        {c.loginMethod === "Google" ? (
                          <svg style={{ width: 12, height: 12 }} viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                        ) : (
                          <svg style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        )}
                        {c.loginMethod}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "rgba(93,15,23,0.5)" }}>{fmt(c.signedUpAt)}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "rgba(93,15,23,0.5)" }}>{fmt(c.approvedAt)}</td>
                    <td style={{ padding: "12px 16px" }}>
                      {c.referralCode ? (
                        <code style={{ fontSize: 11, background: "#F7F3EA", padding: "2px 6px", color: "#5D0F17", fontFamily: "monospace" }}>{c.referralCode}</code>
                      ) : "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {c.referredBy ? (
                        <code style={{ fontSize: 11, background: "#fffbeb", color: "#92400e", padding: "2px 6px", fontFamily: "monospace" }}>{c.referredBy}</code>
                      ) : "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      {c.status !== "approved" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleApprove(c.email, c.name); }}
                          disabled={approving === c.email}
                          style={{
                            fontSize: 11,
                            padding: "4px 12px",
                            background: "#5D0F17",
                            color: "#F7F3EA",
                            border: "none",
                            cursor: approving === c.email ? "not-allowed" : "pointer",
                            opacity: approving === c.email ? 0.6 : 1,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {approving === c.email ? "…" : "Approve"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 11, color: "rgba(93,15,23,0.4)", padding: "10px 16px" }}>
              Showing {filtered.length} of {customers.length} customers
            </p>
          </div>
        )}
      </div>
    </main>
    {selectedCustomer && (
      <ActivityPanel customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} />
    )}
    </>
  );
}
