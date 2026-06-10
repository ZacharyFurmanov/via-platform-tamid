"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type BrandHeat = {
 brand: string; rank: number; rankPrev: number | null; rankDelta: number | null;
 heat: number; momentumPct: number | null; isBreakout: boolean;
 views: number; favorites: number; searches: number; sold: number; gmv: number;
};
type GroupHeat = {
 key: string; rank: number; rankPrev: number | null; rankDelta: number | null;
 heat: number; momentumPct: number | null; isBreakout: boolean;
 views: number; favorites: number; sold: number; gmv: number;
};
type HeatIndex = { generatedAt: string; periodDays: number; brands: BrandHeat[]; categories: GroupHeat[]; stores: GroupHeat[] };

type Demand = {
 windowDays: number;
 unmetSearches: { query: string; searches: number; results: number }[];
 topBrands: { brand: string; views: number; hearts: number; purchases: number; searches: number }[];
 topCategories: { category: string; views: number; hearts: number; purchases: number }[];
 openSourcing: { id: string; description: string; priceMin: number; priceMax: number; size: string | null; deadline: string }[];
};

const MUTED = "rgba(255,255,255,0.55)";
const FAINT = "rgba(255,255,255,0.4)";
const LINE = "1px solid rgba(255,255,255,0.08)";
const card: React.CSSProperties = { border: LINE, borderRadius: 8, padding: "18px 20px", marginBottom: 22 };

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
 return <th style={{ padding: "8px 10px", textAlign: right ? "right" : "left", color: MUTED, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{children}</th>;
}
function Td({ children, right, bold }: { children: React.ReactNode; right?: boolean; bold?: boolean }) {
 return <td style={{ padding: "9px 10px", textAlign: right ? "right" : "left", color: bold ? "rgba(255,255,255,0.92)" : MUTED, fontWeight: bold ? 600 : 400 }}>{children}</td>;
}

export default function AdminDataPage() {
 const [days, setDays] = useState(30);
 const [heat, setHeat] = useState<HeatIndex | null>(null);
 const [demand, setDemand] = useState<Demand | null>(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
 setLoading(true);
 Promise.all([
 fetch(`/api/admin/brand-heat?days=${days}`).then((r) => (r.ok ? r.json() : null)),
 fetch(`/api/admin/demand?days=${days}`).then((r) => (r.ok ? r.json() : null)),
 ]).then(([h, d]) => {
 if (h && h.brands) setHeat(h);
 if (d && d.topBrands) setDemand(d);
 }).finally(() => setLoading(false));
 }, [days]);

 const move = (b: BrandHeat) => {
 if (b.rankPrev == null) return <span style={{ color: "#d4af37" }}>NEW</span>;
 if (!b.rankDelta) return <span style={{ color: FAINT }}>—</span>;
 return b.rankDelta > 0 ? <span style={{ color: "#4ade80" }}>▲ {b.rankDelta}</span> : <span style={{ color: "#f87171" }}>▼ {Math.abs(b.rankDelta)}</span>;
 };
 const mom = (b: BrandHeat) => {
 if (b.isBreakout) return <span style={{ color: "#d4af37" }}>Breakout</span>;
 if (b.momentumPct == null) return <span style={{ color: FAINT }}>—</span>;
 const up = b.momentumPct >= 0;
 return <span style={{ color: up ? "#4ade80" : "#f87171" }}>{up ? "+" : ""}{b.momentumPct}%</span>;
 };
 const sig = (d: { views: number; hearts: number; purchases: number }) =>
 [d.views ? `${d.views.toLocaleString()} views` : null, d.hearts ? `${d.hearts} hearts` : null, d.purchases ? `${d.purchases} sold` : null].filter(Boolean).join(" · ") || "—";

 const groupMove = (g: GroupHeat) => {
 if (g.rankPrev == null) return <span style={{ color: "#d4af37" }}>NEW</span>;
 if (!g.rankDelta) return <span style={{ color: FAINT }}>—</span>;
 return g.rankDelta > 0 ? <span style={{ color: "#4ade80" }}>▲ {g.rankDelta}</span> : <span style={{ color: "#f87171" }}>▼ {Math.abs(g.rankDelta)}</span>;
 };
 const groupMom = (g: GroupHeat) => {
 if (g.isBreakout) return <span style={{ color: "#d4af37" }}>Breakout</span>;
 if (g.momentumPct == null) return <span style={{ color: FAINT }}>—</span>;
 const up = g.momentumPct >= 0;
 return <span style={{ color: up ? "#4ade80" : "#f87171" }}>{up ? "+" : ""}{g.momentumPct}%</span>;
 };
 const groupTable = (title: string, label: string, rows?: GroupHeat[]) => (!rows || rows.length === 0) ? null : (
 <div style={card}>
 <h2 style={{ fontSize: 16, margin: "0 0 14px" }}>{title}</h2>
 <div style={{ overflowX: "auto" }}>
 <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
 <thead><tr><Th>#</Th><Th>Move</Th><Th>{label}</Th><Th right>Heat</Th><Th right>Momentum</Th><Th right>Views</Th><Th right>Favorites</Th><Th right>Sold</Th></tr></thead>
 <tbody>{rows.map((g) => (
  <tr key={g.key} style={{ borderTop: LINE }}>
  <Td>{g.rank}</Td><td style={{ padding: "9px 10px", fontSize: 12 }}>{groupMove(g)}</td>
  <Td bold>{g.key}</Td><Td right bold>{g.heat.toLocaleString()}</Td>
  <td style={{ padding: "9px 10px", textAlign: "right" }}>{groupMom(g)}</td>
  <Td right>{g.views.toLocaleString()}</Td><Td right>{g.favorites.toLocaleString()}</Td><Td right>{g.sold.toLocaleString()}</Td>
  </tr>
 ))}</tbody>
 </table>
 </div>
 </div>
 );

 return (
 <div style={{ minHeight: "100vh", background: "#0d0f12", color: "rgba(255,255,255,0.9)", fontFamily: "Arial, sans-serif", padding: "32px 28px" }}>
 <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
 <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Data Layer</h1>
 <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
 <Link href="/admin/market-data" style={{ fontSize: 12, color: MUTED, marginRight: 8 }}>Market Data →</Link>
 {[30, 60, 90].map((d) => (
 <button key={d} onClick={() => setDays(d)} style={{ padding: "5px 12px", fontSize: 12, cursor: "pointer", borderRadius: 4, border: LINE, background: days === d ? "rgba(255,255,255,0.12)" : "transparent", color: days === d ? "#fff" : MUTED }}>{d}d</button>
 ))}
 </div>
 </div>
 <p style={{ color: MUTED, fontSize: 12.5, maxWidth: 760, marginTop: 6, marginBottom: 24 }}>
 Cross-store demand intelligence — brand momentum, what shoppers want, and where supply is missing. Aggregated across every store. <span style={{ color: FAINT }}>Internal / beta — not visible to stores.</span>
 </p>

 {loading && <p style={{ color: MUTED }}>Loading…</p>}

 {/* Brand Heat Index */}
 {heat && heat.brands.length > 0 && (
 <div style={card}>
 <h2 style={{ fontSize: 16, margin: "0 0 4px" }}>🔥 Brand Heat Index</h2>
 <p style={{ color: FAINT, fontSize: 12, margin: "0 0 14px" }}>Weighted demand (views + favorites + searches + sales) vs the prior {days}d.</p>
 <div style={{ overflowX: "auto" }}>
 <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
  <thead><tr><Th>#</Th><Th>Move</Th><Th>Brand</Th><Th right>Heat</Th><Th right>Momentum</Th><Th right>Views</Th><Th right>Favorites</Th><Th right>Searches</Th><Th right>Sold</Th><Th right>GMV</Th></tr></thead>
  <tbody>
  {heat.brands.map((b) => (
   <tr key={b.brand} style={{ borderTop: LINE }}>
   <Td>{b.rank}</Td><td style={{ padding: "9px 10px", fontSize: 12 }}>{move(b)}</td>
   <Td bold>{b.brand}</Td><Td right bold>{b.heat.toLocaleString()}</Td>
   <td style={{ padding: "9px 10px", textAlign: "right" }}>{mom(b)}</td>
   <Td right>{b.views.toLocaleString()}</Td><Td right>{b.favorites.toLocaleString()}</Td>
   <Td right>{b.searches.toLocaleString()}</Td><Td right>{b.sold.toLocaleString()}</Td>
   <Td right>{b.gmv ? `$${b.gmv.toLocaleString()}` : "—"}</Td>
   </tr>
  ))}
  </tbody>
 </table>
 </div>
 </div>
 )}

 {/* Category & Store momentum */}
 {heat && groupTable("📂 Category Heat", "Category", heat.categories)}
 {heat && groupTable("🏪 Store Momentum", "Store", heat.stores)}

 {/* Unmet demand */}
 {demand && (
 <div style={card}>
 <h2 style={{ fontSize: 16, margin: "0 0 4px" }}>Unmet demand</h2>
 <p style={{ color: FAINT, fontSize: 12, margin: "0 0 14px" }}>Searched repeatedly, few or no results — what to source.</p>
 <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
 {demand.unmetSearches.length === 0 ? <span style={{ color: MUTED, fontSize: 13 }}>None.</span> :
  demand.unmetSearches.map((u) => (
  <span key={u.query} style={{ fontSize: 12.5, padding: "5px 11px", border: LINE, borderRadius: 999 }}>
   {u.query} <span style={{ color: FAINT }}>· {u.searches}× · {u.results} results</span>
  </span>
  ))}
 </div>
 </div>
 )}

 {/* Brand demand */}
 {demand && demand.topBrands.length > 0 && (
 <div style={card}>
 <h2 style={{ fontSize: 16, margin: "0 0 14px" }}>Brand demand</h2>
 <div style={{ overflowX: "auto" }}>
 <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
  <thead><tr><Th>Brand</Th><Th right>Views</Th><Th right>Hearts</Th><Th right>Sold</Th><Th right>Searches</Th></tr></thead>
  <tbody>{demand.topBrands.map((b) => (
   <tr key={b.brand} style={{ borderTop: LINE }}>
   <Td bold>{b.brand}</Td><Td right>{b.views.toLocaleString()}</Td><Td right>{b.hearts.toLocaleString()}</Td><Td right>{b.purchases.toLocaleString()}</Td><Td right>{b.searches.toLocaleString()}</Td>
   </tr>
  ))}</tbody>
 </table>
 </div>
 </div>
 )}

 {/* Category demand + sourcing */}
 {demand && demand.topCategories.length > 0 && (
 <div style={card}>
 <h2 style={{ fontSize: 16, margin: "0 0 14px" }}>Category demand</h2>
 {demand.topCategories.map((c) => (
 <div key={c.category} style={{ display: "flex", justifyContent: "space-between", borderTop: LINE, padding: "8px 2px" }}>
  <span style={{ fontWeight: 600 }}>{c.category}</span>
  <span style={{ color: MUTED, fontSize: 12.5 }}>{sig(c)}</span>
 </div>
 ))}
 </div>
 )}

 {demand && demand.openSourcing.length > 0 && (
 <div style={card}>
 <h2 style={{ fontSize: 16, margin: "0 0 14px" }}>Open buyer requests</h2>
 {demand.openSourcing.map((s) => (
 <div key={s.id} style={{ borderTop: LINE, padding: "8px 2px" }}>
  <span style={{ fontWeight: 600 }}>{s.description}</span>
  <span style={{ color: FAINT, fontSize: 12, marginLeft: 8 }}>${s.priceMin}–${s.priceMax}{s.size ? ` · ${s.size}` : ""} · by {s.deadline}</span>
 </div>
 ))}
 </div>
 )}
 </div>
 );
}
