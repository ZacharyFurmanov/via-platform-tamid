/* eslint-disable @typescript-eslint/no-explicit-any */
// High-fidelity site capture (the "keep their exact design" engine). We fetch a
// store's real page, inline its stylesheets (absolutizing every url() to the source
// CDN), point images/fonts at their real source, and rewrite same-origin LINKS to
// the VYA-hosted copy — so the whole site can be navigated on VYA, pixel-faithful.
// (JS is stripped for v1: looks identical; interactivity + cart + AI editing next.)
import * as cheerio from "cheerio";
import { saveCapturePage, deleteCaptures } from "./site-capture-db";

const UA = { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36" };

function abs(u: string | undefined, base: string): string {
 if (!u) return "";
 const t = u.trim();
 if (!t || t.startsWith("data:") || t.startsWith("#") || t.startsWith("mailto:") || t.startsWith("tel:") || t.startsWith("javascript:")) return u || "";
 try { return new URL(t, base).href; } catch { return u; }
}
function absSrcset(v: string | undefined, base: string): string {
 if (!v) return "";
 return v.split(",").map((part) => { const [u, d] = part.trim().split(/\s+/); return abs(u, base) + (d ? " " + d : ""); }).join(", ");
}
function absCssUrls(css: string, cssUrl: string): string {
 return css
 .replace(/url\(\s*(['"]?)([^"')]+)\1\s*\)/gi, (m, q, p) => (p.startsWith("data:") || p.startsWith("#") ? m : `url(${q}${abs(p, cssUrl)}${q})`))
 .replace(/@import\s+(['"])([^"']+)\1/gi, (m, q, p) => `@import ${q}${abs(p, cssUrl)}${q}`);
}

export type CaptureOpts = { rewriteLink?: (sameOriginUrl: string) => string | null };
export type Capture = { html: string; origin: string; sourceUrl: string; bytes: number; inlinedSheets: number; links: string[] };

