import { test } from "node:test";
import assert from "node:assert/strict";
import { classifySource } from "./traffic-source.ts";

test("no referrer → Direct", () => {
 const r = classifySource({ referrer: "", selfHost: "shop.com" });
 assert.equal(r.type, "Direct");
 assert.equal(r.source, "Direct");
});

test("google search → Search/Google", () => {
 const r = classifySource({ referrer: "https://www.google.com/search?q=vintage" });
 assert.equal(r.type, "Search");
 assert.equal(r.source, "Google");
});

test("duckduckgo → Search/DuckDuckGo", () => {
 assert.equal(classifySource({ referrer: "https://duckduckgo.com/" }).source, "DuckDuckGo");
});

test("instagram (incl. l.instagram.com) → Social/Instagram", () => {
 assert.equal(classifySource({ referrer: "https://l.instagram.com/" }).source, "Instagram");
 assert.equal(classifySource({ referrer: "https://instagram.com/" }).type, "Social");
});

test("t.co → Social/X", () => {
 assert.equal(classifySource({ referrer: "https://t.co/abc" }).source, "X");
});

test("unknown domain → Referral keyed by host", () => {
 const r = classifySource({ referrer: "https://blog.example.com/post" });
 assert.equal(r.type, "Referral");
 assert.equal(r.source, "blog.example.com");
});

test("internal referrer (self host) → Direct", () => {
 assert.equal(classifySource({ referrer: "https://shop.com/about", selfHost: "shop.com" }).type, "Direct");
});

test("utm_medium=email → Email", () => {
 assert.equal(classifySource({ referrer: "", utmMedium: "email" }).type, "Email");
});

test("utm_medium=cpc → Paid with source name", () => {
 const r = classifySource({ referrer: "", utmSource: "google", utmMedium: "cpc" });
 assert.equal(r.type, "Paid");
 assert.equal(r.source, "Google");
});

test("utm_source=tiktok (untagged medium) → Social/TikTok", () => {
 assert.equal(classifySource({ utmSource: "tiktok" }).source, "TikTok");
});

test("utm beats referrer", () => {
 const r = classifySource({ referrer: "https://google.com", utmSource: "instagram", utmMedium: "social" });
 assert.equal(r.source, "Instagram");
});
