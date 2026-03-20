"use client";

import { useEffect, useState } from "react";
import AdminNav from "@/app/components/AdminNav";

type Offer = {
  id: string;
  storeSlug: string;
  storeName: string;
  fee: number;
  timeline: string;
  notes: string | null;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
};

type SourcingRequest = {
  id: string;
  status: string;
  createdAt: string;
  matchedStoreSlug: string | null;
  matchedStoreAt: string | null;
  userName: string | null;
  userEmail: string;
  userPhone: string | null;
  userInstagram: string | null;
  description: string;
  priceMin: number;
  priceMax: number;
  condition: string;
  size: string | null;
  deadline: string;
  imageUrl: string | null;
  preferredStoreSlugs: string[] | null;
  offers: Offer[];
  acceptedOffer: Offer | null;
};

function fmt(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "#9ca3af",
  paid: "#f59e0b",
  matched: "#10b981",
  refunded: "#6b7280",
};

function RequestRow({
  req,
  onClick,
  selected,
}: {
  req: SourcingRequest;
  onClick: () => void;
  selected: boolean;
}) {
  return (
    <tr
      onClick={onClick}
      style={{
        cursor: "pointer",
        background: selected ? "rgba(93,15,23,0.05)" : undefined,
        borderBottom: "1px solid #f3f4f6",
      }}
    >
      <td style={{ padding: "12px 16px", fontSize: 13, color: "#111827" }}>
        {req.userName || "—"}
        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{req.userEmail}</div>
      </td>
      <td style={{ padding: "12px 16px", fontSize: 13, color: "#374151", maxWidth: 240 }}>
        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{req.description}</div>
      </td>
      <td style={{ padding: "12px 16px", fontSize: 13, color: "#374151", whiteSpace: "nowrap" }}>
        ${req.priceMin}–${req.priceMax}
      </td>
      <td style={{ padding: "12px 16px" }}>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: STATUS_COLORS[req.status] ?? "#374151",
          background: "rgba(0,0,0,0.04)",
          borderRadius: 4,
          padding: "2px 8px",
        }}>
          {req.status.replace("_", " ")}
        </span>
      </td>
      <td style={{ padding: "12px 16px", fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap" }}>
        {req.offers.length} offer{req.offers.length !== 1 ? "s" : ""}
      </td>
      <td style={{ padding: "12px 16px", fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap" }}>
        {fmt(req.createdAt)}
      </td>
    </tr>
  );
}

function DetailPanel({ req, onClose }: { req: SourcingRequest; onClose: () => void }) {
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 100 }}
      />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 480,
        background: "#fff", zIndex: 101, overflowY: "auto",
        boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
      }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#111827", margin: 0 }}>
              {req.userName || req.userEmail}
            </p>
            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{req.userEmail}</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af", padding: 0 }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {req.imageUrl && (
            <img
              src={req.imageUrl}
              alt="Request"
              style={{ width: "100%", maxHeight: 240, objectFit: "contain", marginBottom: 20, border: "1px solid #e5e7eb" }}
            />
          )}

          <Section title="Request Details" />
          <Row label="Description" value={req.description} />
          <Row label="Budget" value={`$${req.priceMin} – $${req.priceMax}`} />
          <Row label="Condition" value={req.condition} />
          {req.size && <Row label="Size" value={req.size} />}
          <Row label="Deadline" value={req.deadline} />
          <Row label="Status" value={req.status.replace("_", " ")} />
          <Row label="Submitted" value={fmt(req.createdAt)} />
          {req.preferredStoreSlugs && req.preferredStoreSlugs.length > 0 && (
            <Row label="Preferred Stores" value={req.preferredStoreSlugs.join(", ")} />
          )}

          <Section title="Customer Contact" />
          <Row label="Email" value={req.userEmail} />
          {req.userPhone && <Row label="Phone" value={req.userPhone} />}
          {req.userInstagram && <Row label="Instagram" value={req.userInstagram} />}

          <Section title={`Offers (${req.offers.length})`} />
          {req.offers.length === 0 ? (
            <p style={{ fontSize: 13, color: "#9ca3af" }}>No offers yet.</p>
          ) : (
            req.offers.map((offer) => (
              <div
                key={offer.id}
                style={{
                  border: "1px solid",
                  borderColor: offer.status === "accepted" ? "#10b981" : offer.status === "declined" ? "#e5e7eb" : "#d1d5db",
                  borderRadius: 6,
                  padding: "12px 14px",
                  marginBottom: 10,
                  background: offer.status === "accepted" ? "rgba(16,185,129,0.05)" : undefined,
                  opacity: offer.status === "declined" ? 0.5 : 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{offer.storeName}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                    color: offer.status === "accepted" ? "#10b981" : offer.status === "declined" ? "#9ca3af" : "#f59e0b",
                  }}>
                    {offer.status}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  ${offer.fee} fee · {offer.timeline}
                  {offer.notes && <div style={{ marginTop: 4, color: "#374151" }}>{offer.notes}</div>}
                  <div style={{ marginTop: 4, color: "#9ca3af" }}>Submitted {fmt(offer.createdAt)}</div>
                </div>
              </div>
            ))
          )}

          {req.acceptedOffer && (
            <>
              <Section title="Accepted Offer" />
              <Row label="Store" value={req.acceptedOffer.storeName} />
              <Row label="Fee" value={`$${req.acceptedOffer.fee}`} />
              <Row label="Timeline" value={req.acceptedOffer.timeline} />
              {req.acceptedOffer.notes && <Row label="Notes" value={req.acceptedOffer.notes} />}
              <Row label="Offer Submitted" value={fmt(req.acceptedOffer.createdAt)} />
              {req.matchedStoreAt && <Row label="Offer Accepted" value={fmt(req.matchedStoreAt)} />}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function Section({ title }: { title: string }) {
  return (
    <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(93,15,23,0.5)", fontWeight: 600, margin: "20px 0 8px" }}>
      {title}
    </p>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", borderBottom: "1px solid #f3f4f6", padding: "7px 0", gap: 12 }}>
      <span style={{ fontSize: 12, color: "#9ca3af", minWidth: 120, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: "#111827", wordBreak: "break-word" }}>{value}</span>
    </div>
  );
}

type FilterTab = "all" | "outstanding" | "offers" | "accepted";

export default function AdminSourcingPage() {
  const [requests, setRequests] = useState<SourcingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SourcingRequest | null>(null);
  const [tab, setTab] = useState<FilterTab>("all");

  useEffect(() => {
    fetch("/api/admin/sourcing")
      .then((r) => r.json())
      .then((d) => { setRequests(d.requests ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = requests.filter((r) => {
    if (tab === "outstanding") return r.status === "paid" && !r.matchedStoreSlug;
    if (tab === "offers") return r.offers.length > 0 && r.status !== "matched";
    if (tab === "accepted") return r.status === "matched";
    return true;
  });

  const counts = {
    all: requests.length,
    outstanding: requests.filter((r) => r.status === "paid" && !r.matchedStoreSlug).length,
    offers: requests.filter((r) => r.offers.length > 0 && r.status !== "matched").length,
    accepted: requests.filter((r) => r.status === "matched").length,
  };

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "outstanding", label: "Outstanding" },
    { key: "offers", label: "Has Offers" },
    { key: "accepted", label: "Accepted" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <AdminNav />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>Sourcing Requests</h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>{requests.length} total requests</p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "1px solid",
                borderColor: tab === t.key ? "#5D0F17" : "#e5e7eb",
                background: tab === t.key ? "#5D0F17" : "#fff",
                color: tab === t.key ? "#fff" : "#374151",
                fontSize: 13,
                cursor: "pointer",
                fontWeight: tab === t.key ? 600 : 400,
              }}
            >
              {t.label} <span style={{ opacity: 0.7 }}>({counts[t.key]})</span>
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: "#9ca3af", fontSize: 14 }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: "#9ca3af", fontSize: 14 }}>No requests in this category.</p>
        ) : (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                  {["Customer", "Description", "Budget", "Status", "Offers", "Date"].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9ca3af", fontWeight: 600 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((req) => (
                  <RequestRow
                    key={req.id}
                    req={req}
                    selected={selected?.id === req.id}
                    onClick={() => setSelected(req)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <DetailPanel req={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
