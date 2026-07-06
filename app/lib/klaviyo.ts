import { randomBytes, createHash, createHmac } from "crypto";
import { getKlaviyoConnection, updateKlaviyoAccessToken } from "./klaviyo-db";
import { listCustomers } from "./store-customers-db";

// Klaviyo API client. Works with either a pasted private key or an OAuth login — everything below
// takes/produces a ready Authorization header value, so callers don't care which. Best-effort:
// never throws into a request path — a store's marketing shouldn't break a checkout.

const BASE = "https://a.klaviyo.com";
const AUTHORIZE = "https://www.klaviyo.com/oauth/authorize";
const TOKEN_URL = "https://a.klaviyo.com/oauth/token";
const REVISION = "2024-10-15";
const SCOPES = "accounts:read events:write profiles:write";

/* eslint-disable @typescript-eslint/no-explicit-any */
async function kFetch(auth: string, method: string, path: string, body?: unknown): Promise<Response | null> {
 return fetch(`${BASE}${path}`, {
 method,
 headers: {
 Authorization: auth,
 revision: REVISION,
 accept: "application/json",
 ...(body ? { "content-type": "application/json" } : {}),
 },
 ...(body ? { body: JSON.stringify(body) } : {}),
 }).catch(() => null);
}

// ── OAuth ("Log in with Klaviyo") ───────────────────────────────────────────────
export function klaviyoConfigured(): boolean {
 return !!(process.env.KLAVIYO_CLIENT_ID && process.env.KLAVIYO_CLIENT_SECRET);
}
// Sign the store slug into the OAuth `state` (CSRF guard + carries which store is connecting).
export function signKlaviyoState(slug: string): string {
 const secret = process.env.KLAVIYO_CLIENT_SECRET || "via";
 return `${slug}.${createHmac("sha256", secret).update(slug).digest("hex").slice(0, 20)}`;
}
function base64url(buf: Buffer): string {
 return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function makePkce(): { verifier: string; challenge: string } {
 const verifier = base64url(randomBytes(48));
 const challenge = base64url(createHash("sha256").update(verifier).digest());
 return { verifier, challenge };
}
export function klaviyoAuthUrl(opts: { redirectUri: string; state: string; codeChallenge: string }): string {
 const p = new URLSearchParams({
 response_type: "code",
 client_id: process.env.KLAVIYO_CLIENT_ID || "",
 redirect_uri: opts.redirectUri,
 scope: SCOPES,
 state: opts.state,
 code_challenge: opts.codeChallenge,
 code_challenge_method: "S256",
 });
 return `${AUTHORIZE}?${p.toString()}`;
}
function basicAuth(): string {
 return "Basic " + Buffer.from(`${process.env.KLAVIYO_CLIENT_ID}:${process.env.KLAVIYO_CLIENT_SECRET}`).toString("base64");
}
export async function klaviyoExchangeCode(opts: { code: string; codeVerifier: string; redirectUri: string }): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | null> {
 const res = await fetch(TOKEN_URL, {
 method: "POST",
 headers: { "content-type": "application/x-www-form-urlencoded", Authorization: basicAuth() },
 body: new URLSearchParams({ grant_type: "authorization_code", code: opts.code, redirect_uri: opts.redirectUri, code_verifier: opts.codeVerifier }),
 }).catch(() => null);
 if (!res || !res.ok) return null;
 const j = (await res.json().catch(() => null)) as any;
 if (!j?.access_token) return null;
 return { accessToken: j.access_token, refreshToken: j.refresh_token, expiresIn: Number(j.expires_in) || 3600 };
}
async function klaviyoRefresh(refreshToken: string): Promise<{ accessToken: string; expiresIn: number } | null> {
 const res = await fetch(TOKEN_URL, {
 method: "POST",
 headers: { "content-type": "application/x-www-form-urlencoded", Authorization: basicAuth() },
 body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
 }).catch(() => null);
 if (!res || !res.ok) return null;
 const j = (await res.json().catch(() => null)) as any;
 if (!j?.access_token) return null;
 return { accessToken: j.access_token, expiresIn: Number(j.expires_in) || 3600 };
}

// The Authorization header for a store — from a key or a (refreshed) OAuth token. Null if unlinked.
export async function resolveKlaviyoAuth(storeSlug: string): Promise<string | null> {
 const c = await getKlaviyoConnection(storeSlug);
 if (!c) return null;
 if (c.authType === "key" && c.apiKey) return `Klaviyo-API-Key ${c.apiKey}`;
 if (c.authType === "oauth" && c.accessToken) {
 const expiring = c.expiresAt && new Date(c.expiresAt).getTime() < Date.now() + 60000;
 if (expiring && c.refreshToken) {
 const r = await klaviyoRefresh(c.refreshToken);
 if (!r) return null;
 await updateKlaviyoAccessToken(storeSlug, r.accessToken, r.expiresIn);
 return `Bearer ${r.accessToken}`;
 }
 return `Bearer ${c.accessToken}`;
 }
 return null;
}

// ── Verify + write ──────────────────────────────────────────────────────────────
export async function verifyAuth(auth: string): Promise<{ ok: boolean; accountName: string | null }> {
 const res = await kFetch(auth, "GET", "/api/accounts/");
 if (!res || !res.ok) return { ok: false, accountName: null };
 const j = (await res.json().catch(() => null)) as any;
 const info = j?.data?.[0]?.attributes?.contact_information;
 return { ok: true, accountName: info?.organization_name || info?.default_sender_name || null };
}
export async function verifyKlaviyoKey(apiKey: string): Promise<{ ok: boolean; accountName: string | null }> {
 const key = apiKey.trim();
 if (!/^pk_/.test(key)) return { ok: false, accountName: null };
 return verifyAuth(`Klaviyo-API-Key ${key}`);
}

export async function upsertKlaviyoProfile(auth: string, p: { email: string; firstName?: string | null; lastName?: string | null }): Promise<boolean> {
 if (!auth || !p.email) return false;
 const attributes: Record<string, unknown> = { email: p.email };
 if (p.firstName) attributes.first_name = p.firstName;
 if (p.lastName) attributes.last_name = p.lastName;
 const res = await kFetch(auth, "POST", "/api/profiles/", { data: { type: "profile", attributes } });
 return !!res && (res.status === 201 || res.status === 409);
}

export async function klaviyoTrack(auth: string, e: { metric: string; email: string; firstName?: string | null; lastName?: string | null; properties?: Record<string, unknown>; value?: number; time?: string }): Promise<boolean> {
 if (!auth || !e.email) return false;
 const profileAttrs: Record<string, unknown> = { email: e.email };
 if (e.firstName) profileAttrs.first_name = e.firstName;
 if (e.lastName) profileAttrs.last_name = e.lastName;
 const body = { data: { type: "event", attributes: {
 properties: e.properties || {},
 ...(e.value != null ? { value: e.value } : {}),
 ...(e.time ? { time: e.time } : {}),
 metric: { data: { type: "metric", attributes: { name: e.metric } } },
 profile: { data: { type: "profile", attributes: profileAttrs } },
 } } };
 const res = await kFetch(auth, "POST", "/api/events/", body);
 return !!res && res.status >= 200 && res.status < 300;
}

function splitName(name?: string | null): { firstName: string | null; lastName: string | null } {
 const parts = (name || "").trim().split(/\s+/).filter(Boolean);
 return { firstName: parts[0] || null, lastName: parts.slice(1).join(" ") || null };
}

// Push a placed order to a connected store's Klaviyo — powers post-purchase + win-back flows.
export async function syncOrderToKlaviyo(storeSlug: string, order: { email: string; name?: string | null; orderId: string | number; valueCents: number; itemTitle?: string | null; currency?: string }): Promise<void> {
 try {
 const auth = await resolveKlaviyoAuth(storeSlug);
 if (!auth || !order.email) return;
 const { firstName, lastName } = splitName(order.name);
 const value = Math.round(order.valueCents) / 100;
 await klaviyoTrack(auth, {
 metric: "Placed Order",
 email: order.email, firstName, lastName, value,
 time: new Date().toISOString(),
 properties: { OrderId: String(order.orderId), $value: value, Currency: order.currency || "USD", Store: storeSlug, ...(order.itemTitle ? { Item: order.itemTitle } : {}) },
 });
 } catch { /* best-effort */ }
}

// Backfill: push all of a store's existing customers into Klaviyo as profiles. Returns how many.
export async function syncCustomersToKlaviyo(storeSlug: string): Promise<{ synced: number; total: number }> {
 const auth = await resolveKlaviyoAuth(storeSlug);
 if (!auth) return { synced: 0, total: 0 };
 const customers = await listCustomers(storeSlug, 100000).catch(() => []);
 let synced = 0;
 for (const c of customers) {
 if (!c.email || !c.email.includes("@")) continue;
 const { firstName, lastName } = splitName((c as { name?: string | null }).name);
 if (await upsertKlaviyoProfile(auth, { email: c.email, firstName, lastName })) synced++;
 }
 return { synced, total: customers.length };
}
