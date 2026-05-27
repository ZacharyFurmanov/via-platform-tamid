"use client";

import { useState, useEffect, useCallback } from "react";
import { SHOPIFY_STORES } from "@/app/lib/storeConfig";
import { CheckCircle2, XCircle, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";

type WebhookStatus = {
  secretConfigured: boolean;
  webhookUrl: string;
  secretPreview: string | null;
};

type StoreState = {
  status: WebhookStatus | null;
  loading: boolean;
  saving: boolean;
  saved: boolean;
  error: string | null;
  input: string;
  expanded: boolean;
  copied: boolean;
};

const initialStoreState = (): StoreState => ({
  status: null,
  loading: true,
  saving: false,
  saved: false,
  error: null,
  input: "",
  expanded: false,
  copied: false,
});

export default function WebhooksAdminPage() {
  const [storeStates, setStoreStates] = useState<Record<string, StoreState>>(
    () => Object.fromEntries(SHOPIFY_STORES.map((s) => [s.slug, initialStoreState()]))
  );

  const patch = useCallback((slug: string, updates: Partial<StoreState>) => {
    setStoreStates((prev) => ({ ...prev, [slug]: { ...prev[slug], ...updates } }));
  }, []);

  useEffect(() => {
    SHOPIFY_STORES.forEach(async (store) => {
      try {
        const res = await fetch(`/api/admin/store-webhook?store=${store.slug}`);
        const data = await res.json();
        patch(store.slug, { status: data, loading: false });
      } catch {
        patch(store.slug, { loading: false, error: "Failed to load" });
      }
    });
  }, [patch]);

  async function handleSave(slug: string) {
    const secret = storeStates[slug]?.input.trim();
    if (!secret) return;
    patch(slug, { saving: true, error: null, saved: false });
    try {
      const res = await fetch("/api/admin/store-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeSlug: slug, webhookSecret: secret }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      // Re-fetch status to get updated preview
      const statusRes = await fetch(`/api/admin/store-webhook?store=${slug}`);
      const statusData = await statusRes.json();
      patch(slug, { saving: false, saved: true, input: "", expanded: false, status: statusData });
      setTimeout(() => patch(slug, { saved: false }), 3000);
    } catch (err) {
      patch(slug, { saving: false, error: err instanceof Error ? err.message : "Save failed" });
    }
  }

  async function handleCopy(slug: string, url: string) {
    await navigator.clipboard.writeText(url);
    patch(slug, { copied: true });
    setTimeout(() => patch(slug, { copied: false }), 2000);
  }

  const configured = SHOPIFY_STORES.filter((s) => storeStates[s.slug]?.status?.secretConfigured).length;
  const total = SHOPIFY_STORES.length;

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "#09090b", margin: "0 0 4px" }}>Webhooks</h1>
        <p style={{ fontSize: 14, color: "#71717a", margin: "0 0 24px" }}>
          {configured} of {total} Shopify stores have a webhook secret configured
        </p>

        <div style={{ background: "#fff", border: "1px solid #e4e4e7", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#fafafa", borderBottom: "1px solid #e4e4e7" }}>
                {["Store", "Status", "Webhook URL", ""].map((h) => (
                  <th key={h} style={{
                    padding: "10px 16px", textAlign: "left", fontSize: 11,
                    textTransform: "uppercase", letterSpacing: "0.1em", color: "#a1a1aa", fontWeight: 500,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SHOPIFY_STORES.map((store, i) => {
                const state = storeStates[store.slug];
                const isLast = i === SHOPIFY_STORES.length - 1;
                const webhookUrl = state?.status?.webhookUrl ?? `https://vyaplatform.com/api/webhooks/shopify?store=${store.slug}`;

                return (
                  <>
                    <tr
                      key={store.slug}
                      style={{ borderBottom: (!state?.expanded && !isLast) ? "1px solid #f4f4f5" : "none" }}
                    >
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#09090b" }}>{store.name}</div>
                        <div style={{ fontSize: 11, color: "#a1a1aa", marginTop: 2 }}>{store.slug}</div>
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        {state?.loading ? (
                          <span style={{ fontSize: 12, color: "#a1a1aa" }}>Loading…</span>
                        ) : state?.status?.secretConfigured ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <CheckCircle2 size={14} style={{ color: "#16a34a", flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 500 }}>Configured</span>
                            {state.status.secretPreview && (
                              <span style={{ fontSize: 11, color: "#a1a1aa", fontFamily: "monospace" }}>
                                {state.status.secretPreview}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <XCircle size={14} style={{ color: "#dc2626", flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 500 }}>Not set</span>
                          </div>
                        )}
                        {state?.saved && (
                          <div style={{ fontSize: 11, color: "#16a34a", marginTop: 4 }}>✓ Saved</div>
                        )}
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <code style={{
                            fontSize: 11, color: "#52525b", background: "#f4f4f5",
                            padding: "2px 6px", borderRadius: 4, maxWidth: 280,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block",
                          }}>
                            {webhookUrl}
                          </code>
                          <button
                            onClick={() => handleCopy(store.slug, webhookUrl)}
                            title="Copy URL"
                            style={{
                              background: "none", border: "none", cursor: "pointer",
                              color: state?.copied ? "#16a34a" : "#a1a1aa", padding: 2, flexShrink: 0,
                            }}
                          >
                            {state?.copied ? <Check size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <button
                          onClick={() => patch(store.slug, { expanded: !state?.expanded, error: null })}
                          style={{
                            fontSize: 12, fontWeight: 500, color: "#09090b",
                            background: "#fff", border: "1px solid #e4e4e7",
                            padding: "4px 10px", borderRadius: 6, cursor: "pointer",
                            display: "inline-flex", alignItems: "center", gap: 4,
                          }}
                        >
                          {state?.status?.secretConfigured ? "Update" : "Add Secret"}
                          {state?.expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </td>
                    </tr>

                    {state?.expanded && (
                      <tr key={`${store.slug}-form`} style={{ borderBottom: !isLast ? "1px solid #f4f4f5" : "none" }}>
                        <td colSpan={4} style={{ padding: "0 16px 16px 16px" }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <input
                              type="text"
                              value={state.input}
                              onChange={(e) => patch(store.slug, { input: e.target.value })}
                              placeholder="Paste Shopify signing secret…"
                              style={{
                                flex: 1, fontSize: 13, fontFamily: "monospace",
                                padding: "8px 10px", borderRadius: 6,
                                border: "1px solid #e4e4e7", outline: "none",
                                color: "#09090b", background: "#fafafa",
                              }}
                              onKeyDown={(e) => { if (e.key === "Enter") handleSave(store.slug); }}
                            />
                            <button
                              onClick={() => handleSave(store.slug)}
                              disabled={state.saving || !state.input.trim()}
                              style={{
                                fontSize: 13, fontWeight: 500, padding: "8px 16px",
                                borderRadius: 6, border: "none", cursor: state.saving || !state.input.trim() ? "not-allowed" : "pointer",
                                background: state.saving || !state.input.trim() ? "#e4e4e7" : "#09090b",
                                color: state.saving || !state.input.trim() ? "#a1a1aa" : "#fff",
                              }}
                            >
                              {state.saving ? "Saving…" : "Save"}
                            </button>
                          </div>
                          {state.error && (
                            <p style={{ fontSize: 12, color: "#dc2626", margin: "6px 0 0" }}>{state.error}</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
