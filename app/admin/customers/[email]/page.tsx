"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AdminNav from "@/app/components/AdminNav";

const M = "#5D0F17";

type Profile = {
  email: string;
  name: string | null;
  phone: string | null;
  status: string | null;
  signedUpAt: string | null;
  approvedAt: string | null;
  referralCode: string | null;
  referredBy: string | null;
  promoCode: string | null;
  emailSubscribe: boolean;
  smsSubscribe: boolean;
  hasAccount: boolean;
};

type Stats = {
  totalClicks: number;
  totalFavorites: number;
  totalCartItems: number;
  totalOrders: number;
  totalGmv: number;
  totalSessions: number;
  totalBrowseMs: number;
};

type Session = {
  start: string;
  end: string;
  durationMs: number;
  clickCount: number;
  clicks: { clickId: string; productName: string; store: string; storeSlug: string; timestamp: string }[];
};

type Order = {
  conversionId: string;
  orderId: string;
  orderTotal: number;
  currency: string;
  storeName: string;
  storeSlug: string | null;
  timestamp: string;
  returned: boolean;
  returnedAt: string | null;
};

type Favorite = {
  productId: number;
  title: string | null;
  image: string | null;
  storeName: string | null;
  price: string | null;
  url: string | null;
  createdAt: string;
};

type CartItem = {
  productId: number;
  title: string;
  image: string | null;
  storeName: string;
  price: string;
  currency: string;
  addedAt: string;
};

type TopStore = { store: string; storeSlug: string; count: number };
type StoreFav = { storeSlug: string; storeName: string; createdAt: string };

type Data = {
  profile: Profile;
  stats: Stats;
  sessions: Session[];
  topStores: TopStore[];
  favorites: Favorite[];
  cart: CartItem[];
  orders: Order[];
  storeFavorites: StoreFav[];
};

function fmtDate(ts: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtDateTime(ts: string) {
  return new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtDuration(ms: number) {
  if (ms < 60_000) return "< 1 min";
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

function fmtMoney(n: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

function StatBox({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: "#fff", border: `1px solid #e5e7eb`, padding: "16px 20px", borderRadius: 4, minWidth: 120 }}>
      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: `${M}70`, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: M, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: `${M}50`, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: `${M}50`, marginBottom: 10, marginTop: 32 }}>
      {children}
    </div>
  );
}

