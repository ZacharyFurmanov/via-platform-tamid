"use client";

import { useEffect, useState, useCallback } from "react";
import AdminNav from "@/app/components/AdminNav";

type Conversion = {
  conversionId: string;
  timestamp: string;
  orderId: string;
  orderTotal: number;
  currency: string;
  storeSlug: string;
  storeName: string;
  matched: boolean;
  viaClickId: string | null;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  matchedClickData: { clickId?: string; productName?: string; source?: string } | null;
  items: { productName: string; quantity: number; price: number }[];
};

type CandidateClick = {
  clickId: string;
  timestamp: string;
  productName: string;
  storeSlug: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
};

const MAROON = "#5D0F17";

function fmt(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}
function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function minsApart(a: string, b: string) {
  return Math.round(Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 60000);
}

export default function AdminConversionsPage() {
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"unmatched" | "all">("unmatched");
  const [selected, setSelected] = useState<Conversion | null>(null);
  const [candidates, setCandidates] = useState<CandidateClick[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [matching, setMatching] = useState<string | null>(null);
  const [manualUserInput, setManualUserInput] = useState("");
  const [addingOrder, setAddingOrder] = useState(false);
  const [newOrder, setNewOrder] = useState({ storeSlug: "", storeName: "", orderId: "", orderTotal: "", currency: "USD", userEmail: "", timestamp: "" });
  const [savingOrder, setSavingOrder] = useState(false);
  const [saveOrderError, setSaveOrderError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/conversions?filter=${filter}`)
      .then((r) => r.json())
      .then((d) => { setConversions(d.conversions ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  function openPanel(conv: Conversion) {
    setSelected(conv);
    setManualUserInput(conv.userEmail ?? conv.userId ?? "");
    setCandidates([]);
    setCandidatesLoading(true);
    fetch(`/api/admin/conversions/${conv.conversionId}`)
      .then((r) => r.json())
      .then((d) => { setCandidates(d.clicks ?? []); setCandidatesLoading(false); })
      .catch(() => setCandidatesLoading(false));
  }

  async function matchToClick(clickId: string) {
    if (!selected) return;
    setMatching(clickId);
    await fetch(`/api/admin/conversions/${selected.conversionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clickId }),
    });
    setMatching(null);
    setSelected(null);
    load();
  }

  async function matchToUser() {
    if (!selected || !manualUserInput.trim()) return;
    setMatching("user");
    const input = manualUserInput.trim();
    // Detect if input is an email or a user ID
    const body = input.includes("@") ? { userEmail: input } : { userId: input };
    const res = await fetch(`/api/admin/conversions/${selected.conversionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? "Failed to match");
    }
    setMatching(null);
    setSelected(null);
    load();
  }

  async function saveManualOrder() {
    if (!newOrder.storeSlug || !newOrder.orderId || !newOrder.orderTotal) return;
    setSavingOrder(true);
    setSaveOrderError(null);
    const res = await fetch("/api/admin/conversions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newOrder),
    });
    const d = await res.json();
    if (!res.ok) {
      setSaveOrderError(d.error ?? "Failed to save");
      setSavingOrder(false);
      return;
    }
    setSavingOrder(false);
    setAddingOrder(false);
    setNewOrder({ storeSlug: "", storeName: "", orderId: "", orderTotal: "", currency: "USD", userEmail: "", timestamp: "" });
    load();
  }

  async function unmatch(conversionId: string) {
    await fetch(`/api/admin/conversions/${conversionId}`, { method: "PATCH" });
    load();
  }

  async function deleteConversion(conversionId: string) {
    if (!confirm("Permanently delete this conversion record? This cannot be undone.")) return;
    await fetch(`/api/admin/conversions/${conversionId}`, { method: "DELETE" });
    load();
  }

  async function editAmount(conversionId: string, currentTotal: number) {
    const input = prompt("Enter corrected order total:", String(currentTotal));
    if (!input || isNaN(Number(input))) return;
    await fetch(`/api/admin/conversions/${conversionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderTotal: Number(input) }),
    });
    load();
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <AdminNav />
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>Conversions</h1>
            <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>Match purchases to VYA clicks and customers</p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setAddingOrder(true)}
              style={{ padding: "6px 14px", fontSize: 12, borderRadius: 6, border: `1px solid ${MAROON}`, background: MAROON, color: "#fff", cursor: "pointer", fontWeight: 600 }}
            >
              + Record Order
            </button>
            {(["unmatched", "all"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "6px 14px", fontSize: 12, borderRadius: 6, border: "1px solid",
                borderColor: filter === f ? MAROON : "#e5e7eb",
                background: filter === f ? MAROON : "#fff",
                color: filter === f ? "#fff" : "#374151", cursor: "pointer", fontWeight: filter === f ? 600 : 400,
              }}>
                {f === "unmatched" ? "Unmatched" : "All"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p style={{ color: "#9ca3af", fontSize: 14 }}>Loading…</p>
        ) : conversions.length === 0 ? (
          <p style={{ color: "#9ca3af", fontSize: 14 }}>No {filter === "unmatched" ? "unmatched " : ""}conversions found.</p>
        ) : (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                  {["Date", "Store", "Order ID", "Amount", "Customer", "Status", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9ca3af", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {conversions.map((c, i) => (
                  <tr key={c.conversionId} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: "#6b7280", whiteSpace: "nowrap" }}>{fmtDate(c.timestamp)}</td>
                    <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600, color: "#111827" }}>{c.storeName || c.storeSlug}</td>
                    <td style={{ padding: "11px 16px", fontSize: 11, color: "#6b7280", fontFamily: "monospace" }}>{c.orderId}</td>
                    <td style={{ padding: "11px 16px", fontSize: 13, fontWeight: 600, color: "#111827" }}>{fmt(c.orderTotal, c.currency)}</td>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: "#374151" }}>
                      {c.userEmail ? (
                        <div>
                          <div>{c.userName || c.userEmail}</div>
                          <div style={{ color: "#9ca3af", fontSize: 11 }}>{c.userEmail}</div>
                        </div>
                      ) : (
                        <span style={{ color: "#9ca3af" }}>Unknown</span>
                      )}
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      {c.matched ? (
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: "rgba(16,185,129,0.1)", color: "#065f46" }}>
                            {c.matchedClickData?.source === "admin-manual" || c.matchedClickData?.source?.startsWith("admin") ? "Manually matched" : "Matched"}
                          </span>
                          {c.matchedClickData?.productName && (
                            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{c.matchedClickData.productName}</div>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: "rgba(245,158,11,0.1)", color: "#92400e" }}>Unmatched</span>
                      )}
                    </td>
                    <td style={{ padding: "11px 16px", whiteSpace: "nowrap" }}>
                      <button
                        onClick={() => openPanel(c)}
                        style={{ fontSize: 12, color: MAROON, border: `1px solid rgba(93,15,23,0.3)`, background: "none", padding: "4px 10px", borderRadius: 4, cursor: "pointer", fontWeight: 600, marginRight: 6 }}
                      >
                        {c.matched ? "Re-match" : "Match"}
                      </button>
                      {c.matched && (
                        <button
                          onClick={() => unmatch(c.conversionId)}
                          style={{ fontSize: 11, color: "#9ca3af", border: "1px solid #e5e7eb", background: "none", padding: "4px 10px", borderRadius: 4, cursor: "pointer", marginRight: 6 }}
                        >
                          Unmatch
                        </button>
                      )}
                      <button
                        onClick={() => editAmount(c.conversionId, c.orderTotal)}
                        style={{ fontSize: 11, color: "#6b7280", border: "1px solid #e5e7eb", background: "none", padding: "4px 10px", borderRadius: 4, cursor: "pointer", marginRight: 6 }}
                      >
                        Edit $
                      </button>
                      <button
                        onClick={() => deleteConversion(c.conversionId)}
                        style={{ fontSize: 11, color: "#dc2626", border: "1px solid #fca5a5", background: "none", padding: "4px 10px", borderRadius: 4, cursor: "pointer" }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Match panel */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 100 }} />
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 520, background: "#fff", zIndex: 101, overflowY: "auto", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Match Conversion</p>
                <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 3, margin: 0 }}>{selected.storeName} · {fmt(selected.orderTotal, selected.currency)} · {fmtDate(selected.timestamp)}</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>×</button>
            </div>

            <div style={{ padding: "20px 24px" }}>
              {/* Order details */}
              <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(93,15,23,0.5)", fontWeight: 600, margin: "0 0 8px" }}>Order Details</p>
              <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>Order ID: <span style={{ fontFamily: "monospace" }}>{selected.orderId}</span></div>
              {selected.items.length > 0 && (
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>
                  Items: {selected.items.map((it) => it.productName).join(", ")}
                </div>
              )}

              {/* Manual user match */}
              <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(93,15,23,0.5)", fontWeight: 600, margin: "16px 0 8px" }}>Match to Customer</p>
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                <input
                  type="text"
                  value={manualUserInput}
                  onChange={(e) => setManualUserInput(e.target.value)}
                  placeholder="Email or user ID"
                  style={{ flex: 1, padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
                />
                <button
                  onClick={matchToUser}
                  disabled={!manualUserInput.trim() || matching === "user"}
                  style={{ padding: "7px 14px", background: MAROON, color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: !manualUserInput.trim() ? 0.4 : 1 }}
                >
                  {matching === "user" ? "Saving…" : "Set User"}
                </button>
              </div>

              {/* Candidate clicks */}
              <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(93,15,23,0.5)", fontWeight: 600, margin: "0 0 8px" }}>
                Candidate Clicks (same store, ±48h)
              </p>
              {candidatesLoading ? (
                <p style={{ fontSize: 13, color: "#9ca3af" }}>Loading clicks…</p>
              ) : candidates.length === 0 ? (
                <p style={{ fontSize: 13, color: "#9ca3af" }}>No clicks found in this window.</p>
              ) : (
                candidates.map((click) => (
                  <div key={click.clickId} style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: "10px 14px", marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{click.productName || "—"}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                          {fmtDate(click.timestamp)} · {minsApart(click.timestamp, selected.timestamp)}m from order
                        </div>
                        {click.userEmail && (
                          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
                            {click.userName || click.userEmail}
                          </div>
                        )}
                        <div style={{ fontSize: 10, color: "#d1d5db", fontFamily: "monospace", marginTop: 2 }}>{click.clickId}</div>
                      </div>
                      <button
                        onClick={() => matchToClick(click.clickId)}
                        disabled={matching === click.clickId}
                        style={{ marginLeft: 10, padding: "5px 12px", background: MAROON, color: "#fff", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
                      >
                        {matching === click.clickId ? "Saving…" : "Use this"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Record Order Modal */}
      {addingOrder && (
        <>
          <div onClick={() => setAddingOrder(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 200 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 460, background: "#fff", zIndex: 201, borderRadius: 8, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", padding: "24px 28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>Record Order Manually</p>
              <button onClick={() => setAddingOrder(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af" }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Store Slug *</label>
                  <input value={newOrder.storeSlug} onChange={(e) => setNewOrder({ ...newOrder, storeSlug: e.target.value })} placeholder="e.g. porters-preloved" style={{ width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Store Name</label>
                  <input value={newOrder.storeName} onChange={(e) => setNewOrder({ ...newOrder, storeName: e.target.value })} placeholder="e.g. Porter's Preloved" style={{ width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Order ID *</label>
                  <input value={newOrder.orderId} onChange={(e) => setNewOrder({ ...newOrder, orderId: e.target.value })} placeholder="Order number" style={{ width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Amount *</label>
                  <input type="number" value={newOrder.orderTotal} onChange={(e) => setNewOrder({ ...newOrder, orderTotal: e.target.value })} placeholder="0.00" style={{ width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Currency</label>
                  <input value={newOrder.currency} onChange={(e) => setNewOrder({ ...newOrder, currency: e.target.value })} placeholder="USD" style={{ width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Order Date</label>
                  <input type="datetime-local" value={newOrder.timestamp} onChange={(e) => setNewOrder({ ...newOrder, timestamp: e.target.value })} style={{ width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Customer Email (optional)</label>
                <input value={newOrder.userEmail} onChange={(e) => setNewOrder({ ...newOrder, userEmail: e.target.value })} placeholder="Links to a VYA account" style={{ width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }} />
              </div>
              {saveOrderError && <p style={{ fontSize: 12, color: "#dc2626", margin: 0 }}>{saveOrderError}</p>}
              <button
                onClick={saveManualOrder}
                disabled={savingOrder || !newOrder.storeSlug || !newOrder.orderId || !newOrder.orderTotal}
                style={{ padding: "9px", background: MAROON, color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: (!newOrder.storeSlug || !newOrder.orderId || !newOrder.orderTotal) ? 0.5 : 1 }}
              >
                {savingOrder ? "Saving…" : "Save Order"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