export async function captureSite(url: string, opts: CaptureOpts = {}): Promise<Capture> {
 const sourceUrl = url.startsWith("http") ? url : `https://${url}`;
 const origin = new URL(sourceUrl).origin;
 const res = await fetch(sourceUrl, { headers: UA, signal: AbortSignal.timeout(20000) });
 if (!res.ok) throw new Error(`Couldn't load ${sourceUrl} (${res.status})`);
 const $ = cheerio.load(await res.text());

 // Drop the source CSP — it blocks the cart/interactivity scripts VYA injects.
 $("meta[http-equiv]").each((_: number, el: any) => { if (/content-security-policy/i.test($(el).attr("http-equiv") || "")) $(el).remove(); });

 // Keep the theme's own interactivity JS (accordions, dropdowns, slideshows);
 // strip tracking/analytics + Shopify's checkout/cart pings (we replace those).
 const TRACKERS = /google-analytics|googletagmanager|gtag\/js|connect\.facebook|facebook\.net|fbevents|tiktok|snap\.licdn|pinterest|klaviyo|hotjar|clarity\.ms|doubleclick|criteo|\bbat\.bing|cdn\.shopify\.com\/shopifycloud\/(trekkie|consent)|monorail|web-pixel/i;
 $("script").each((_: number, el: any) => {
 const src = $(el).attr("src") || "";
 const inline = $(el).html() || "";
 if ((src && TRACKERS.test(src)) || /gtag\(|fbq\(|dataLayer|trekkie|window\.Shopify\s*=\s*window\.Shopify.*analytics|web-pixel/i.test(inline)) { $(el).remove(); return; }
 if (src) $(el).attr("src", abs(src, sourceUrl));
 });

 // Inline stylesheets, absolutizing their url()/imports to the source CDN.
 let inlinedSheets = 0;
 for (const el of $('link[rel="stylesheet"], link[as="style"]').toArray()) {
 const href = $(el).attr("href"); if (!href) continue;
 const cssUrl = abs(href, sourceUrl);
 try {
 const r = await fetch(cssUrl, { headers: UA, signal: AbortSignal.timeout(12000) });
 const css = r.ok ? await r.text() : "";
 if (css) { $(el).replaceWith(`<style data-vya-src="${cssUrl}">${absCssUrls(css, cssUrl)}</style>`); inlinedSheets++; }
 else $(el).attr("href", cssUrl);
 } catch { $(el).attr("href", cssUrl); }
 }
 // Absolutize any inline <style> url()s too.
 $("style").each((_: number, el: any) => { const c = $(el).html(); if (c && /url\(/.test(c)) $(el).text(absCssUrls(c, sourceUrl)); });

 // Images → eager, real source.
 $("img").each((_: number, el: any) => {
 const $el = $(el);
 const cur = $el.attr("src") || "";
 const ds = $el.attr("data-src") || ($el.attr("data-srcset") || "").split(",").pop()?.trim().split(/\s+/)[0];
 if ((!cur || /placeholder|blank|data:image|1x1|lazyload/i.test(cur)) && ds) $el.attr("src", ds);
 $el.attr("src", abs($el.attr("src"), sourceUrl));
 const ss = $el.attr("srcset") || $el.attr("data-srcset"); if (ss) $el.attr("srcset", absSrcset(ss, sourceUrl));
 $el.removeAttr("loading").removeAttr("data-src").removeAttr("data-srcset");
 });
 $("source[srcset], source[data-srcset]").each((_: number, el: any) => { const ss = $(el).attr("srcset") || $(el).attr("data-srcset"); if (ss) $(el).attr("srcset", absSrcset(ss, sourceUrl)).removeAttr("data-srcset"); });
 // Other asset links (favicons, preloaded fonts/images).
 $('link[href]:not([rel="canonical"]):not([rel="alternate"])').each((_: number, el: any) => { const h = $(el).attr("href"); if (h) $(el).attr("href", abs(h, sourceUrl)); });

 // Rewrite anchors: same-origin → the VYA-hosted copy; external → absolute (open out).
 const links = new Set<string>();
 $("a[href]").each((_: number, el: any) => {
 const raw = $(el).attr("href"); if (!raw) return;
 const full = abs(raw, sourceUrl);
 if (!/^https?:/i.test(full)) return;
 if (new URL(full).origin === origin) {
 links.add(full);
 const rewritten = opts.rewriteLink ? opts.rewriteLink(full) : null;
 $(el).attr("href", rewritten ?? full);
 } else {
 $(el).attr("href", full).attr("target", "_blank").attr("rel", "noopener");
 }
 });

 // Neutralize any Shopify add-to-cart forms (e.g. collection-card quick-adds) so
 // they never POST to Shopify. (Product pages get a real VYA button via rewireCommerce.)
 $('form[action*="/cart"]').attr("onsubmit", "return false");

 // Strip <base> if the theme set one (we've absolutized everything ourselves).
 $("base").remove();

 const html = $.html();
 return { html, origin, sourceUrl, bytes: html.length, inlinedSheets, links: [...links] };
}

// ── Crawl an entire site and store every page on VYA ─────────────────────────
// Sitemap-seeded + link-crawl, blacklist filter (skip products/cart/checkout/assets).
// Internal links are rewritten to /site/{slug}/… so the whole site navigates on VYA.
function includePath(p: string): boolean {
 if (/\/(cart|account|search|checkout|login|orders|wishlist)\b/.test(p)) return false;
 if (/\/products\//.test(p)) return false; // individual products → templated + VYA checkout later
 if (/\.(json|xml|pdf|jpe?g|png|gif|webp|svg|css|js|ico)$/i.test(p)) return false;
 if (/\/cdn\//.test(p)) return false;
 return true;
}

export async function crawlAndStore(slug: string, startUrl: string, maxPages = 80): Promise<{ pages: number; paths: string[] }> {
 const start = startUrl.startsWith("http") ? startUrl : `https://${startUrl}`;
 const origin = new URL(start).origin;
 const linkBase = `/site/${slug}`;
 const rewriteLink = (full: string) => {
 const p = new URL(full).pathname;
 if (/^\/products\//.test(p)) return linkBase + p; // product pages stay on VYA, served on-demand
 return includePath(p) ? linkBase + (p === "/" ? "" : p) : null;
 };

 // Seed from the sitemap (authoritative page list) + the homepage.
 const seed = new Set<string>(["/"]);
 try {
 const root = await fetch(origin + "/sitemap.xml", { headers: UA, signal: AbortSignal.timeout(12000) }).then((r) => r.text());
 const subs = [...root.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&")).filter((u) => /sitemap_(pages|collections|blogs)/.test(u));
 for (const s of subs) {
 const xml = await fetch(s, { headers: UA, signal: AbortSignal.timeout(12000) }).then((r) => r.text());
 for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) { const p = new URL(m[1].replace(/&amp;/g, "&")).pathname; if (includePath(p)) seed.add(p); }
 }
 } catch { /* no sitemap — link crawl still covers it */ }

 await deleteCaptures(slug);
 const queue = [...seed];
 const done = new Set<string>();
 const paths: string[] = [];
 while (queue.length && paths.length < maxPages) {
 const path = queue.shift()!;
 if (done.has(path)) continue;
 done.add(path);
 try {
 const cap = await captureSite(origin + path, { rewriteLink });
 await saveCapturePage(slug, path, cap.html, origin + path);
 paths.push(path);
 for (const l of cap.links) { const p = new URL(l).pathname; if (includePath(p) && !done.has(p) && !queue.includes(p)) queue.push(p); }
 } catch { /* skip a page that won't load */ }
 }
 return { pages: paths.length, paths };
}

// ── On-demand product pages with VYA commerce wired in ───────────────────────
// Captures a product page live, then replaces the Shopify add-to-cart form with a
// VYA "Buy" button pointing at VYA's checkout (the Stripe flow we already built).
const linkRewriteFor = (slug: string) => (full: string) => {
 const p = new URL(full).pathname;
 if (/^\/products\//.test(p)) return `/site/${slug}${p}`;
 if (/\/(cart|account|search|checkout|login)\b/.test(p) || /\.(json|xml|css|js|jpe?g|png|webp|svg)$/i.test(p) || /\/cdn\//.test(p)) return null;
 return `/site/${slug}${p === "/" ? "" : p}`;
};

/** Rewire the captured product page's buy area for VYA's (invisible) backend:
 * remove Shopify's Shop-Pay/dynamic checkout, and keep the store's native
 * "Add to cart" + "Buy now" — they run through VYA's Stripe checkout. The buyer
 * never sees "VYA" or "Shop"; they're buying from the store. */
export function rewireCommerce(html: string, buyHref: string | null): string {
 const $ = cheerio.load(html);
 // Strip Shopify's dynamic/Shop-Pay checkout + installments — VYA is the checkout now.
 $('.shopify-payment-button, [data-shopify="payment-button"], .additional-checkout-buttons, shopify-payment-terms, .shopify-payment-terms, shop-pay-wallet-button, [class*="installment"], [class*="shop-pay"], [class*="shop_pay"], .shop-login-button').remove();
 // And keep them gone even if the kept theme JS tries to re-inject them.
 $("head").append('<style data-vya-commerce="1">.shopify-payment-button,shopify-payment-terms,.shopify-payment-terms,shop-pay-wallet-button,.additional-checkout-buttons,[class*="installment"],[class*="shop-pay"],[class*="shop_pay"]{display:none!important;}</style>');

 const sold = !buyHref;
 const itemId = (buyHref || "").match(/item=([\w-]+)/)?.[1] || "";
 const base = "display:block;width:100%;box-sizing:border-box;text-align:center;padding:15px;margin-top:10px;text-transform:uppercase;letter-spacing:.1em;font-size:13px;text-decoration:none;cursor:pointer;";
 const buttons = (cls: string) => sold
 ? `<a href="#" class="${cls}" style="${base}background:#111;color:#fff;border:1px solid #111;opacity:.4;pointer-events:none;">Sold out</a>`
 : `<a href="#" data-vya-add="${itemId}" class="${cls}" style="${base}background:#111;color:#fff;border:1px solid #111;">Add to cart</a><a href="${buyHref}" class="${cls}" style="${base}background:#fff;color:#111;border:1px solid #111;">Buy now</a>`;

 let done = false;
 $('form[action*="/cart"]').each((_: number, el: any) => {
 const $btn = $(el).find('[name="add"], button[type="submit"], .product-form__submit, .add-to-cart, .product__add-to-cart').first();
 const cls = $btn.attr("class") || "";
 if ($btn.length) $btn.replaceWith(buttons(cls)); else $(el).append(buttons(cls));
 $(el).find(".shopify-payment-button").remove();
 $(el).removeAttr("action").attr("onsubmit", "return false");
 done = true;
 });
 if (!done) { const $b = $('button:contains("Add to cart"), button:contains("Add to Cart"), [name="add"]').first(); if ($b.length) $b.replaceWith(buttons($b.attr("class") || "")); }
 return $.html();
}

export async function captureProductPage(slug: string, handle: string, origin: string, buyHref: string | null): Promise<string> {
 const cap = await captureSite(`${origin}/products/${handle}`, { rewriteLink: linkRewriteFor(slug) });
 return rewireCommerce(cap.html, buyHref);
}

// ── Injected VYA cart (drawer + script) for captured pages ───────────────────
// "Add to cart" buttons carry data-vya-add="{itemId}"; this wires them to VYA's
// cart API, shows a slide-in bag, and checks out via the multi-item Stripe flow.
const CART_UI = `
<style>
#vya-cart-btn{position:fixed;bottom:20px;right:20px;z-index:99997;background:#111;color:#fff;border:none;border-radius:30px;padding:13px 20px;font:600 12px/1 system-ui;letter-spacing:.08em;cursor:pointer;text-transform:uppercase}
#vya-cart-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:99998;display:none}
#vya-cart-drawer{position:fixed;top:0;right:-420px;width:380px;max-width:90vw;height:100%;background:#fff;color:#111;z-index:99999;transition:right .25s;display:flex;flex-direction:column;box-shadow:-4px 0 30px rgba(0,0,0,.18);font-family:system-ui}
#vya-cart-drawer.open{right:0}
#vya-cart-drawer .vya-ch{padding:18px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center}
#vya-cart-drawer .vya-items{flex:1;overflow:auto;padding:6px 18px}
#vya-cart-drawer .vya-it{display:flex;gap:12px;padding:14px 0;border-bottom:1px solid #f2f2f2;align-items:center}
#vya-cart-drawer .vya-it img{width:54px;height:70px;object-fit:cover;background:#f4f4f4}
#vya-cart-drawer .vya-cf{padding:18px;border-top:1px solid #eee}
#vya-cart-drawer .vya-co{display:block;width:100%;text-align:center;padding:15px;background:#111;color:#fff;border:none;text-transform:uppercase;letter-spacing:.1em;font-size:13px;cursor:pointer}
</style>
<button id="vya-cart-btn" onclick="VYACart.open()">Bag &middot; <span id="vya-cart-count">0</span></button>
<div id="vya-cart-overlay" onclick="VYACart.close()"></div>
<div id="vya-cart-drawer">
<div class="vya-ch"><b style="text-transform:uppercase;letter-spacing:.1em;font-size:13px">Your bag</b><span onclick="VYACart.close()" style="cursor:pointer">&times;</span></div>
<div class="vya-items" id="vya-cart-items"></div>
<div class="vya-cf"><div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:14px"><span>Subtotal</span><b id="vya-cart-sub">&mdash;</b></div><button class="vya-co" onclick="VYACart.checkout()">Checkout</button></div>
</div>
<script>
window.VYACart={
 fmt:function(c,cur){return new Intl.NumberFormat("en-US",{style:"currency",currency:cur||"USD"}).format((c||0)/100)},
 add:function(id){if(!id)return;var s=this;fetch("/api/storefront/cart",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({itemId:id})}).then(function(r){return r.json()}).then(function(d){s.paint(d);s.open()})},
 refresh:function(){var s=this;fetch("/api/storefront/cart").then(function(r){return r.json()}).then(function(d){s.paint(d)}).catch(function(){})},
 remove:function(id){var s=this;fetch("/api/storefront/cart",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({itemId:id})}).then(function(r){return r.json()}).then(function(d){s.paint(d)})},
 paint:function(d){document.getElementById("vya-cart-count").textContent=d.count||0;var box=document.getElementById("vya-cart-items");var it=d.items||[];box.innerHTML=it.length?it.map(function(i){return '<div class="vya-it"><img src="'+(i.image||"")+'"><div style="flex:1"><div style="font-size:13px">'+i.title+'</div><div style="font-size:13px;opacity:.6">'+VYACart.fmt(i.priceCents,i.currency)+'</div></div><span data-vya-remove="'+i.id+'" style="cursor:pointer;opacity:.4">&times;</span></div>'}).join(""):'<p style="opacity:.5;padding:40px 0;text-align:center">Your bag is empty</p>';document.getElementById("vya-cart-sub").textContent=VYACart.fmt(d.subtotalCents,(it[0]&&it[0].currency)||"USD");var ids={};it.forEach(function(i){ids[i.id]=1});document.querySelectorAll("[data-vya-add]").forEach(function(b){if(ids[b.getAttribute("data-vya-add")]){b.textContent="In bag ✓";b.setAttribute("data-inbag","1")}else{b.textContent="Add to cart";b.removeAttribute("data-inbag")}})},
 open:function(){document.getElementById("vya-cart-drawer").classList.add("open");document.getElementById("vya-cart-overlay").style.display="block"},
 close:function(){document.getElementById("vya-cart-drawer").classList.remove("open");document.getElementById("vya-cart-overlay").style.display="none"},
 checkout:function(){location.href="/checkout?cart=1"}
};
document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("[data-vya-add]");if(a){e.preventDefault();if(a.getAttribute("data-inbag")){VYACart.open()}else{VYACart.add(a.getAttribute("data-vya-add"))}}var r=e.target.closest&&e.target.closest("[data-vya-remove]");if(r){e.preventDefault();VYACart.remove(r.getAttribute("data-vya-remove"))}});
window.addEventListener("load",function(){VYACart.refresh();document.querySelectorAll('a[href$="/cart"],a[href*="/cart?"]').forEach(function(a){a.addEventListener("click",function(e){e.preventDefault();VYACart.open()})});document.querySelectorAll('form[action*="/cart"]').forEach(function(f){var card=f.closest('li,[class*="card"],[class*="product"],.grid__item');var link=card&&card.querySelector('a[href*="/products/"]');if(link){f.querySelectorAll('button,[name="add"]').forEach(function(b){b.addEventListener("click",function(e){e.preventDefault();location.href=link.getAttribute("href")})})}})});
</script>`;

/** Inject a store's site-wide custom CSS (seller edits applied over time) so it
 * wins over the captured theme. No-op when there's no custom CSS. */
export function injectCss(html: string, css: string): string {
 if (!css || !css.trim()) return html;
 const tag = `<style data-vya-custom="1">${css}</style>`;
 return html.indexOf("</body>") !== -1 ? html.replace("</body>", tag + "</body>") : html + tag;
}

/** Inject the VYA cart drawer + script into a captured page before serving.
 * Also strips the source CSP meta — it would block our inline cart script. */
export function injectCart(html: string): string {
 html = html.replace(/<meta[^>]*http-equiv=["']?content-security-policy["']?[^>]*>/gi, "");
 if (html.indexOf("vya-cart-drawer") !== -1) return html;
 return html.indexOf("</body>") !== -1 ? html.replace("</body>", CART_UI + "</body>") : html + CART_UI;
}

// ── Visual page editor: edit captured pages yourself (Shopify-style) ──────────
// "Editable" things are numbered in document order so the same id maps the same
// element on the client (in-iframe editing) and the server (save): text leaves,
// images, and top-level sections.
function eachEditable($: any, cb: (el: any, eid: number) => void) {
 let eid = 0;
 $("h1,h2,h3,h4,h5,h6,p,li,a,button,blockquote,figcaption,td,th,label,span").each((_: number, el: any) => {
 const $el = $(el);
 if ($el.children().length === 0 && $el.text().trim().length > 0) { cb(el, eid); eid++; }
 });
}
function eachImage($: any, cb: (el: any, id: number) => void) {
 let id = 0;
 $("img").each((_: number, el: any) => { if ($(el).attr("src")) { cb(el, id); id++; } });
}
function eachSection($: any, cb: (el: any, id: number) => void) {
 const $secs = $(".shopify-section").length ? $(".shopify-section") : $("section").filter((_: number, el: any) => $(el).parents("section").length === 0);
 $secs.each((i: number, el: any) => cb(el, i));
}

const EDITOR_JS = `(function(){var td={},dimg={},ddel={},ddup={};var style=document.createElement("style");style.textContent='[data-vya-eid]{cursor:text}[data-vya-eid]:hover{outline:1px dashed rgba(93,15,23,.55);outline-offset:2px}[data-vya-eid].vya-ed{outline:2px solid #5D0F17;background:rgba(93,15,23,.05)}[data-vya-img]{cursor:pointer}[data-vya-img]:hover{outline:2px dashed #5D0F17;outline-offset:2px}.vya-del{display:none!important}#vya-eb{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:2147483647;background:#111;color:#fff;border-radius:30px;padding:8px 10px 8px 18px;display:flex;align-items:center;gap:12px;font:13px system-ui;box-shadow:0 6px 28px rgba(0,0,0,.3)}#vya-eb button{background:#fff;color:#111;border:none;border-radius:20px;padding:8px 16px;font:600 12px system-ui;cursor:pointer}#vya-eb button:disabled{opacity:.5}#vya-sb{position:fixed;z-index:2147483647;display:none;gap:6px}#vya-sb button{background:#111;color:#fff;border:none;border-radius:6px;padding:5px 10px;font:600 11px system-ui;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25)}';document.head.appendChild(style);var bar=document.createElement("div");bar.id="vya-eb";bar.innerHTML='<span id="vya-es">Click text to edit · click an image to replace · hover a section to add/remove</span><button id="vya-save">Save changes</button>';document.body.appendChild(bar);function st(t){document.getElementById("vya-es").textContent=t}var sb=document.createElement("div");sb.id="vya-sb";sb.innerHTML='<button data-a="dup">+ Duplicate</button><button data-a="del">× Delete</button>';document.body.appendChild(sb);var curSec=null;document.addEventListener("mouseover",function(e){var s=e.target.closest&&e.target.closest("[data-vya-sec]");if(s&&!s.classList.contains("vya-del")){curSec=s;var r=s.getBoundingClientRect();sb.style.display="flex";sb.style.top=(Math.max(r.top,4)+4)+"px";sb.style.left=(r.right-148)+"px"}});sb.addEventListener("click",function(e){var a=e.target.getAttribute&&e.target.getAttribute("data-a");if(!a||!curSec)return;var id=curSec.getAttribute("data-vya-sec");if(a==="del"){curSec.classList.add("vya-del");ddel[id]=1;sb.style.display="none"}else{ddup[id]=1;var c=curSec.cloneNode(true);curSec.parentNode.insertBefore(c,curSec.nextSibling)}st("Unsaved changes")});var fi=document.createElement("input");fi.type="file";fi.accept="image/*";fi.style.display="none";document.body.appendChild(fi);var pend=null;fi.addEventListener("change",function(){var f=fi.files[0];if(!f||!pend)return;st("Uploading…");var fd=new FormData();fd.append("file",f);fetch("/api/store/assets",{method:"POST",body:fd}).then(function(r){return r.json()}).then(function(d){if(d.url){pend.setAttribute("src",d.url);pend.removeAttribute("srcset");dimg[pend.getAttribute("data-vya-img")]=d.url;st("Unsaved changes")}else st(d.error||"Upload failed");pend=null;fi.value=""}).catch(function(){st("Upload failed")})});document.addEventListener("click",function(e){var im=e.target.closest&&e.target.closest("[data-vya-img]");if(im){e.preventDefault();pend=im;fi.click();return}var ed=e.target.closest&&e.target.closest("[data-vya-eid]");if(ed){e.preventDefault();ed.setAttribute("contenteditable","true");ed.classList.add("vya-ed");ed.focus();return}var a=e.target.closest&&e.target.closest("a");if(a)e.preventDefault()});document.addEventListener("input",function(e){var ed=e.target.closest&&e.target.closest("[data-vya-eid]");if(ed){td[ed.getAttribute("data-vya-eid")]=ed.textContent;st("Unsaved changes")}});document.getElementById("vya-save").addEventListener("click",function(){var edits=Object.keys(td).map(function(k){return{eid:parseInt(k,10),text:td[k]}});var images=Object.keys(dimg).map(function(k){return{id:parseInt(k,10),src:dimg[k]}});var deleteSecs=Object.keys(ddel).map(function(k){return parseInt(k,10)});var dupSecs=Object.keys(ddup).map(function(k){return parseInt(k,10)});if(!edits.length&&!images.length&&!deleteSecs.length&&!dupSecs.length){st("No changes yet");return}var b=this;b.disabled=true;st("Saving…");fetch("/api/store/capture/edit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:window.__VYA_EDIT.path,edits:edits,images:images,deleteSecs:deleteSecs,dupSecs:dupSecs})}).then(function(r){return r.json()}).then(function(d){b.disabled=false;if(d.ok){st("Saved ✓");if(window.parent!==window)window.parent.postMessage({vya:"saved"},"*");setTimeout(function(){location.reload()},700)}else st(d.error||"Save failed")}).catch(function(){b.disabled=false;st("Save failed")})});})();`;

/** Serve a captured page in EDIT mode: tag editable text/images/sections + inject the editor. */
export function prepareEditMode(html: string, slug: string, path: string): string {
 const $ = cheerio.load(html);
 $("meta[http-equiv]").each((_: number, el: any) => { if (/content-security-policy/i.test($(el).attr("http-equiv") || "")) $(el).remove(); });
 eachEditable($, (el, eid) => $(el).attr("data-vya-eid", String(eid)));
 eachImage($, (el, id) => $(el).attr("data-vya-img", String(id)));
 eachSection($, (el, id) => $(el).attr("data-vya-sec", String(id)));
 const inject = `<script>window.__VYA_EDIT=${JSON.stringify({ slug, path })};</script><script>${EDITOR_JS}</script>`;
 const out = $.html();
 return out.indexOf("</body>") !== -1 ? out.replace("</body>", inject + "</body>") : out + inject;
}

export type PageEdits = {
 edits?: { eid: number; text: string }[];
 images?: { id: number; src: string }[];
 deleteSecs?: number[];
 dupSecs?: number[];
};

/** Apply the seller's edits (text / images / section add+remove) back into the stored HTML. */
export function applyEdits(html: string, p: PageEdits): string {
 const $ = cheerio.load(html);
 const tmap = new Map((p.edits || []).map((e) => [e.eid, e.text]));
 if (tmap.size) eachEditable($, (el, eid) => { if (tmap.has(eid)) $(el).text(tmap.get(eid) as string); });
 const imap = new Map((p.images || []).map((e) => [e.id, e.src]));
 if (imap.size) eachImage($, (el, id) => { if (imap.has(id)) $(el).attr("src", imap.get(id) as string).removeAttr("srcset"); });
 const dup = new Set(p.dupSecs || []), del = new Set(p.deleteSecs || []);
 if (dup.size || del.size) {
 const secs: any[] = [];
 eachSection($, (el) => secs.push(el));
 dup.forEach((id) => { if (secs[id]) $(secs[id]).after($.html(secs[id])); });
 del.forEach((id) => { if (secs[id]) $(secs[id]).remove(); });
 }
 return $.html();
}
