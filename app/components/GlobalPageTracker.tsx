"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const SOURCE_ALIASES: Record<string, string> = {
 ig: "instagram",
 fb: "facebook",
 tw: "twitter",
 tt: "tiktok",
 yt: "youtube",
 li: "linkedin",
};

function normalizeSource(s: string): string {
 const lower = s.toLowerCase().trim();
 return SOURCE_ALIASES[lower] ?? lower;
}

function inferPageType(pathname: string): string {
 if (pathname === "/") return "homepage";
 if (pathname.startsWith("/stores/")) return "store";
 if (pathname.startsWith("/categories/")) return "category";
 if (pathname.startsWith("/products/")) return "product";
 if (pathname.startsWith("/browse")) return "browse";
 if (pathname.startsWith("/search")) return "search";
 if (pathname.startsWith("/new-arrivals")) return "new-arrivals";
 if (pathname.startsWith("/brands")) return "brands";
 if (pathname.startsWith("/collections/")) return "collection";
 if (pathname.startsWith("/account")) return "account";
 return "other";
}

export default function GlobalPageTracker() {
 const pathname = usePathname();
 const { data: session, status } = useSession();
 const utmTracked = useRef(false);
 // In-memory ref so UTM data survives even when sessionStorage is blocked
 // (TikTok in-app browser and some other WebViews block web storage).
 const utmPayloadRef = useRef<Record<string, string | null> | null>(null);

 // Session flow tracking refs
 const sessionIdRef = useRef<string | null>(null);
 const prevPathRef = useRef<string | null>(null);
 const pageEnteredAtRef = useRef<number>(Date.now());

 // Session ID init: generate or retrieve from sessionStorage on mount
 useEffect(() => {
 if (typeof window === "undefined") return;
 let sid: string | null = null;
 try {
 sid = sessionStorage.getItem("via_session_id");
 if (!sid) {
 sid = crypto.randomUUID();
 sessionStorage.setItem("via_session_id", sid);
 }
 } catch {
 // sessionStorage blocked (e.g. TikTok in-app browser) — keep in memory only
 if (!sessionIdRef.current) {
 sid = crypto.randomUUID();
 }
 }
 if (sid) sessionIdRef.current = sid;
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 // Step 1: Capture UTM/referrer data on first page load.
 // Store in both the in-memory ref and sessionStorage (as a cross-navigation fallback).
 // We don't send the beacon yet because auth hasn't resolved — user_id would be null.
 useEffect(() => {
 if (typeof window === "undefined") return;

 // sessionStorage guard — skip if already captured this session.
 // Wrapped in try/catch because some WebViews (TikTok) block storage access.
 try {
 if (sessionStorage.getItem("via_utm_data")) return;
 } catch {}

 // If the in-memory ref is already populated, Step 1 already ran this mount.
 if (utmPayloadRef.current) return;

 const params = new URLSearchParams(window.location.search);
 let utmSource = params.get("utm_source") ? normalizeSource(params.get("utm_source")!) : null;
 let utmMedium = params.get("utm_medium");
 let utmCampaign = params.get("utm_campaign");
 const utmContent = params.get("utm_content");
 const utmTerm = params.get("utm_term");

 if (!utmSource) {
 const ref = document.referrer;
 if (ref) {
 try {
 const refHost = new URL(ref).hostname.replace(/^www\./, "");
 const REFERRER_MAP: Record<string, string> = {
 "instagram.com": "instagram",
 "l.instagram.com": "instagram",
 "tiktok.com": "tiktok",
 "vm.tiktok.com": "tiktok",
 "t.co": "twitter",
 "twitter.com": "twitter",
 "x.com": "twitter",
 "facebook.com": "facebook",
 "m.facebook.com": "facebook",
 "l.facebook.com": "facebook",
 "fb.com": "facebook",
 "linkedin.com": "linkedin",
 "lnkd.in": "linkedin",
 "threads.net": "threads",
 "pinterest.com": "pinterest",
 "pin.it": "pinterest",
 "youtube.com": "youtube",
 "youtu.be": "youtube",
 "substack.com": "substack",
 "reddit.com": "reddit",
 };
 const inferred = REFERRER_MAP[refHost];
 if (inferred) {
 utmSource = inferred;
 utmMedium = utmMedium ?? "social";
 utmCampaign = utmCampaign ?? "organic";
 }
 } catch {}
 }
 }

 // Infer source from User-Agent for social in-app browsers that strip referrer
 // (TikTok and Instagram both do this — no document.referrer, no UTM params)
 if (!utmSource) {
 const ua = navigator.userAgent;
 if (/BytedanceWebview|musical_ly|TikTok/i.test(ua)) {
 utmSource = "tiktok";
 utmMedium = utmMedium ?? "social";
 utmCampaign = utmCampaign ?? "organic";
 } else if (/Instagram/i.test(ua)) {
 utmSource = "instagram";
 utmMedium = utmMedium ?? "social";
 utmCampaign = utmCampaign ?? "organic";
 }
 }

 // Fall back to "direct" so Safari bookmarks, typed URLs, etc. are counted
 if (!utmSource) {
 utmSource = "direct";
 }

 const utmPayload = {
 utm_source: utmSource,
 utm_medium: utmMedium ?? null,
 utm_campaign: utmCampaign ?? null,
 utm_content: utmContent ?? null,
 utm_term: utmTerm ?? null,
 landing_path: window.location.pathname,
 };

 // Primary: in-memory ref — always works regardless of browser storage policy.
 utmPayloadRef.current = utmPayload;

 // Secondary: sessionStorage for cross-navigation persistence within the same tab.
 try {
 sessionStorage.setItem("via_utm_data", JSON.stringify(utmPayload));
 } catch {}

 // Also persist to localStorage for click attribution (30-day window).
 // May fail silently in TikTok browser — click attribution is best-effort.
 try {
 localStorage.setItem("via_utm", JSON.stringify({
 utm_source: utmSource,
 expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000,
 }));
 } catch {}
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 // Step 2: Once auth resolves, send the UTM data with the real user_id.
 // Reads from the in-memory ref first; falls back to sessionStorage for cases
 // where the component re-mounted (e.g. after a full page navigation) and the
 // ref was reset but sessionStorage survived.
 useEffect(() => {
 if (status === "loading") return;
 if (utmTracked.current) return;

 // Try in-memory ref first (works in TikTok browser and all others).
 let data: Record<string, string | null> | null = utmPayloadRef.current;

 // Fallback to sessionStorage (covers re-mount after full navigation).
 if (!data) {
 try {
 const stored = sessionStorage.getItem("via_utm_data");
 if (stored) data = JSON.parse(stored);
 } catch {}
 }

 if (!data) return;

 const userId = status === "authenticated"
 ? ((session?.user as { id?: string } | undefined)?.id ?? null)
 : null;

 utmTracked.current = true;
 utmPayloadRef.current = null;
 try {
 sessionStorage.removeItem("via_utm_data");
 } catch {}

 const payload = JSON.stringify({ ...data, user_id: userId });

 if (navigator.sendBeacon) {
 navigator.sendBeacon("/api/track-utm", new Blob([payload], { type: "application/json" }));
 } else {
 fetch("/api/track-utm", {
 method: "POST",
 body: payload,
 headers: { "Content-Type": "application/json" },
 keepalive: true,
 }).catch(() => {});
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [status]);

 // Step 3: Track page views for authenticated users
 useEffect(() => {
 // Wait until session has resolved — never fire with a null user_id
 if (status !== "authenticated") return;
 const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
 if (!userId) return;

 // Don't track admin activity — it would inflate WAU/MAU metrics
 if (pathname.startsWith("/admin")) return;

 const pageType = inferPageType(pathname);
 const segments = pathname.split("/");
 const pageSlug = segments[2] ?? null;

 // Capture referrer path and time on previous page before updating
 const referrerPath = prevPathRef.current;
 const timeOnPageMs = prevPathRef.current !== null
 ? Math.max(0, Date.now() - pageEnteredAtRef.current)
 : null;

 // Update refs for next navigation
 prevPathRef.current = pathname;
 pageEnteredAtRef.current = Date.now();

 const payload = JSON.stringify({
 pageType,
 pageSlug,
 userId,
 sessionId: sessionIdRef.current,
 fullPath: pathname,
 referrerPath,
 timeOnPageMs,
 });

 if (navigator.sendBeacon) {
 navigator.sendBeacon("/api/track-page", new Blob([payload], { type: "application/json" }));
 } else {
 fetch("/api/track-page", {
 method: "POST",
 body: payload,
 headers: { "Content-Type": "application/json" },
 keepalive: true,
 }).catch(() => {});
 }
 // pathname changes on every navigation; status/session fire once when auth resolves
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [pathname, status]);

 return null;
}
