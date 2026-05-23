"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const DARK = "#09090b";
const GRAY = "#71717a";
const MUTED = "#a1a1aa";
const BORDER = "#e4e4e7";
const BG_HOVER = "#fafafa";

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
 totalViews: number;
 totalClicks: number;
 totalFavorites: number;
 totalCartItems: number;
 totalOrders: number;
 totalGmv: number;
 totalSessions: number;
 totalBrowseMs: number;
};

type SessionEvent = {
 type: "click" | "view" | "favorite" | "cart" | "page";
 label: string;
 store: string;
 storeSlug: string;
 timestamp: string;
 pageType?: string;
 fullPath?: string;
 timeOnPageMs?: number | null;
};

type Session = {
 start: string;
 end: string;
 durationMs: number;
 clickCount: number;
 viewCount: number;
 favoriteCount: number;
 cartCount: number;
 pageCount: number;
 events: SessionEvent[];
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

type Retention = {
 firstSeen: string | null;
 lastSeen: string | null;
 distinctDays: number;
 daysSinceLastSeen: number | null;
 isReturning: boolean;
};

type Data = {
 profile: Profile;
 stats: Stats;
 retention: Retention;
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
 <div style={{ background: "#fff", border: `1px solid ${BORDER}`, padding: "16px 20px", borderRadius: 8, minWidth: 120 }}>
 <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED, fontWeight: 500, marginBottom: 4 }}>{label}</div>
 <div style={{ fontSize: 24, fontWeight: 700, color: DARK, lineHeight: 1 }}>{value}</div>
 {sub && <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{sub}</div>}
 </div>
 );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
 return (
 <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED, fontWeight: 500, marginBottom: 10, marginTop: 32 }}>
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
 <div style={{ minHeight: "100vh", background: "#f8f9fa" }}>

 <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
 {/* Back */}
 <Link href="/admin/customers" style={{ fontSize: 12, color: MUTED, textDecoration: "none", display: "inline-block", marginBottom: 20 }}>
 ← All Customers
 </Link>

 {loading && <div style={{ color: MUTED, fontSize: 13 }}>Loading...</div>}

 {!loading && !data && (
 <div style={{ color: "#b91c1c", fontSize: 13 }}>Failed to load customer — the page may still be deploying. Try refreshing.</div>
 )}

 {!loading && data && p && s && (
 <>
 {/* Header */}
 <div style={{ background: "#fff", border: `1px solid ${BORDER}`, padding: "24px 28px", borderRadius: 8, marginBottom: 24 }}>
 <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
 <div>
 <h1 style={{ fontSize: 20, fontWeight: 600, color: DARK, margin: 0 }}>{p.name || "—"}</h1>
 <p style={{ fontSize: 13, color: GRAY, margin: "4px 0 0" }}>{p.email}</p>
 {p.phone && <p style={{ fontSize: 12, color: MUTED, margin: "2px 0 0" }}>{p.phone}</p>}
 <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
 <span style={{
 fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", padding: "2px 10px", fontWeight: 600, borderRadius: 99,
 background: p.status === "approved" ? "#dcfce7" : "#fef9c3",
 color: p.status === "approved" ? "#15803d" : "#854d0e",
 }}>{p.status ?? "unknown"}</span>
 {p.promoCode && (
 <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", padding: "2px 10px", fontWeight: 600, borderRadius: 99, background: "#ede9fe", color: "#5b21b6" }}>
 Promo: {p.promoCode}
 </span>
 )}
 {!p.hasAccount && (
 <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", padding: "2px 10px", borderRadius: 99, background: "#f4f4f5", color: GRAY }}>
 Never signed in
 </span>
 )}
 </div>
 </div>
 <div style={{ fontSize: 12, color: MUTED, textAlign: "right", lineHeight: 1.8 }}>
 <div>Signed up: <strong style={{ color: DARK }}>{fmtDate(p.signedUpAt)}</strong></div>
 {p.approvedAt && <div>Approved: <strong style={{ color: DARK }}>{fmtDate(p.approvedAt)}</strong></div>}
 {p.referralCode && <div>Referral code: <code style={{ background: "#f4f4f5", padding: "1px 5px", color: DARK, borderRadius: 4 }}>{p.referralCode}</code></div>}
 {p.referredBy && <div>Referred by: <code style={{ background: "#fef9c3", padding: "1px 5px", color: "#854d0e", borderRadius: 4 }}>{p.referredBy}</code></div>}
 </div>
 </div>
 </div>

 {/* Stats */}
 <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
 <StatBox label="Sessions" value={s.totalSessions} />
 <StatBox label="Total Browse Time" value={fmtDuration(s.totalBrowseMs)} sub="from all activity" />
 <StatBox label="Product Views" value={s.totalViews} />
 <StatBox label="Store Click-Throughs" value={s.totalClicks} />
 <StatBox label="Saved Items" value={s.totalFavorites} />
 <StatBox label="In Cart" value={s.totalCartItems} />
 <StatBox label="Orders" value={s.totalOrders} />
 {s.totalGmv > 0 && <StatBox label="Total Spent" value={fmtMoney(s.totalGmv)} />}
 </div>

 {/* Retention */}
 {data.retention.firstSeen && (
 <>
 <SectionLabel>Retention</SectionLabel>
 <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "16px 20px", display: "flex", flexWrap: "wrap", gap: 24 }}>
 <div>
 <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED, fontWeight: 500, marginBottom: 3 }}>First seen</div>
 <div style={{ fontSize: 14, fontWeight: 600, color: DARK }}>{fmtDate(data.retention.firstSeen)}</div>
 </div>
 <div>
 <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED, fontWeight: 500, marginBottom: 3 }}>Last seen</div>
 <div style={{ fontSize: 14, fontWeight: 600, color: DARK }}>{fmtDate(data.retention.lastSeen!)}</div>
 {data.retention.daysSinceLastSeen !== null && (
 <div style={{ fontSize: 11, color: data.retention.daysSinceLastSeen > 14 ? "#b91c1c" : MUTED }}>
 {data.retention.daysSinceLastSeen === 0 ? "Today" : `${data.retention.daysSinceLastSeen}d ago`}
 </div>
 )}
 </div>
 <div>
 <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED, fontWeight: 500, marginBottom: 3 }}>Active days</div>
 <div style={{ fontSize: 14, fontWeight: 600, color: DARK }}>{data.retention.distinctDays}</div>
 </div>
 <div style={{ display: "flex", alignItems: "center" }}>
 {data.retention.isReturning ? (
 <span style={{ fontSize: 11, background: "#dcfce7", color: "#15803d", padding: "4px 12px", borderRadius: 99, fontWeight: 600 }}>
 Returning user
 </span>
 ) : (
 <span style={{ fontSize: 11, background: "#f4f4f5", color: GRAY, padding: "4px 12px", borderRadius: 99 }}>
 Visited once
 </span>
 )}
 </div>
 </div>
 </>
 )}

 {/* Top stores */}
 {data.topStores.length > 0 && (
 <>
 <SectionLabel>Most Browsed Stores</SectionLabel>
 <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
 {data.topStores.map((st) => (
 <Link key={st.storeSlug} href={`/admin/stores/${st.storeSlug}`} style={{ textDecoration: "none" }}>
 <div style={{ background: "#fff", border: `1px solid ${BORDER}`, padding: "8px 14px", borderRadius: 8, fontSize: 12, color: DARK }}>
 {st.store} <span style={{ color: MUTED, fontSize: 11 }}>({st.count} clicks)</span>
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
 <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden" }}>
 <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
 <thead>
 <tr style={{ background: BG_HOVER, borderBottom: `1px solid ${BORDER}` }}>
 {["Date", "Store", "Order ID", "Amount", "Status"].map((h) => (
 <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED, fontWeight: 500 }}>{h}</th>
 ))}
 </tr>
 </thead>
 <tbody>
 {data.orders.map((o, i) => (
 <tr key={o.conversionId} style={{ borderBottom: i < data.orders.length - 1 ? `1px solid ${BORDER}` : "none" }}>
 <td style={{ padding: "10px 14px", color: GRAY, fontSize: 12 }}>{fmtDate(o.timestamp)}</td>
 <td style={{ padding: "10px 14px", color: DARK, fontWeight: 500 }}>
 {o.storeSlug ? <Link href={`/admin/stores/${o.storeSlug}`} style={{ color: DARK, textDecoration: "none" }}>{o.storeName}</Link> : o.storeName}
 </td>
 <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 11, background: "#f4f4f5", color: DARK }}>{o.orderId}</td>
 <td style={{ padding: "10px 14px", fontWeight: 600, color: DARK }}>{fmtMoney(o.orderTotal, o.currency)}</td>
 <td style={{ padding: "10px 14px" }}>
 {o.returned ? (
 <span style={{ fontSize: 10, background: "#fee2e2", color: "#991b1b", padding: "2px 8px", borderRadius: 99 }}>Returned {o.returnedAt ? fmtDate(o.returnedAt) : ""}</span>
 ) : (
 <span style={{ fontSize: 10, background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: 99 }}>Completed</span>
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
 <div key={i} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden" }}>
 <button
 onClick={() => toggleSession(i)}
 style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
 >
 <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
 <span style={{ fontSize: 12, color: DARK, fontWeight: 500 }}>{fmtDateTime(sess.start)}</span>
 {sess.pageCount > 0 && <span style={{ fontSize: 11, color: MUTED }}>📄 {sess.pageCount} pages</span>}
 {sess.viewCount > 0 && <span style={{ fontSize: 11, color: MUTED }}>👁 {sess.viewCount}</span>}
 {sess.clickCount > 0 && <span style={{ fontSize: 11, color: MUTED }}>↗ {sess.clickCount}</span>}
 {sess.favoriteCount > 0 && <span style={{ fontSize: 11, color: MUTED }}>♥ {sess.favoriteCount}</span>}
 {sess.cartCount > 0 && <span style={{ fontSize: 11, color: MUTED }}>🛍 {sess.cartCount}</span>}
 <span style={{ fontSize: 11, color: GRAY, background: "#f4f4f5", padding: "2px 8px", borderRadius: 4 }}>
 {fmtDuration(sess.durationMs)}
 </span>
 </div>
 <span style={{ fontSize: 16, color: MUTED }}>{expandedSessions.has(i) ? "−" : "+"}</span>
 </button>

 {/* Page journey strip — always visible when there are page views */}
 {sess.events.filter((e) => e.type === "page").length > 0 && (
 <div style={{ borderTop: `1px solid #f4f4f5`, padding: "6px 16px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4, background: "#fafafa" }}>
 {sess.events
 .filter((e) => e.type === "page")
 .map((e, j, arr) => (
 <span key={j} style={{ display: "flex", alignItems: "center", gap: 4 }}>
 <span style={{ fontSize: 11, color: j === arr.length - 1 ? "#b91c1c" : GRAY, fontWeight: j === arr.length - 1 ? 600 : 400 }}>
 {e.label}
 {e.timeOnPageMs && e.timeOnPageMs > 0 ? (
 <span style={{ color: MUTED, fontWeight: 400 }}> ({Math.round(e.timeOnPageMs / 1000)}s)</span>
 ) : null}
 </span>
 {j < arr.length - 1 && <span style={{ fontSize: 10, color: MUTED }}>→</span>}
 </span>
 ))}
 <span style={{ fontSize: 10, color: "#b91c1c", marginLeft: 4 }}>✕ exit</span>
 </div>
 )}

 {expandedSessions.has(i) && (
 <div style={{ borderTop: `1px solid ${BORDER}`, padding: "0 16px 12px" }}>
 {sess.events.map((e, j) => (
 <div key={j} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: j < sess.events.length - 1 ? `1px solid #f4f4f5` : "none" }}>
 <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
 <span style={{ fontSize: 11, marginTop: 1, flexShrink: 0, color: e.type === "page" ? "#6366f1" : "inherit" }}>
 {e.type === "click" ? "↗" : e.type === "view" ? "👁" : e.type === "favorite" ? "♥" : e.type === "cart" ? "🛍" : "→"}
 </span>
 <div>
 <p style={{ fontSize: 12, color: e.type === "page" ? "#6366f1" : DARK, margin: 0, fontStyle: e.type === "page" ? "italic" : "normal" }}>
 {e.label}
 {e.type === "page" && e.timeOnPageMs && e.timeOnPageMs > 0 && (
 <span style={{ color: MUTED, fontStyle: "normal", marginLeft: 4 }}>· {Math.round(e.timeOnPageMs / 1000)}s</span>
 )}
 </p>
 {e.store && (
 <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>
 {e.storeSlug ? (
 <Link href={`/admin/stores/${e.storeSlug}`} style={{ color: MUTED, textDecoration: "none" }}>{e.store}</Link>
 ) : e.store}
 </p>
 )}
 </div>
 </div>
 <span style={{ fontSize: 11, color: MUTED, whiteSpace: "nowrap", marginLeft: 12 }}>
 {new Date(e.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
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
 <div key={i} style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden" }}>
 {f.image && <img src={f.image} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }} />}
 <div style={{ padding: "8px 10px" }}>
 <p style={{ fontSize: 12, color: DARK, margin: 0, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.title || "Unknown"}</p>
 <p style={{ fontSize: 11, color: MUTED, margin: "2px 0 0" }}>{f.storeName}{f.price ? ` · $${f.price}` : ""}</p>
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
 <div style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8 }}>
 {data.cart.map((c, i) => (
 <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 14px", borderBottom: i < data.cart.length - 1 ? `1px solid ${BORDER}` : "none" }}>
 {c.image && <img src={c.image} alt="" style={{ width: 40, height: 40, objectFit: "cover", flexShrink: 0, borderRadius: 4 }} />}
 <div style={{ flex: 1, minWidth: 0 }}>
 <p style={{ fontSize: 13, color: DARK, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</p>
 <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>{c.storeName}</p>
 </div>
 <p style={{ fontSize: 13, fontWeight: 600, color: DARK, flexShrink: 0 }}>${c.price}</p>
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
 <div style={{ background: "#fff", border: `1px solid ${BORDER}`, padding: "6px 12px", borderRadius: 8, fontSize: 12, color: DARK }}>
 {sf.storeName}
 </div>
 </Link>
 ))}
 </div>
 </>
 )}

 {!p.hasAccount && (
 <div style={{ marginTop: 32, background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "24px", textAlign: "center", color: MUTED, fontSize: 13 }}>
 This customer signed up but has never logged in — no activity data available yet.
 </div>
 )}
 </>
 )}
 </div>
 </div>
 );
}
