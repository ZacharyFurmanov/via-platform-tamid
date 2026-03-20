"use client";

import Link from "next/link";
import AdminNav from "@/app/components/AdminNav";
import { stores } from "@/app/lib/stores";

export default function AdminStoresPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <AdminNav />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: "0 0 4px" }}>Store Portals</h1>
        <p style={{ fontSize: 14, color: "#6b7280", margin: "0 0 24px" }}>{stores.length} registered stores</p>

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                {["Store", "Location", "Commission", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9ca3af", fontWeight: 600 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stores.map((store, i) => (
                <tr key={store.slug} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#111827" }}>{store.name}</div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{store.slug}</div>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 13, color: "#374151" }}>{store.location || "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em",
                      padding: "2px 8px", borderRadius: 4,
                      background: store.commissionType === "shopify-collabs" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                      color: store.commissionType === "shopify-collabs" ? "#065f46" : "#92400e",
                    }}>
                      {store.commissionType === "shopify-collabs" ? "Shopify Collabs" : "Manual"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    <Link
                      href={`/admin/stores/${store.slug}`}
                      style={{
                        fontSize: 12, fontWeight: 600, color: "#5D0F17",
                        textDecoration: "none", border: "1px solid rgba(93,15,23,0.3)",
                        padding: "4px 12px", borderRadius: 4,
                      }}
                    >
                      View Portal →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
