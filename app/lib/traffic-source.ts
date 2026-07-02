// Classify "where a visitor came from" from the referrer + any UTM tags. Pure and
// testable so the storefront tracker and any backfill share one source of truth.
// Tagged links (utm) win over the raw referrer because they're intentional.

export type SourceType = "Direct" | "Search" | "Social" | "Email" | "Paid" | "Referral";
export type ClassifiedSource = { type: SourceType; source: string; referrerHost: string };

// Search engines and social platforms we name explicitly; everything else with a
// referrer becomes a Referral keyed by its domain.
const SEARCH: Record<string, string> = {
 google: "Google", bing: "Bing", duckduckgo: "DuckDuckGo", yahoo: "Yahoo",
 ecosia: "Ecosia", baidu: "Baidu", yandex: "Yandex", brave: "Brave",
 startpage: "Startpage", qwant: "Qwant",
};
const SOCIAL: Record<string, string> = {
 instagram: "Instagram", tiktok: "TikTok", facebook: "Facebook", pinterest: "Pinterest",
 youtube: "YouTube", reddit: "Reddit", linkedin: "LinkedIn", snapchat: "Snapchat",
 threads: "Threads", tumblr: "Tumblr", whatsapp: "WhatsApp",
};

function hostOf(u: string): string {
 if (!u) return "";
 try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); }
 catch { return u.replace(/^www\./, "").toLowerCase().split("/")[0]; }
}

function titleCase(s: string): string {
 const t = s.trim();
 return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}

// Match a hostname against the known search/social tables. Short-link + mobile
// subdomains (t.co, l.instagram.com, m.facebook.com) resolve to the right brand.
function matchKnown(host: string): { type: SourceType; source: string } | null {
 if (!host) return null;
 // X / Twitter short + canonical domains.
 if (host === "x.com" || host === "t.co" || host.includes("twitter.")) return { type: "Social", source: "X" };
 if (host.includes("lnkd.in")) return { type: "Social", source: "LinkedIn" };
 for (const [k, v] of Object.entries(SEARCH)) if (host === `${k}.com` || host.includes(`${k}.`)) return { type: "Search", source: v };
 for (const [k, v] of Object.entries(SOCIAL)) if (host.includes(k) || host === `${k.slice(0, 2)}.com`) return { type: "Social", source: v };
 return null;
}

export function classifySource(input: { referrer?: string | null; utmSource?: string | null; utmMedium?: string | null; selfHost?: string | null }): ClassifiedSource {
 const referrerHost = hostOf(input.referrer || "");
 const med = (input.utmMedium || "").toLowerCase().trim();
 const src = (input.utmSource || "").toLowerCase().trim();

 // 1. Intentional tags win. Email + paid by medium.
 if (med.includes("email") || src.includes("email") || src.includes("newsletter") || src.includes("klaviyo")) return { type: "Email", source: "Email", referrerHost };
 if (med === "cpc" || med === "ppc" || med === "paid" || med === "ads" || med.includes("paid")) return { type: "Paid", source: titleCase(src) || "Paid", referrerHost };

 // 2. A named utm_source — match it to a platform, else treat it as a referral source.
 if (src) {
 const known = matchKnown(src.includes(".") ? src : `${src}.com`);
 if (known) return { ...known, referrerHost };
 return { type: "Referral", source: titleCase(src), referrerHost };
 }

 // 3. Fall back to the raw referrer.
 if (!referrerHost) return { type: "Direct", source: "Direct", referrerHost: "" };
 const self = (input.selfHost || "").replace(/^www\./, "").toLowerCase().split(":")[0];
 if (self && referrerHost === self) return { type: "Direct", source: "Direct", referrerHost };
 if (referrerHost.includes("vyaplatform")) return { type: "Referral", source: "VYA", referrerHost };
 const known = matchKnown(referrerHost);
 if (known) return { ...known, referrerHost };
 return { type: "Referral", source: referrerHost, referrerHost };
}
