"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminNav from "@/app/components/AdminNav";

type WindowStats = {
  totalOrders: number;
  totalReturns: number;
  totalGmv: number;
  returnedValue: number;
  returnRate: number;
};

type StoreReturn = {
  storeSlug: string;
  storeName: string;
  totalOrders: number;
  returnCount: number;
  returnedValue: number;
  totalValue: number;
  returnRate: number;
};

type ReturnRecord = {
  conversionId: string;
  orderId: string;
  orderTotal: number;
  currency: string;
  storeSlug: string;
  storeName: string;
  timestamp: string;
  returnedAt: string | null;
  items: { productName: string; quantity: number; price: number }[];
  userEmail: string | null;
  userName: string | null;
};

type Data = {
  summary: {
    allTime: WindowStats;
    thirtyDay: WindowStats;
    sevenDay: WindowStats;
  };
  byStore: StoreReturn[];
  recent: ReturnRecord[];
};

const MAROON = "#5D0F17";

function fmt(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}
function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function pct(n: number) {
  return n.toFixed(1) + "%";
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", padding: "20px 24px", borderRadius: 4 }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: `${MAROON}80`, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 600, color: MAROON, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: `${MAROON}60`, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function WindowSection({ label, stats }: { label: string; stats: WindowStats }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: `${MAROON}60`, marginBottom: 12 }}>{label}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
        <StatCard label="Return Rate" value={pct(stats.returnRate)} sub={`${stats.totalReturns} of ${stats.totalOrders} orders`} />
        <StatCard label="Returned Value" value={fmt(stats.returnedValue)} />
        <StatCard label="Net GMV" value={fmt(stats.totalGmv)} sub="after returns" />
        <StatCard label="Returns" value={String(stats.totalReturns)} />
      </div>
    </div>
  );
}

export default function AdminReturnsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/returns")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#F7F3EA" }}>
      <AdminNav />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: MAROON, marginBottom: 4 }}>Returns</h1>
          <p style={{ fontSize: 13, color: `${MAROON}70` }}>
            Return rate and value across all tracked orders.{" "}
            <Link href="/admin/conversions?filter=all" style={{ color: MAROON, textDecoration: "underline" }}>
              Mark returns in Conversions →
            </Link>
          </p>
        </div>

        {loading && (
          <div style={{ color: `${MAROON}60`, fontSize: 13 }}>Loading...</div>
        )}

        {!loading && data && (
          <>
            <WindowSection label="Last 7 Days" stats={data.summary.sevenDay} />
            <WindowSection label="Last 30 Days" stats={data.summary.thirtyDay} />
            <WindowSection label="All Time" stats={data.summary.allTime} />

            {/* By store */}
            {data.byStore.length > 0 && (
              <div style={{ marginBottom: 40 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: `${MAROON}60`, marginBottom: 12 }}>
                  Returns by Store
                </div>
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 4, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#fafafa", borderBottom: "1px solid #e5e7eb" }}>
                        {["Store", "Orders", "Returns", "Return Rate", "Returned Value", "Total GMV"].map((h) => (
                          <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: `${MAROON}60`, fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.byStore.map((s, i) => (
                        <tr key={s.storeSlug} style={{ borderBottom: i < data.byStore.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                          <td style={{ padding: "12px 16px", color: MAROON, fontWeight: 500 }}>
                            <Link href={`/admin/stores/${s.storeSlug}`} style={{ color: MAROON, textDecoration: "none" }}>
                              {s.storeName || s.storeSlug}
                            </Link>
                          </td>
                          <td style={{ padding: "12px 16px", color: `${MAROON}80` }}>{s.totalOrders}</td>
                          <td style={{ padding: "12px 16px", color: `${MAROON}80` }}>{s.returnCount}</td>
                          <td style={{ padding: "12px 16px", color: s.returnRate > 15 ? "#b91c1c" : s.returnRate > 8 ? "#d97706" : `${MAROON}80`, fontWeight: s.returnRate > 8 ? 600 : 400 }}>
                            {pct(s.returnRate)}
                          </td>
                          <td style={{ padding: "12px 16px", color: `${MAROON}80` }}>{fmt(s.returnedValue)}</td>
                          <td style={{ padding: "12px 16px", color: `${MAROON}80` }}>{fmt(s.totalValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent returns list */}
            {data.recent.length > 0 ? (
              <div>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: `${MAROON}60`, marginBottom: 12 }}>
                  Recent Returns
                </div>
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 4, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#fafafa", borderBottom: "1px solid #e5e7eb" }}>
                        {["Returned", "Store", "Order", "Amount", "Customer", "Ordered"].map((h) => (
                          <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: `${MAROON}60`, fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent.map((r, i) => (
                        <tr key={r.conversionId} style={{ borderBottom: i < data.recent.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                          <td style={{ padding: "12px 16px", color: `${MAROON}70`, whiteSpace: "nowrap" }}>
                            {r.returnedAt ? fmtDate(r.returnedAt) : "—"}
                          </td>
                          <td style={{ padding: "12px 16px", color: MAROON, fontWeight: 500 }}>
                            <Link href={`/admin/stores/${r.storeSlug}`} style={{ color: MAROON, textDecoration: "none" }}>
                              {r.storeName || r.storeSlug}
                            </Link>
                          </td>
                          <td style={{ padding: "12px 16px", color: `${MAROON}60`, fontFamily: "monospace", fontSize: 12 }}>
                            {r.orderId}
                          </td>
                          <td style={{ padding: "12px 16px", color: MAROON, fontWeight: 600, whiteSpace: "nowrap" }}>
                            {fmt(r.orderTotal, r.currency)}
                          </td>
                          <td style={{ padding: "12px 16px", color: `${MAROON}70` }}>
                            {r.userName || r.userEmail || <span style={{ color: `${MAROON}30` }}>Unknown</span>}
                          </td>
                          <td style={{ padding: "12px 16px", color: `${MAROON}50`, whiteSpace: "nowrap" }}>
                            {fmtDate(r.timestamp)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 4, padding: "40px 24px", textAlign: "center", color: `${MAROON}50`, fontSize: 13 }}>
                No returns recorded yet. Mark orders as returned from the{" "}
                <Link href="/admin/conversions?filter=all" style={{ color: MAROON }}>Conversions</Link> page.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