export default function CustomerProfilePage() {
  const params = useParams();
  const email = decodeURIComponent(params.email as string);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch(`/api/admin/customers/${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [email]);

  function toggleSession(i: number) {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  const p = data?.profile;
  const s = data?.stats;

  return (
    <div style={{ minHeight: "100vh", background: "#F7F3EA" }}>
      <AdminNav />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {/* Back */}
        <Link href="/admin/customers" style={{ fontSize: 12, color: `${M}60`, textDecoration: "none", display: "inline-block", marginBottom: 20 }}>
          ← All Customers
        </Link>

        {loading && <div style={{ color: `${M}50`, fontSize: 13 }}>Loading...</div>}

        {!loading && !data && (
          <div style={{ color: "#b91c1c", fontSize: 13 }}>Customer not found.</div>
        )}

        {!loading && data && p && s && (
          <>
            {/* Header */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", padding: "24px 28px", borderRadius: 4, marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 700, color: M, margin: 0 }}>{p.name || "—"}</h1>
                  <p style={{ fontSize: 13, color: `${M}60`, margin: "4px 0 0" }}>{p.email}</p>
                  {p.phone && <p style={{ fontSize: 12, color: `${M}50`, margin: "2px 0 0" }}>{p.phone}</p>}
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <span style={{
                      fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", padding: "2px 10px", fontWeight: 600, borderRadius: 2,
                      background: p.status === "approved" ? "#dcfce7" : "#fffbeb",
                      color: p.status === "approved" ? "#166534" : "#92400e",
                    }}>{p.status ?? "unknown"}</span>
                    {p.promoCode && (
                      <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", padding: "2px 10px", fontWeight: 600, borderRadius: 2, background: "#ede9fe", color: "#5b21b6" }}>
                        Promo: {p.promoCode}
                      </span>
                    )}
                    {!p.hasAccount && (
                      <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", padding: "2px 10px", borderRadius: 2, background: "#f3f4f6", color: "#6b7280" }}>
                        Never signed in
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: `${M}50`, textAlign: "right", lineHeight: 1.8 }}>
                  <div>Signed up: <strong style={{ color: M }}>{fmtDate(p.signedUpAt)}</strong></div>
                  {p.approvedAt && <div>Approved: <strong style={{ color: M }}>{fmtDate(p.approvedAt)}</strong></div>}
                  {p.referralCode && <div>Referral code: <code style={{ background: "#F7F3EA", padding: "1px 5px", color: M }}>{p.referralCode}</code></div>}
                  {p.referredBy && <div>Referred by: <code style={{ background: "#fffbeb", padding: "1px 5px", color: "#92400e" }}>{p.referredBy}</code></div>}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
              <StatBox label="Sessions" value={s.totalSessions} />
              <StatBox label="Total Browse Time" value={fmtDuration(s.totalBrowseMs)} sub="estimated from click timing" />
              <StatBox label="Clicks" value={s.totalClicks} />
              <StatBox label="Saved Items" value={s.totalFavorites} />
              <StatBox label="In Cart" value={s.totalCartItems} />
              <StatBox label="Orders" value={s.totalOrders} />
              {s.totalGmv > 0 && <StatBox label="Total Spent" value={fmtMoney(s.totalGmv)} />}
            </div>

            {/* Top stores */}
            {data.topStores.length > 0 && (
              <>
                <SectionLabel>Most Browsed Stores</SectionLabel>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {data.topStores.map((st) => (
                    <Link key={st.storeSlug} href={`/admin/stores/${st.storeSlug}`} style={{ textDecoration: "none" }}>
                      <div style={{ background: "#fff", border: "1px solid #e5e7eb", padding: "8px 14px", borderRadius: 4, fontSize: 12, color: M }}>
                        {st.store} <span style={{ color: `${M}50`, fontSize: 11 }}>({st.count} clicks)</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {/* Orders */}
            {data.orders.length > 0 && (
              <>
                <SectionLabel>Orders ({data.orders.length})</SectionLabel>
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 4, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#fafafa", borderBottom: "1px solid #e5e7eb" }}>
                        {["Date", "Store", "Order ID", "Amount", "Status"].map((h) => (
                          <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em", color: `${M}50`, fontWeight: 500 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.orders.map((o, i) => (
                        <tr key={o.conversionId} style={{ borderBottom: i < data.orders.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                          <td style={{ padding: "10px 14px", color: `${M}60`, fontSize: 12 }}>{fmtDate(o.timestamp)}</td>
                          <td style={{ padding: "10px 14px", color: M, fontWeight: 500 }}>
                            {o.storeSlug ? <Link href={`/admin/stores/${o.storeSlug}`} style={{ color: M, textDecoration: "none" }}>{o.storeName}</Link> : o.storeName}
                          </td>
                          <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 11, color: `${M}50` }}>{o.orderId}</td>
                          <td style={{ padding: "10px 14px", fontWeight: 600, color: M }}>{fmtMoney(o.orderTotal, o.currency)}</td>
                          <td style={{ padding: "10px 14px" }}>
                            {o.returned ? (
                              <span style={{ fontSize: 10, background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: 2 }}>Returned {o.returnedAt ? fmtDate(o.returnedAt) : ""}</span>
                            ) : (
                              <span style={{ fontSize: 10, background: "#dcfce7", color: "#166534", padding: "2px 8px", borderRadius: 2 }}>Completed</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Browse sessions */}
            {data.sessions.length > 0 && (
              <>
                <SectionLabel>Browse Sessions ({data.sessions.length})</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.sessions.map((sess, i) => (
                    <div key={i} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 4, overflow: "hidden" }}>
                      <button
                        onClick={() => toggleSession(i)}
                        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                      >
                        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                          <span style={{ fontSize: 12, color: M, fontWeight: 500 }}>{fmtDateTime(sess.start)}</span>
                          <span style={{ fontSize: 11, color: `${M}50` }}>{sess.clickCount} click{sess.clickCount !== 1 ? "s" : ""}</span>
                          <span style={{ fontSize: 11, color: `${M}60`, background: "#F7F3EA", padding: "2px 8px", borderRadius: 2 }}>
                            {fmtDuration(sess.durationMs)}
                          </span>
                        </div>
                        <span style={{ fontSize: 16, color: `${M}40` }}>{expandedSessions.has(i) ? "−" : "+"}</span>
                      </button>

                      {expandedSessions.has(i) && (
                        <div style={{ borderTop: "1px solid #f0f0f0", padding: "0 16px 12px" }}>
                          {sess.clicks.map((c, j) => (
                            <div key={c.clickId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: j < sess.clicks.length - 1 ? "1px solid #f7f7f7" : "none" }}>
                              <div>
                                <p style={{ fontSize: 13, color: M, margin: 0 }}>{c.productName}</p>
                                <p style={{ fontSize: 11, color: `${M}50`, margin: 0 }}>
                                  <Link href={`/admin/stores/${c.storeSlug}`} style={{ color: `${M}50`, textDecoration: "none" }}>{c.store}</Link>
                                </p>
                              </div>
                              <span style={{ fontSize: 11, color: `${M}35`, whiteSpace: "nowrap", marginLeft: 12 }}>
                                {new Date(c.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Saved items */}
            {data.favorites.length > 0 && (
              <>
                <SectionLabel>Saved Items ({data.favorites.length})</SectionLabel>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                  {data.favorites.map((f, i) => (
                    <div key={i} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 4, overflow: "hidden" }}>
                      {f.image && <img src={f.image} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }} />}
                      <div style={{ padding: "8px 10px" }}>
                        <p style={{ fontSize: 12, color: M, margin: 0, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.title || "Unknown"}</p>
                        <p style={{ fontSize: 11, color: `${M}50`, margin: "2px 0 0" }}>{f.storeName}{f.price ? ` · $${f.price}` : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Cart */}
            {data.cart.length > 0 && (
              <>
                <SectionLabel>Cart ({data.cart.length})</SectionLabel>
                <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 4 }}>
                  {data.cart.map((c, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 14px", borderBottom: i < data.cart.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                      {c.image && <img src={c.image} alt="" style={{ width: 40, height: 40, objectFit: "cover", flexShrink: 0, borderRadius: 2 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, color: M, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</p>
                        <p style={{ fontSize: 11, color: `${M}50`, margin: 0 }}>{c.storeName}</p>
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: M, flexShrink: 0 }}>${c.price}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Saved stores */}
            {data.storeFavorites.length > 0 && (
              <>
                <SectionLabel>Saved Stores ({data.storeFavorites.length})</SectionLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {data.storeFavorites.map((sf) => (
                    <Link key={sf.storeSlug} href={`/admin/stores/${sf.storeSlug}`} style={{ textDecoration: "none" }}>
                      <div style={{ background: "#fff", border: "1px solid #e5e7eb", padding: "6px 12px", borderRadius: 4, fontSize: 12, color: M }}>
                        {sf.storeName}
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {!p.hasAccount && (
              <div style={{ marginTop: 32, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 4, padding: "24px", textAlign: "center", color: `${M}50`, fontSize: 13 }}>
                This customer signed up but has never logged in — no activity data available yet.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
