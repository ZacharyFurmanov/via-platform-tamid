// ───────────────────────────────────────────────────────────────────────────
// Custom domains (Slice 3). Thin wrapper over the Vercel REST API so a seller
// can point their own domain (bought at GoDaddy/Squarespace or existing) at
// their VYA storefront. Adding a domain to the project makes Vercel route + SSL
// it; the seller then sets the DNS records we return. Host→store resolution
// lives in middleware + storefront_settings.custom_domain.
//
// Required env (set in Vercel project settings):
//   VERCEL_API_TOKEN   — a token from vercel.com/account/tokens
//   VERCEL_PROJECT_ID  — this project's id (Project Settings → General)
//   VERCEL_TEAM_ID     — optional, if the project lives under a team
// ───────────────────────────────────────────────────────────────────────────

const API = "https://api.vercel.com";

function cfg() {
 return {
 token: process.env.VERCEL_API_TOKEN || "",
 projectId: process.env.VERCEL_PROJECT_ID || "",
 teamId: process.env.VERCEL_TEAM_ID || "",
 };
}

/** Whether custom-domain features are usable (token + project configured). */
export function domainsConfigured(): boolean {
 const { token, projectId } = cfg();
 return Boolean(token && projectId);
}

function teamQuery(): string {
 const { teamId } = cfg();
 return teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
}

function authHeaders(): HeadersInit {
 const { token } = cfg();
 return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export type DnsRecord = { type: "A" | "CNAME"; name: string; value: string };
export type DomainStatus = {
 domain: string;
 verified: boolean; // ownership verified by Vercel
 misconfigured: boolean; // DNS not pointing at Vercel yet
 records: DnsRecord[]; // what the seller should set at their registrar
 verification: { type: string; domain: string; value: string }[]; // TXT challenges, if any
};

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Add a domain to the Vercel project. Idempotent-ish: an already-attached
 * domain is treated as success. */
export async function addDomain(domain: string): Promise<{ ok: boolean; error?: string }> {
 const { projectId } = cfg();
 if (!domainsConfigured()) return { ok: false, error: "Custom domains aren’t configured on the server yet." };
 const res = await fetch(`${API}/v10/projects/${projectId}/domains${teamQuery()}`, {
 method: "POST",
 headers: authHeaders(),
 body: JSON.stringify({ name: domain }),
 });
 if (res.ok) return { ok: true };
 const data = await res.json().catch(() => ({}));
 const code = data?.error?.code;
 if (code === "domain_already_in_use" || code === "domain_already_exists") return { ok: true };
 return { ok: false, error: data?.error?.message || "Couldn’t add the domain." };
}

/** Remove a domain from the project. */
export async function removeDomain(domain: string): Promise<{ ok: boolean }> {
 const { projectId } = cfg();
 if (!domainsConfigured()) return { ok: false };
 const res = await fetch(`${API}/v9/projects/${projectId}/domains/${domain}${teamQuery()}`, {
 method: "DELETE",
 headers: authHeaders(),
 });
 return { ok: res.ok };
}

/** Apex vs subdomain → the DNS record the seller should create. */
function recommendedRecords(domain: string): DnsRecord[] {
 const isApex = domain.split(".").length <= 2;
 return isApex
 ? [{ type: "A", name: "@", value: "76.76.21.21" }]
 : [{ type: "CNAME", name: domain.split(".")[0], value: "cname.vercel-dns.com" }];
}

/** Current verification + DNS-config status for a domain on this project. */
export async function getDomainStatus(domain: string): Promise<DomainStatus> {
 const base: DomainStatus = {
 domain,
 verified: false,
 misconfigured: true,
 records: recommendedRecords(domain),
 verification: [],
 };
 if (!domainsConfigured()) return base;
 const { projectId } = cfg();

 try {
 const [projRes, confRes] = await Promise.all([
 fetch(`${API}/v9/projects/${projectId}/domains/${domain}${teamQuery()}`, { headers: authHeaders() }),
 fetch(`${API}/v6/domains/${domain}/config${teamQuery()}`, { headers: authHeaders() }),
 ]);
 const proj: any = await projRes.json().catch(() => ({}));
 const conf: any = await confRes.json().catch(() => ({}));
 return {
 domain,
 verified: Boolean(proj?.verified),
 misconfigured: conf?.misconfigured !== false, // true unless explicitly false
 records: recommendedRecords(domain),
 verification: Array.isArray(proj?.verification) ? proj.verification : [],
 };
 } catch {
 return base;
 }
}

function withTeam(path: string): string {
 const { teamId } = cfg();
 if (!teamId) return path;
 return path + (path.includes("?") ? "&" : "?") + `teamId=${encodeURIComponent(teamId)}`;
}

// New Vercel registrar API (the v4/status + v5/buy endpoints were sunsetted Nov 2025).
/** Is a domain available to register? */
export async function checkAvailability(domain: string): Promise<{ available: boolean }> {
 if (!domainsConfigured()) return { available: false };
 const res = await fetch(`${API}${withTeam(`/v1/registrar/domains/${encodeURIComponent(domain)}/availability`)}`, { headers: authHeaders() });
 const d: any = await res.json().catch(() => ({}));
 return { available: Boolean(d?.available) };
}

/** Registration price for a domain, in cents. */
export async function getDomainPrice(domain: string, years = 1): Promise<{ priceCents: number; years: number } | null> {
 if (!domainsConfigured()) return null;
 const res = await fetch(`${API}${withTeam(`/v1/registrar/domains/${encodeURIComponent(domain)}/price?years=${years}`)}`, { headers: authHeaders() });
 if (!res.ok) return null;
 const d: any = await res.json().catch(() => ({}));
 const price = d?.price ?? d?.purchasePrice ?? d?.amount;
 return price != null ? { priceCents: Math.round(Number(price) * 100), years } : null;
}

export type DomainContact = { firstName: string; lastName: string; email: string; phone: string; address1: string; city: string; state: string; zip: string; country: string };

/** Buy a domain through Vercel's registrar (charges the platform's Vercel account).
 * Needs the registrant's contact info. expectedPrice (dollars) must match the quote. */
export async function buyDomain(domain: string, expectedPriceDollars: number, contact: DomainContact, years = 1): Promise<{ ok: boolean; orderId?: string; error?: string }> {
 if (!domainsConfigured()) return { ok: false, error: "Not configured." };
 const res = await fetch(`${API}${withTeam(`/v1/registrar/domains/${encodeURIComponent(domain)}/buy`)}`, {
 method: "POST",
 headers: authHeaders(),
 body: JSON.stringify({ autoRenew: true, years, expectedPrice: expectedPriceDollars, contactInformation: contact }),
 });
 const d: any = await res.json().catch(() => ({}));
 if (res.ok) return { ok: true, orderId: d?.orderId };
 return { ok: false, error: d?.message || d?.error?.message || "Purchase failed — try again." };
}

/** Trigger Vercel to (re)check ownership verification. */
export async function verifyDomain(domain: string): Promise<{ verified: boolean }> {
 const { projectId } = cfg();
 if (!domainsConfigured()) return { verified: false };
 const res = await fetch(`${API}/v9/projects/${projectId}/domains/${domain}/verify${teamQuery()}`, {
 method: "POST",
 headers: authHeaders(),
 });
 const data: any = await res.json().catch(() => ({}));
 return { verified: Boolean(data?.verified) };
}
